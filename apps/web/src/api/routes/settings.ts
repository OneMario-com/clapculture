import { Hono } from 'hono';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv } from '../lib/utils';
import { adminAuth } from '../middleware/auth';
import { cached, invalidate } from '../lib/cache';
import { Query } from 'node-appwrite';

const settings = new Hono();

const DEFAULT_SETTINGS = {
  storeName: 'CLAPCULTURE',
  currency: 'INR',
  freeShippingThreshold: 999,
  shippingFee: 49,
};

settings.get('/', async (c) => {
  try {
    const env = getEnv(c);
    const dbId = getDbId(c);

    const data = await cached('settings', 'store', 600, async () => {
      const { databases } = getAppwriteClient(env);
      const response = await databases.listDocuments(dbId, 'settings', [Query.limit(1)]);
      return response.documents[0] || DEFAULT_SETTINGS;
    });

    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

settings.put('/', adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const existing = await databases.listDocuments(
      dbId,
      'settings',
      [Query.limit(1)]
    );

    let response;
    if (existing.documents.length > 0) {
      response = await databases.updateDocument(
        dbId,
        'settings',
        existing.documents[0].$id,
        body
      );
    } else {
      response = await databases.createDocument(
        dbId,
        'settings',
        'default',
        body
      );
    }

    await invalidate('settings');
    return c.json({ success: true, data: response });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default settings;
