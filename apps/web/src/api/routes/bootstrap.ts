/**
 * /api/bootstrap — Single endpoint that bundles ALL storefront data.
 *
 * Returns products, categories, collections, and homepage CMS in one response.
 *
 * Cache layers, outermost first:
 *   1. Cloudflare edge cache, keyed by catalog version — an admin edit changes
 *      the version, so the next request misses instead of serving 5-minute-old data.
 *   2. Shared catalog cache (memory + Redis, see lib/catalog.ts).
 *   3. Appwrite — only on a catalog cache miss. If Appwrite is down or paused,
 *      the last good catalog is served instead of an empty store.
 */
import { Hono } from 'hono';
import { getAllProducts, getAllCategories, getAllCollections, getHomepageConfig, isProductVisible, invalidateCatalog } from '../lib/catalog';
import { getNamespaceVersion } from '../lib/cache';
import { getAdminFromRequest } from '../middleware/auth';
import { runInBackground } from '../lib/utils';

const bootstrap = new Hono();

const CACHE_HEADER = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

bootstrap.get('/', async (c) => {
  try {
    // Forcing a database refresh is an admin-only action; anonymous visitors
    // must not be able to bypass every cache layer.
    const refresh = c.req.query('refresh') === 'true' && (await getAdminFromRequest(c)) !== null;
    if (refresh) await invalidateCatalog();

    const version = await getNamespaceVersion('catalog');
    const cacheUrl = new URL(c.req.url);
    cacheUrl.search = `?v=${version}`;
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });

    let cfCache: Cache | undefined;
    try {
      if (typeof caches !== 'undefined' && (caches as unknown as Record<string, Cache>).default) {
        cfCache = (caches as unknown as Record<string, Cache>).default;
        if (!refresh) {
          const edgeCached = await cfCache.match(cacheKey);
          if (edgeCached) {
            const edgeClone = new Response(edgeCached.body, edgeCached);
            edgeClone.headers.set('X-Cache', 'CF-EDGE-HIT');
            return edgeClone;
          }
        }
      }
    } catch {}

    // Products are required; the rest degrade gracefully so a single failing
    // collection doesn't blank the whole storefront.
    let degraded = false;
    const soft = <T,>(promise: Promise<T>, fallback: T, label: string): Promise<T> =>
      promise.catch((e) => {
        degraded = true;
        console.log(`Bootstrap: ${label} unavailable —`, (e as Error).message);
        return fallback;
      });

    const [products, categories, collections, homepage] = await Promise.all([
      getAllProducts(),
      soft(getAllCategories(), [], 'categories'),
      soft(getAllCollections(), [], 'collections'),
      soft(getHomepageConfig(), null, 'homepage'),
    ]);

    const payload = {
      products: products.filter(isProductVisible),
      categories,
      collections,
      homepage,
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
      cachedAt: new Date().toISOString(),
    };

    const response = new Response(JSON.stringify({ success: true, data: payload }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Cache': degraded ? 'DEGRADED' : 'MISS',
        'Cache-Control': degraded ? 'no-store' : CACHE_HEADER,
        'X-Build-Id': process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
      },
    });

    // Never pin a partial payload at the edge.
    if (cfCache && !degraded) {
      runInBackground(cfCache.put(cacheKey, response.clone()), 'Bootstrap edge cache');
    }

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 503);
  }
});

export default bootstrap;
