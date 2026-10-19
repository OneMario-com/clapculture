import { redis, redisPipeline } from './redis';

export const OTP_PURPOSES = ['LOGIN', 'CHECKOUT', 'ORDER_TRACKING', 'ADMIN_2FA', 'PASSWORD_RESET', 'VERIFICATION'] as const;

export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export function isOtpPurpose(value: unknown): value is OtpPurpose {
  return typeof value === 'string' && (OTP_PURPOSES as readonly string[]).includes(value);
}

export interface OtpRecord {
  code: string;
  purpose: OtpPurpose;
  expiresAt: number;
  attempts: number;
  createdAt: number;
}

const MAX_ATTEMPTS = 5;
// Attempt counters are refreshed to this TTL on each verify; it only needs to
// outlive the longest OTP expiry in use (password reset: 15 minutes).
const ATTEMPTS_TTL_SECONDS = 30 * 60;

/**
 * OTPs live in Redis (`cc:otp:<email>:<purpose>`) so a code stored by one edge
 * isolate can be verified by another. The attempt counter is a separate key so
 * it can be incremented atomically. When Redis is not configured or is down,
 * this per-isolate Map is the fallback.
 */
const otpStore = new Map<string, OtpRecord>();

const otpKey = (email: string, purpose: OtpPurpose) => `cc:otp:${email.toLowerCase().trim()}:${purpose}`;
const attemptsKey = (key: string) => `${key}:attempts`;

/**
 * Generate a cryptographically secure 6-digit numeric OTP (Web Crypto, works on the edge runtime)
 */
export function generateOtp(): string {
  const range = 900000;
  // Rejection sampling keeps every code equally likely.
  const limit = Math.floor(0x100000000 / range) * range;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
  } while (buf[0] >= limit);
  return String(100000 + (buf[0] % range));
}

/**
 * Store an OTP with an expiration time (default: 10 minutes)
 */
export async function storeOtp(
  email: string,
  purpose: OtpPurpose,
  code: string,
  expiryMinutes = 10
): Promise<OtpRecord> {
  const key = otpKey(email, purpose);
  const ttlSeconds = expiryMinutes * 60;
  const record: OtpRecord = {
    code,
    purpose,
    expiresAt: Date.now() + ttlSeconds * 1000,
    attempts: 0,
    createdAt: Date.now(),
  };

  const results = await redisPipeline([
    ['SET', key, JSON.stringify(record), 'EX', ttlSeconds],
    ['SET', attemptsKey(key), 0, 'EX', ttlSeconds],
  ]);

  if (results && results[0] === 'OK') {
    otpStore.delete(key);
  } else {
    cleanupExpiredOtps();
    otpStore.set(key, record);
  }
  return record;
}

/**
 * Verify an entered OTP against the store
 */
export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  enteredCode: string
): Promise<{ valid: boolean; reason?: string }> {
  const key = otpKey(email, purpose);

  const results = await redisPipeline([
    ['GET', key],
    ['INCR', attemptsKey(key)],
    ['EXPIRE', attemptsKey(key), ATTEMPTS_TTL_SECONDS],
  ]);

  const [raw, attempts] = results || [];
  let record: OtpRecord | null = null;
  try {
    record = typeof raw === 'string' ? (JSON.parse(raw) as OtpRecord) : null;
  } catch {
    record = null;
  }

  // Redis unavailable, or the OTP was stored in this isolate's memory while it was.
  if (!record) {
    return verifyInMemory(key, enteredCode);
  }

  if (Date.now() > record.expiresAt) {
    await redis(['DEL', key, attemptsKey(key)]);
    return { valid: false, reason: 'OTP has expired. Please request a new OTP.' };
  }

  if (typeof attempts !== 'number' || attempts > MAX_ATTEMPTS) {
    await redis(['DEL', key, attemptsKey(key)]);
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  if (record.code !== enteredCode.trim()) {
    return {
      valid: false,
      reason: `Incorrect OTP. ${MAX_ATTEMPTS - attempts} attempts remaining.`,
    };
  }

  // OTP is valid - consume it immediately. If a concurrent request already
  // consumed it, DEL reports 0 and this one is rejected.
  const consumed = await redisPipeline([
    ['DEL', key],
    ['DEL', attemptsKey(key)],
  ]);
  if (consumed && consumed[0] === 0) {
    return { valid: false, reason: 'No active OTP found. Please request a new OTP.' };
  }
  return { valid: true };
}

function verifyInMemory(key: string, enteredCode: string): { valid: boolean; reason?: string } {
  const record = otpStore.get(key);

  if (!record) {
    return { valid: false, reason: 'No active OTP found. Please request a new OTP.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(key);
    return { valid: false, reason: 'OTP has expired. Please request a new OTP.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { valid: false, reason: 'Too many incorrect attempts. Please request a new OTP.' };
  }

  record.attempts += 1;

  if (record.code !== enteredCode.trim()) {
    return {
      valid: false,
      reason: `Incorrect OTP. ${MAX_ATTEMPTS - record.attempts} attempts remaining.`,
    };
  }

  // OTP is valid - consume it immediately
  otpStore.delete(key);
  return { valid: true };
}

/**
 * Clear expired in-memory OTP records to prevent memory leak
 */
export function cleanupExpiredOtps(): void {
  const now = Date.now();
  for (const [key, record] of otpStore.entries()) {
    if (now > record.expiresAt) {
      otpStore.delete(key);
    }
  }
}
