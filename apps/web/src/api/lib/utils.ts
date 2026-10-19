import { Context } from 'hono';
import { AppwriteEnv } from './appwrite';

export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-+/g, '-');
};

export const isValidEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const getDbId = (c: Context): string => {
  const env = (c.env || {}) as Record<string, string | undefined>;
  return env.APPWRITE_DATABASE_ID || process.env.APPWRITE_DATABASE_ID || 'clapculture_db';
};

export const getEnv = (c: Context): AppwriteEnv => {
  return c.env && Object.keys(c.env).length > 0 ? (c.env as AppwriteEnv) : (process.env as AppwriteEnv);
};

/**
 * Keep only a collection's real attributes from a request body. Appwrite
 * rejects the whole write if it contains an unknown attribute (or a system
 * field like $id), so stray fields sent by a form would silently break saves.
 */
export const pickFields = (body: unknown, fields: readonly string[]): Record<string, unknown> => {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const field of fields) {
    if (source[field] !== undefined) picked[field] = source[field];
  }
  return picked;
};

/** Drop Appwrite system fields ($id, $createdAt, …) from a request body. */
export const withoutSystemFields = (body: unknown): Record<string, unknown> => {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(source).filter(([key]) => !key.startsWith('$')));
};

export const getClientIp = (c: Context): string => {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
};

// Where the OpenNext Cloudflare adapter exposes the current request's context
// (the same lookup its getCloudflareContext() helper performs).
const CLOUDFLARE_REQUEST_CONTEXT = Symbol.for('__cloudflare-context__');

/**
 * Keep background work (emails, customer sync) alive after the response is sent.
 * On Cloudflare a promise that is not registered with waitUntil can be cut off
 * as soon as the response returns; in `next dev` there is no request context,
 * so the promise simply runs on.
 */
export const runInBackground = (task: Promise<unknown>, label = 'Background task'): void => {
  const guarded = task.catch((e) => console.log(`${label} notice:`, (e as Error)?.message || e));
  const context = (globalThis as Record<symbol, { ctx?: { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[
    CLOUDFLARE_REQUEST_CONTEXT
  ];
  context?.ctx?.waitUntil?.(guarded);
};

/** Escape user-supplied text before inserting it into an HTML email. */
export const escapeHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};
