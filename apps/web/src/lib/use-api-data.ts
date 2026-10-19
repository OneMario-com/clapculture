/**
 * useApiData — Bootstrap-powered data hooks for the storefront.
 * 
 * Instead of 4 separate API calls per page load, everything comes from
 * a single /api/bootstrap call. Data is cached in localStorage with a
 * build-hash stamp so deploys automatically bust stale mobile caches.
 * 
 * For 2M monthly visitors on Appwrite free tier:
 *   - Server cache (10 min) → ~576 Appwrite reads/day
 *   - CDN cache (Cloudflare) → most requests never hit the API
 *   - localStorage (30 min + build hash) → repeat visitors hit zero APIs
 */
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Product, Collection, Category } from '@clapculture/shared';

// ─── Build-version cache busting ─────────────────────────────────────
const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
const STORAGE_KEY = `cc_bootstrap_v4`;
const RETRY_AT_KEY = `${STORAGE_KEY}_retry_at`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes client-side
const FAILURE_BACKOFF = 60 * 1000; // after a failed refresh, don't retry for 1 minute

interface BootstrapData {
  products: Product[];
  categories: Category[];
  collections: Collection[];
  homepage: Record<string, unknown> | null;
  buildId: string;
  cachedAt: string;
}

interface CachedBootstrap {
  data: BootstrapData;
  storedAt: number;
  buildId: string;
}

// ─── Module-level singleton ──────────────────────────────────────────
// This ensures all hooks share the same data and only one fetch happens.
let bootstrapPromise: Promise<BootstrapData | null> | null = null;
let bootstrapData: BootstrapData | null = null;
let bootstrapListeners: Array<() => void> = [];
// When the in-memory data was fetched, for staleness checks without re-reading localStorage.
let bootstrapStoredAt = 0;
// At most one background revalidation per page load.
let backgroundRevalidateStarted = false;
// Last failed fetch in this page load; stops remounts re-hitting the API when there is no data at all.
let lastFailureAt = 0;

function notifyListeners() {
  bootstrapListeners.forEach(fn => fn());
}

export function subscribeToBootstrap(listener: () => void) {
  bootstrapListeners.push(listener);
  return () => {
    bootstrapListeners = bootstrapListeners.filter(fn => fn !== listener);
  };
}

/** Read the localStorage entry for the current build. Side-effect free. */
function readLocalCacheEntry(): CachedBootstrap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const cached: CachedBootstrap = JSON.parse(raw);
    // Build mismatch → stale from a previous deploy (overwritten on the next successful fetch).
    // Entries saved during an outage by older builds are ignored too.
    if (cached.buildId !== BUILD_ID || looksLikeFailure(cached.data)) return null;
    return cached;
  } catch {
    return null;
  }
}

function getLocalCache(): BootstrapData | null {
  return readLocalCacheEntry()?.data ?? null;
}

function setLocalCache(data: BootstrapData): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CachedBootstrap = {
      data,
      storedAt: Date.now(),
      buildId: BUILD_ID,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — that's fine, we still have in-memory
  }
}

// The failure backoff is persisted so full page reloads honour it too.
function getRetryAt(): number {
  try {
    return Number(localStorage.getItem(RETRY_AT_KEY)) || 0;
  } catch {
    return 0;
  }
}

function setRetryAt(timestamp: number): void {
  try {
    localStorage.setItem(RETRY_AT_KEY, String(timestamp));
  } catch {
    // Unavailable storage just means no cross-reload backoff.
  }
}

/**
 * An outage (e.g. a paused database) can surface as `success: true` with every
 * list empty. Such a response must never replace good data or be cached.
 */
function looksLikeFailure(data: BootstrapData | null | undefined): boolean {
  if (!data) return true;
  const isEmpty = (list: unknown) => !Array.isArray(list) || list.length === 0;
  return isEmpty(data.products) && isEmpty(data.categories) && isEmpty(data.collections);
}

async function fetchBootstrap(): Promise<BootstrapData | null> {
  try {
    const res = await fetch('/api/bootstrap');
    if (!res.ok) throw new Error(`Bootstrap API ${res.status}`);
    const json = await res.json();
    if (json.success && !looksLikeFailure(json.data)) {
      return json.data as BootstrapData;
    }
    return null;
  } catch (err) {
    console.error('Bootstrap fetch failed:', err);
    return null;
  }
}

