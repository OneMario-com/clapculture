import { Hono } from 'hono';
import { ID } from 'node-appwrite';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv } from '../lib/utils';
import { adminAuth } from '../middleware/auth';
import { getAllCategories, invalidateCatalog } from '../lib/catalog';

const categories = new Hono();

categories.get('/', async (c) => {
  try {
    const documents = await getAllCategories();
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json({ success: true, data: documents });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

categories.post('/', adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const response = await databases.createDocument(
      dbId,
      'categories',
      ID.unique(),
      body
    );

    await invalidateCatalog();
    return c.json({ success: true, data: response }, 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

categories.put('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const body = await c.req.json();
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const response = await databases.updateDocument(
      dbId,
      'categories',
      id,
      body
    );

    await invalidateCatalog();
    return c.json({ success: true, data: response });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

categories.delete('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    await databases.deleteDocument(
      dbId,
      'categories',
      id
    );

    await invalidateCatalog();
    return c.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default categories;
