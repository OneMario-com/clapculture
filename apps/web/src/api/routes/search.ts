import { Hono } from 'hono';
import { getAllProducts, isProductVisible } from '../lib/catalog';

const search = new Hono();

search.get('/', async (c) => {
  try {
    const q = (c.req.query('q') || '').trim().toLowerCase();
    if (!q) {
      return c.json({ success: true, data: [] });
    }

    // Served from the cached catalog: searching never costs a database read.
    const results = (await getAllProducts())
      .filter((p) => isProductVisible(p) && String(p.name || '').toLowerCase().includes(q))
      .slice(0, 20);

    return c.json({ success: true, data: results });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default search;
