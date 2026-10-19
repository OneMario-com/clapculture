/**
 * Cached catalog reads shared by every storefront and admin read path
 * (bootstrap, /api/products, /api/categories, /api/collections, /api/search,
 * /api/homepage and the server-rendered product/collection/category pages).
 *
 * Each collection is read from Appwrite once per cache TTL in total — not once
 * per endpoint, per page or per isolate — and every catalog write clears all
 * of them with a single invalidateCatalog() call.
 */
import { Query, Models } from 'node-appwrite';
import { getAppwriteClient } from './appwrite';
import { cached, invalidate } from './cache';

export type CatalogDoc = Models.Document & Record<string, unknown>;

export const CATALOG_TTL_SECONDS = 300;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

const getDbId = () => process.env.APPWRITE_DATABASE_ID || 'clapculture_db';

async function listAll(collectionId: string): Promise<CatalogDoc[]> {
  const { databases } = getAppwriteClient();
  const docs: CatalogDoc[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const queries = [Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await databases.listDocuments(getDbId(), collectionId, queries);
    docs.push(...(res.documents as CatalogDoc[]));
    if (res.documents.length < PAGE_SIZE) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }

  return docs;
}

export function isProductVisible(product: Record<string, unknown> | null | undefined): boolean {
  if (!product) return false;
  if (product.isActive === false) return false;
  if (Array.isArray(product.badges)) {
    if (product.badges.includes('HIDDEN') || product.badges.includes('DISABLED')) return false;
  }
  return true;
}

/** All products, including hidden/disabled ones. Filter with isProductVisible for shoppers. */
export function getAllProducts(): Promise<CatalogDoc[]> {
  return cached('catalog', 'products', CATALOG_TTL_SECONDS, () => listAll('products'));
}

export function getAllCategories(): Promise<CatalogDoc[]> {
  return cached('catalog', 'categories', CATALOG_TTL_SECONDS, () => listAll('categories'));
}

export function getAllCollections(): Promise<CatalogDoc[]> {
  return cached('catalog', 'collections', CATALOG_TTL_SECONDS, () => listAll('collections'));
}

export function getHomepageConfig(): Promise<Record<string, unknown> | null> {
  return cached('catalog', 'homepage', CATALOG_TTL_SECONDS, async () => {
    const { databases } = getAppwriteClient();
    try {
      const doc = await databases.getDocument(getDbId(), 'homepage_sections', 'homepage_config');
      if (!doc.content) return null;
      return typeof doc.content === 'string' ? JSON.parse(doc.content) : doc.content;
    } catch (e) {
      // A missing config is a valid (cacheable) answer; anything else is an outage.
      if ((e as { code?: number }).code === 404) return null;
      throw e;
    }
  });
}

export async function findProduct(
  slugOrId: string,
  { includeHidden = false }: { includeHidden?: boolean } = {}
): Promise<CatalogDoc | null> {
  const products = await getAllProducts();
  const product = products.find((p) => p.slug === slugOrId || p.$id === slugOrId) || null;
  if (!product) return null;
  if (!includeHidden && !isProductVisible(product)) return null;
  return product;
}

export function invalidateCatalog(): Promise<void> {
  return invalidate('catalog');
}
