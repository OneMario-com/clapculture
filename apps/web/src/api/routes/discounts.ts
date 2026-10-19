import { Hono } from 'hono';
import { ID, Query } from 'node-appwrite';
import { calculateDiscount } from '@clapculture/shared';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv, getClientIp } from '../lib/utils';
import { adminAuth } from '../middleware/auth';
import { invalidate } from '../lib/cache';
import { isRateLimited } from '../lib/redis';
import {
  getDiscountByCode,
  discountUnavailableReason,
  pickDiscountFields,
  toDiscountRule,
} from '../lib/discounts';

const discounts = new Hono();

// Checkout: check a code and return only what the customer needs to see.
discounts.post('/validate', async (c) => {
  try {
    // Limits code guessing.
    if (await isRateLimited(`discount-check:${getClientIp(c)}`, 20, 10 * 60)) {
      return c.json({ success: false, error: 'Too many attempts. Please wait a few minutes.' }, 429);
    }

    const { code, subtotal, shipping } = await c.req.json().catch(() => ({}));
    const discount = await getDiscountByCode(String(code || ''));
    const unavailable = discountUnavailableReason(discount);
    if (unavailable || !discount) {
      return c.json({ success: false, error: unavailable || 'Invalid discount code' }, unavailable === 'Invalid discount code' ? 404 : 400);
    }

    const rule = toDiscountRule(discount);
    if (subtotal !== undefined) {
      const result = calculateDiscount(rule, Number(subtotal) || 0, Number(shipping) || 0);
      if (!result.eligible) {
        return c.json({ success: false, error: result.reason || 'This code cannot be used for this order.' }, 400);
      }
    }

    return c.json({ success: true, data: rule });
  } catch (error: unknown) {
    console.error('Discount validation failed:', error);
    return c.json({ success: false, error: 'Could not check this code right now. Please try again.' }, 503);
  }
});

discounts.get('/', adminAuth, async (c) => {
  try {
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const response = await databases.listDocuments(
      dbId,
      'discounts',
      [Query.limit(100)]
    );

    c.header('Cache-Control', 'private, no-store');
    return c.json({ success: true, data: response.documents });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

discounts.post('/', adminAuth, async (c) => {
  try {
    const data = pickDiscountFields(await c.req.json());
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    if (!data.code || !data.type) {
      return c.json({ success: false, error: 'Code and type are required' }, 400);
    }

    const response = await databases.createDocument(
      dbId,
      'discounts',
      ID.unique(),
      { active: true, ...data, usageCount: 0 }
    );

    await invalidate('discounts');
    return c.json({ success: true, data: response }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

discounts.put('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const data = pickDiscountFields(await c.req.json());
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const response = await databases.updateDocument(
      dbId,
      'discounts',
      id,
      data
    );

    await invalidate('discounts');
    return c.json({ success: true, data: response });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

discounts.delete('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    await databases.deleteDocument(
      dbId,
      'discounts',
      id
    );

    await invalidate('discounts');
    return c.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default discounts;