/** Fetch fresh data (deduplicated). Resolves to the best data available, even when the fetch fails. */
function refreshBootstrap(): Promise<BootstrapData | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = fetchBootstrap().then(data => {
      bootstrapPromise = null;
      if (!data) {
        lastFailureAt = Date.now();
        setRetryAt(lastFailureAt + FAILURE_BACKOFF);
        return bootstrapData;
      }
      bootstrapData = data;
      bootstrapStoredAt = Date.now();
      setLocalCache(data);
      notifyListeners();
      return data;
    });
  }
  return bootstrapPromise;
}

function maybeRevalidateInBackground() {
  if (backgroundRevalidateStarted || bootstrapPromise) return;
  if (Date.now() - bootstrapStoredAt <= CACHE_TTL) return;
  if (Date.now() < getRetryAt()) return;
  backgroundRevalidateStarted = true;
  setTimeout(() => {
    void refreshBootstrap();
  }, 100);
}

function ensureBootstrap(): Promise<BootstrapData | null> {
  if (!bootstrapData) {
    const cached = readLocalCacheEntry();
    if (cached) {
      bootstrapData = cached.data;
      bootstrapStoredAt = cached.storedAt;
      notifyListeners();
    }
  }

  // Serve cached data immediately; refresh it in the background if stale.
  if (bootstrapData) {
    maybeRevalidateInBackground();
    return Promise.resolve(bootstrapData);
  }

  if (Date.now() - lastFailureAt < FAILURE_BACKOFF) return Promise.resolve(null);
  return refreshBootstrap();
}

// ─── React hook ──────────────────────────────────────────────────────
export function useBootstrap(): { data: BootstrapData | null; loading: boolean; refetch: () => void } {
  const [data, setData] = useState<BootstrapData | null>(() => bootstrapData || getLocalCache());
  const [loading, setLoading] = useState(!data);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const listener = () => {
      if (mountedRef.current && bootstrapData) {
        setData(bootstrapData);
        setLoading(false);
      }
    };
    bootstrapListeners.push(listener);

    ensureBootstrap().then(() => {
      if (mountedRef.current) {
        setData(bootstrapData);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      bootstrapListeners = bootstrapListeners.filter(fn => fn !== listener);
    };
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    refreshBootstrap().then(() => {
      if (mountedRef.current) {
        setData(bootstrapData);
        setLoading(false);
      }
    });
  }, []);

  return { data, loading, refetch };
}

// ─── Typed data hooks (same API surface as before) ───────────────────
// Outputs are memoized on the bootstrap arrays so consumers get stable
// references (safe to use as effect / memo dependencies).

export function useProducts() {
  const { data: boot, loading, refetch } = useBootstrap();
  const products = boot?.products;

  const normalized = useMemo(
    () =>
      (products || [])
        .filter((p: Product) => {
          const raw = p as unknown as Record<string, unknown>;
          if (raw.isActive === false) return false;
          if (Array.isArray(p.badges) && (p.badges.includes('HIDDEN') || p.badges.includes('DISABLED'))) return false;
          return true;
        })
        .map((p: Product, idx: number) => {
          const raw = p as unknown as Record<string, unknown>;
          return {
            ...p,
            id: String(raw.id || raw.$id || raw.slug || `prod-${idx}`),
            sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL'],
            images: Array.isArray(p.images) ? p.images : [],
            badges: Array.isArray(p.badges) ? p.badges : [],
          } as Product;
        }),
    [products]
  );

  return { data: normalized, loading, error: null, refetch };
}

export function useProduct(slug: string) {
  const { data: boot, loading, refetch } = useBootstrap();
  const products = boot?.products;

  const normalized = useMemo(() => {
    const p = (products || []).find((prod: Product) => {
      const raw = prod as unknown as Record<string, unknown>;
      const matches = prod.slug === slug || raw.$id === slug;
      if (!matches) return false;
      if (raw.isActive === false) return false;
      if (Array.isArray(prod.badges) && (prod.badges.includes('HIDDEN') || prod.badges.includes('DISABLED'))) return false;
      return true;
    }) || null;

    const raw = p as unknown as Record<string, unknown> | null;
    return p && raw
      ? ({
          ...p,
          id: String(raw.id || raw.$id || raw.slug || slug),
          sizes: Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL'],
          images: Array.isArray(p.images) ? p.images : [],
          badges: Array.isArray(p.badges) ? p.badges : [],
        } as Product)
      : null;
  }, [products, slug]);

  return { data: normalized, loading, error: null, refetch };
}

