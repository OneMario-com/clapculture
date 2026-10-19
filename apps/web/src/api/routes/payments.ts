import { Hono } from 'hono';
import { getEnv, getClientIp } from '../lib/utils';
import { uploadFile, getFileUrl } from '../lib/storage';
import { isRateLimited } from '../lib/redis';

const payments = new Hono();

const MAX_PROOF_BYTES = 8 * 1024 * 1024;

// Public payment proof upload endpoint (used by customers during checkout).
// Payment submission and verification go through /api/orders (verification is admin-only).
payments.post('/upload-proof', async (c) => {
  try {
    if (await isRateLimited(`proof-upload:${getClientIp(c)}`, 15, 60 * 60)) {
      return c.json({ success: false, error: 'Too many uploads. Please wait a while and try again.' }, 429);
    }

    const body = await c.req.parseBody();
    const file = body['file'];

    if (!(file instanceof File)) {
      return c.json({ success: false, error: 'No screenshot file provided' }, 400);
    }
    if (!file.type.startsWith('image/')) {
      return c.json({ success: false, error: 'Please upload an image (PNG, JPG or WebP) of your payment confirmation.' }, 400);
    }
    if (file.size > MAX_PROOF_BYTES) {
      return c.json({ success: false, error: 'Screenshot is too large (max 8 MB).' }, 413);
    }

    const env = getEnv(c);
    const BUCKET_ID = 'media';
    const uploaded = await uploadFile(env, BUCKET_ID, file);
    const url = getFileUrl(env, BUCKET_ID, uploaded.$id);

    return c.json({
      success: true,
      data: {
        fileId: uploaded.$id,
        url,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Screenshot upload failed';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default payments;
