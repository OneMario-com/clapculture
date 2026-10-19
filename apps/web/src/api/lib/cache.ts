/**
 * Two-tier cache for Appwrite reads.
 *
 *   L1  per-isolate memory  — free, but every Cloudflare isolate has its own copy
 *   L2  Upstash Redis       — shared by all isolates, survives cold starts
 *
 * Invalidation is per namespace: every entry records the namespace version it
 * was built from, and invalidate() bumps that version with a single INCR, so
 * one admin edit invalidates every isolate at once without scanning keys.
 *
 * Entries are kept in Redis well past their fresh TTL. If Appwrite is down or
 * paused when an entry needs refreshing, the last good value is served instead
 * of an error (stale-on-error). Loader failures are never cached.
 */
import { redis, redisPipeline } from './redis';

export type CacheNamespace = 'catalog' | 'orders' | 'settings' | 'discounts' | 'media';

interface Entry<T> {
  v: T;
  ver: number;
  fresh: number;
}

interface MemoryItem {
  entry: Entry<unknown>;
  expiry: number;
}

// How long an isolate trusts its own copy without asking Redis. Other isolates
// pick up an invalidation within this window.
const L1_MAX_SECONDS = 60;
// How long a value is kept in Redis as a stale fallback for Appwrite outages.
const STALE_KEEP_SECONDS = 7 * 24 * 60 * 60;
const MAX_MEMORY_ENTRIES = 500;

const memoryCache = new Map<string, MemoryItem>();
const memoryVersions = new Map<CacheNamespace, number>();
const inFlight = new Map<string, Promise<unknown>>();

const versionKey = (ns: CacheNamespace) => `cc:ver:${ns}`;
const dataKey = (ns: CacheNamespace, key: string) => `cc:data:${ns}:${key}`;
const memoryKey = (ns: CacheNamespace, key: string) => `${ns}:${key}`;

function readMemory<T>(ns: CacheNamespace, key: string): Entry<T> | null {
  const item = memoryCache.get(memoryKey(ns, key));
  if (!item) return null;
  return item.entry as Entry<T>;
}

function writeMemory<T>(ns: CacheNamespace, key: string, entry: Entry<T>, ttlSeconds: number): void {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    // Maps iterate in insertion order, so this drops the oldest entry.
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.delete(memoryKey(ns, key));
  memoryCache.set(memoryKey(ns, key), {
    entry,
    expiry: Date.now() + Math.min(ttlSeconds, L1_MAX_SECONDS) * 1000,
  });
}

/**
 * Return the cached value for `key`, or run `loader` and cache its result.
 *
 * - `ttl` is how long (seconds) a value counts as fresh.
 * - Concurrent misses in one isolate share a single loader call.
 * - If the loader throws and any earlier value exists, that value is returned.
 */
export async function cached<T>(
  ns: CacheNamespace,
  key: string,
  ttl: number,
  loader: () => Promise<T>,
  { memorySeconds = L1_MAX_SECONDS }: { memorySeconds?: number } = {}
): Promise<T> {
  const mem = memoryCache.get(memoryKey(ns, key));
  if (mem && Date.now() < mem.expiry && mem.entry.ver === (memoryVersions.get(ns) ?? mem.entry.ver)) {
    return mem.entry.v as T;
  }

  const flightKey = memoryKey(ns, key);
  const pending = inFlight.get(flightKey);
  if (pending) return pending as Promise<T>;

  const run = (async () => {
    let stale: Entry<T> | null = readMemory<T>(ns, key);
    let version = memoryVersions.get(ns) ?? 0;

    const results = await redisPipeline([
      ['GET', versionKey(ns)],
      ['GET', dataKey(ns, key)],
    ]);
    if (results) {
      version = Number(results[0]) || 0;
      memoryVersions.set(ns, version);
      if (typeof results[1] === 'string') {
        try {
          const entry = JSON.parse(results[1]) as Entry<T>;
          if (entry.ver === version && Date.now() < entry.fresh) {
            writeMemory(ns, key, entry, Math.min(memorySeconds, Math.ceil((entry.fresh - Date.now()) / 1000)));
            return entry.v;
          }
          stale = entry;
        } catch {
          // Corrupt entry: treat as a miss.
        }
      }
    }

    let value: T;
    try {
      value = await loader();
    } catch (error) {
      if (stale) {
        console.log(`Cache: serving stale ${ns}:${key} —`, (error as Error).message);
        return stale.v;
      }
      throw error;
    }

    const entry: Entry<T> = { v: value, ver: version, fresh: Date.now() + ttl * 1000 };
    writeMemory(ns, key, entry, Math.min(memorySeconds, ttl));
    // Fire-and-forget: a slow or failed Redis write must not delay the response.
    redis(['SET', dataKey(ns, key), JSON.stringify(entry), 'EX', STALE_KEEP_SECONDS]).catch(() => {});
    return value;
  })();

  inFlight.set(flightKey, run);
  try {
    return await run;
  } finally {
    inFlight.delete(flightKey);
  }
}

const versionMemo = new Map<CacheNamespace, { version: number; expiry: number }>();

/**
 * Current version of a namespace (changes on every invalidate). Memoised per
 * isolate for a short time, so it can be embedded in edge-cache keys cheaply.
 */
export async function getNamespaceVersion(ns: CacheNamespace): Promise<number> {
  const memo = versionMemo.get(ns);
  if (memo && Date.now() < memo.expiry) return memo.version;
  const result = await redis(['GET', versionKey(ns)]);
  const version = result === null ? memoryVersions.get(ns) ?? 0 : Number(result) || 0;
  versionMemo.set(ns, { version, expiry: Date.now() + 30_000 });
  return version;
}

/**
 * Invalidate every cached entry in the given namespaces, across all isolates.
 */
export async function invalidate(...namespaces: CacheNamespace[]): Promise<void> {
  for (const ns of namespaces) {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(`${ns}:`)) memoryCache.delete(key);
    }
  }
  const results = await redisPipeline(namespaces.map((ns) => ['INCR', versionKey(ns)]));
  namespaces.forEach((ns, i) => {
    const next = results ? Number(results[i]) : NaN;
    // Without Redis, bump locally so this isolate's in-memory entries are refused.
    memoryVersions.set(ns, Number.isFinite(next) ? next : (memoryVersions.get(ns) ?? 0) + 1);
    versionMemo.delete(ns);
  });
}
