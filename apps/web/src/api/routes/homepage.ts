import { Hono } from 'hono';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv } from '../lib/utils';
import { adminAuth } from '../middleware/auth';
import { getHomepageConfig, invalidateCatalog } from '../lib/catalog';

const homepage = new Hono();

// GET /api/homepage - Fetch homepage configuration
homepage.get('/', async (c) => {
  try {
    const data = await getHomepageConfig();
    c.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=600');
    return c.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

// PUT /api/homepage - Save full homepage configuration (Admin)
homepage.put('/', adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const contentString = JSON.stringify(body);
    const configDoc = {
      type: 'homepage_config',
      title: 'Homepage Configuration',
      content: contentString,
      order: 0,
    };

    let result;
    try {
      result = await databases.updateDocument(dbId, 'homepage_sections', 'homepage_config', configDoc);
    } catch (e) {
      // Only create when the document genuinely doesn't exist yet; any other
      // failure (e.g. database unavailable) must surface as an error.
      if ((e as { code?: number }).code !== 404) throw e;
      result = await databases.createDocument(dbId, 'homepage_sections', 'homepage_config', configDoc);
    }

    await invalidateCatalog();
    return c.json({ success: true, data: result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default homepage;
