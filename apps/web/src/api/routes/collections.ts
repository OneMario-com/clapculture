import { Hono } from 'hono';
import { ID } from 'node-appwrite';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv, pickFields } from '../lib/utils';
import { adminAuth } from '../middleware/auth';
import { getAllCollections, getAllProducts, isProductVisible, invalidateCatalog } from '../lib/catalog';

const collections = new Hono();

// Attributes of the live `collections` collection.
const COLLECTION_FIELDS = ['name', 'slug', 'description', 'image', 'productIds'] as const;

const PUBLIC_CACHE_HEADER = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

collections.get('/', async (c) => {
  try {
    const documents = await getAllCollections();
    c.header('Cache-Control', PUBLIC_CACHE_HEADER);
    return c.json({ success: true, data: documents });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

collections.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug') || '';
    const [allCollections, allProducts] = await Promise.all([getAllCollections(), getAllProducts()]);

    const collection = allCollections.find((col) => col.slug === slug);
    if (!collection) {
      return c.json({ success: false, error: 'Collection not found' }, 404);
    }

    const pIds = Array.isArray(collection.productIds) ? (collection.productIds as string[]) : [];
    const collectionData: Record<string, unknown> = {
      ...collection,
      products: allProducts.filter((p) => pIds.includes(p.$id) && isProductVisible(p)),
    };

    c.header('Cache-Control', PUBLIC_CACHE_HEADER);
    return c.json({ success: true, data: collectionData });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

collections.post('/', adminAuth, async (c) => {
  try {
    const body = pickFields(await c.req.json(), COLLECTION_FIELDS);
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const response = await databases.createDocument(
      dbId,
      'collections',
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

collections.put('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const body = pickFields(await c.req.json(), COLLECTION_FIELDS);
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const response = await databases.updateDocument(
      dbId,
      'collections',
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

collections.delete('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    await databases.deleteDocument(
      dbId,
      'collections',
      id
    );

    await invalidateCatalog();
    return c.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default collections;
