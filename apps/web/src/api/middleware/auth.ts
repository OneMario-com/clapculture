import { Context, Next } from 'hono';
import { verifyAdminToken } from '../lib/jwt';

/**
 * Returns the verified admin payload for this request, or null.
 */
export async function getAdminFromRequest(c: Context) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return verifyAdminToken(authHeader.slice('Bearer '.length).trim());
}

export const adminAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized: Admin session token required' }, 401);
  }

  const payload = await getAdminFromRequest(c);

  if (!payload) {
    return c.json({ success: false, error: 'Unauthorized: Session invalid or expired' }, 401);
  }

  // Attach validated admin payload to context
  c.set('admin' as never, payload);

  await next();
};
