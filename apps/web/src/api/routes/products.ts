import { Hono, Context } from 'hono';
import { ID } from 'node-appwrite';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv } from '../lib/utils';
import { adminAuth, getAdminFromRequest } from '../middleware/auth';
import { getAllProducts, findProduct, isProductVisible, invalidateCatalog } from '../lib/catalog';

const products = new Hono();

const PUBLIC_CACHE_HEADER = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

// Hidden products are only returned to a verified admin; anyone else asking
// with includeHidden=true just gets the public view.
async function wantsHidden(c: Context): Promise<boolean> {
  if (c.req.query('includeHidden') !== 'true') return false;
  return (await getAdminFromRequest(c)) !== null;
}

products.get('/', async (c) => {
  try {
    const category = c.req.query('category') || '';
    const search = (c.req.query('search') || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '100', 10) || 100, 1), 500);
    const includeHidden = await wantsHidden(c);

    let documents = await getAllProducts();
    if (!includeHidden) documents = documents.filter(isProductVisible);
    if (category) documents = documents.filter((p) => p.categoryId === category || p.category === category);
    if (search) documents = documents.filter((p) => String(p.name || '').toLowerCase().includes(search));

    c.header('Cache-Control', includeHidden ? 'private, no-store' : PUBLIC_CACHE_HEADER);
    return c.json({ success: true, data: documents.slice(0, limit) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

// Check slug availability (admin product editor)
products.get('/check/slug', adminAuth, async (c) => {
  try {
    const slug = (c.req.query('slug') || '').trim().toLowerCase();
    const excludeId = (c.req.query('excludeId') || '').trim();

    if (!slug) {
      return c.json({ success: true, available: false, message: 'Slug is required' });
    }

    const all = await getAllProducts();
    const matching = all.filter((d) => d.slug === slug && d.$id !== excludeId && d.id !== excludeId);
    const available = matching.length === 0;

    return c.json({
      success: true,
      available,
      existingProduct: available ? null : { name: matching[0].name, id: matching[0].$id, slug: matching[0].slug },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

products.get('/:slug', async (c) => {
  try {
    const slugOrId = c.req.param('slug') || '';
    const includeHidden = await wantsHidden(c);

    const productDoc = await findProduct(slugOrId, { includeHidden });
    if (!productDoc) {
      return c.json({ success: false, error: 'Product not found' }, 404);
    }

    c.header('Cache-Control', includeHidden ? 'private, no-store' : PUBLIC_CACHE_HEADER);
    return c.json({ success: true, data: productDoc });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

products.post('/', adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    body.createdAt = new Date().toISOString();
    if (body.isActive === undefined) {
      body.isActive = true;
    }

    const response = await databases.createDocument(
      dbId,
      'products',
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

products.put('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const body = await c.req.json();
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const response = await databases.updateDocument(
      dbId,
      'products',
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

products.delete('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    await databases.deleteDocument(
      dbId,
      'products',
      id
    );

    await invalidateCatalog();
    return c.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default products;