export function useCollections() {
  const { data: boot, loading, refetch } = useBootstrap();
  const collections = boot?.collections;

  const normalized = useMemo(
    () =>
      (collections || []).map((c: Collection, idx: number) => {
        const raw = c as unknown as Record<string, unknown>;
        return {
          ...c,
          id: String(raw.id || raw.$id || raw.slug || `col-${idx}`),
          productIds: Array.isArray(c.productIds) ? c.productIds : [],
        } as Collection;
      }),
    [collections]
  );

  return { data: normalized, loading, error: null, refetch };
}

export function useCategories() {
  const { data: boot, loading, refetch } = useBootstrap();
  const categories = boot?.categories;

  const normalized = useMemo(
    () =>
      (categories || []).map((c: Category, idx: number) => {
        const raw = c as unknown as Record<string, unknown>;
        return {
          ...c,
          id: String(raw.id || raw.$id || raw.slug || `cat-${idx}`),
        } as Category;
      }),
    [categories]
  );

  return { data: normalized, loading, error: null, refetch };
}

// Star collections derived from collections data
export interface StarCollection {
  name: string;
  slug: string;
  title: string;
  tagline: string;
  image: string;
  count: string;
}

const STAR_SLUGS = ['pawan-kalyan', 'mahesh-babu', 'prabhas', 'allu-arjun', 'ram-charan', 'ntr'];

const STAR_META: Record<string, { title: string; tagline: string; image: string }> = {
  'pawan-kalyan': { title: 'POWER STAR COLLECTION', tagline: 'SENANI & OG ERA FITS', image: '6a7fa5f80010fcd2bc85' },
  'mahesh-babu': { title: 'MAHESH BABU COLLECTION', tagline: 'SUPERSTAR & POKIRI EDITIONS', image: '6a7fa5f700082ba1bbc3' },
  'prabhas': { title: 'PRABHAS COLLECTION', tagline: 'REBEL STAR & RAJA SAAB DROPS', image: '6a7fa5fb001234ea8799' },
  'allu-arjun': { title: 'ALLU ARJUN COLLECTION', tagline: 'ICON STAR & PUSHPA 2 EDITION', image: '6a7fa5f5002dd6861328' },
  'ram-charan': { title: 'RAM CHARAN COLLECTION', tagline: 'GLOBAL STAR GAME CHANGER', image: '6a7fa5ff00162b33637d' },
  'ntr': { title: 'JR NTR COLLECTION', tagline: 'MAN OF MASSES DEVARA', image: '6a7fa6010011985f8642' },
};

export function useStarCollections(): StarCollection[] {
  const { data: collections } = useCollections();

  return useMemo(() => STAR_SLUGS.map((slug) => {
    const col = collections.find((c: Collection) => c.slug === slug);
    const meta = STAR_META[slug];
    const name = col?.name?.replace(' Collection', '') || meta?.title?.split(' ').slice(0, -1).join(' ') || slug;
    const productCount = col?.productIds?.length || 0;
    return {
      name,
      slug,
      title: meta?.title || `${name} COLLECTION`,
      tagline: meta?.tagline || '',
      image: meta?.image || '6a7fa922002c9b023447',
      count: `${productCount} DROPS`,
    };
  }), [collections]);
}

// ─── Bootstrap homepage data accessor (for cms-store) ────────────────
export function getBootstrapHomepage(): Record<string, unknown> | null {
  if (bootstrapData?.homepage) return bootstrapData.homepage;
  const cached = getLocalCache();
  return cached?.homepage || null;
}

/**
 * After an admin homepage save: put the saved copy into the cached bootstrap (memory and
 * localStorage) so a later read of the cache can't re-apply the previous homepage.
 */
export function setBootstrapHomepage(homepage: Record<string, unknown>): void {
  if (bootstrapData) bootstrapData = { ...bootstrapData, homepage };
  const cached = readLocalCacheEntry();
  if (!cached) return;
  try {
    const entry: CachedBootstrap = { ...cached, data: { ...cached.data, homepage } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Storage unavailable: the in-memory copy is still updated.
  }
}
