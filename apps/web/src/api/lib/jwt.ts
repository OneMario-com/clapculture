/**
 * Admin session tokens: standard HS256 JWTs signed with Web Crypto HMAC-SHA256
 * (available in both the edge runtime and Node).
 */
interface AdminPayload {
  id: string;
  username: string;
  role: string;
  iat: number;
  exp: number;
}

const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;

// Values that have been committed to this repository (or shipped in
// .env.example) are public, so tokens signed with them could be forged.
const PUBLIC_SECRETS = new Set([
  'super_secret_jwt_key_clapculture_2026',
  'your_jwt_secret_key_here',
]);

const encoder = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function getSecret(): string | null {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || PUBLIC_SECRETS.has(secret)) return null;
  return secret;
}

/** False when JWT_SECRET is missing, too short, or a publicly known value. */
export function isJwtConfigured(): boolean {
  return getSecret() !== null;
}

function getKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
    keyCache.set(secret, key);
  }
  return key;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function encodeJson(value: unknown): string {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

/**
 * Sign an admin JWT session token valid for 24 hours.
 */
export async function signAdminToken(payload: { id: string; username: string; role: string }): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error('JWT_SECRET is not configured');

  const iat = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const body = encodeJson({ ...payload, iat, exp: iat + TOKEN_LIFETIME_SECONDS });
  const signature = await crypto.subtle.sign('HMAC', await getKey(secret), encoder.encode(`${header}.${body}`));

  return `${header}.${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

/**
 * Verify and decode an admin JWT session token.
 */
export async function verifyAdminToken(token: string): Promise<AdminPayload | null> {
  try {
    const secret = getSecret();
    if (!secret) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(secret),
      base64UrlToBytes(signature),
      encoder.encode(`${header}.${body}`)
    );
    if (!valid) return null;

    const decodedPayload: AdminPayload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    if (decodedPayload.role !== 'admin') return null;
    if (!decodedPayload.exp || Math.floor(Date.now() / 1000) > decodedPayload.exp) return null;

    return decodedPayload;
  } catch {
    return null;
  }
}

/**
 * Constant-time string comparison (compares SHA-256 digests so the time taken
 * does not depend on where the inputs first differ, or on their lengths).
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);
  const x = new Uint8Array(da);
  const y = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
