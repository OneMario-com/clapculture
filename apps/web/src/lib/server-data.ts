/**
 * Server-side Direct Database Data Fetchers
 * Used by Server Components (e.g. product/[slug], collections/[slug], category/[slug]).
 *
 * Everything is resolved from the shared catalog cache (memory + Redis, see
 * api/lib/catalog.ts), so rendering a page — including generateMetadata and the
 * page itself, or an unknown slug — costs no extra Appwrite reads, and admin
 * edits invalidate these pages together with the API.
 */
import { Product, Collection, Category } from '@clapculture/shared';
import {
  getAllProducts,
  getAllCollections,
  getAllCategories,
  isProductVisible as isCatalogProductVisible,
  CatalogDoc,
} from '@/api/lib/catalog';

export function isProductVisible(product: Product | Record<string, unknown> | null | undefined): boolean {
  return isCatalogProductVisible(product as Record<string, unknown> | null | undefined);
}

function withId<T>(doc: CatalogDoc): T {
  return { ...doc, id: doc.$id || doc.id } as unknown as T;
}

export async function getServerProducts(limit = 100): Promise<Product[]> {
  try {
    const all = await getAllProducts();
    return all.filter(isCatalogProductVisible).slice(0, limit).map((d) => withId<Product>(d));
  } catch (e) {
    console.log('getServerProducts error:', (e as Error).message);
    return [];
  }
}

export async function getServerProductBySlug(slugOrId: string): Promise<Product | null> {
  try {
    const all = await getAllProducts();
    const doc = all.find((p) => p.slug === slugOrId || p.$id === slugOrId || p.id === slugOrId);
    if (!doc || !isCatalogProductVisible(doc)) return null;
    return withId<Product>(doc);
  } catch (e) {
    console.log('getServerProductBySlug error:', (e as Error).message);
    return null;
  }
}

export async function getServerCollections(): Promise<Collection[]> {
  try {
    return (await getAllCollections()).map((d) => withId<Collection>(d));
  } catch (e) {
    console.log('getServerCollections error:', (e as Error).message);
    return [];
  }
}

export async function getServerCollectionBySlug(slug: string): Promise<Collection | null> {
  try {
    const doc = (await getAllCollections()).find((c) => c.slug === slug);
    return doc ? withId<Collection>(doc) : null;
  } catch (e) {
    console.log('getServerCollectionBySlug error:', (e as Error).message);
    return null;
  }
}

export async function getServerCategories(): Promise<Category[]> {
  try {
    return (await getAllCategories()).map((d) => withId<Category>(d));
  } catch (e) {
    console.log('getServerCategories error:', (e as Error).message);
    return [];
  }
}
