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

export const getClientIp = (c: Context): string => {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
};

// Where @cloudflare/next-on-pages exposes the current request's context
// (the same lookup its getRequestContext() helper performs).
const CLOUDFLARE_REQUEST_CONTEXT = Symbol.for('__cloudflare-request-context__');

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
