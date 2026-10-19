/**
 * Minimal Upstash Redis REST client.
 *
 * Cloudflare's edge runtime has no TCP sockets, so a regular Redis client
 * (ioredis / node-redis) cannot run here. Upstash exposes Redis over HTTPS,
 * which works with plain fetch.
 *
 * Redis is strictly an optimisation: when it is not configured, slow, or
 * down, every helper resolves to null and callers fall back to Appwrite /
 * in-memory state. A Redis problem must never take the store down.
 */

type RedisArg = string | number;
type RedisResult = string | number | null | RedisResult[];

const REQUEST_TIMEOUT_MS = 1500;

interface RedisConfig {
  url: string;
  token: string;
}

function getConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

export function isRedisConfigured(): boolean {
  return getConfig() !== null;
}

async function post(path: string, body: unknown): Promise<unknown> {
  const config = getConfig();
  if (!config) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${config.url}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      console.log(`Redis notice: HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.log('Redis notice:', (e as Error).message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run a single command, e.g. redis(['GET', 'key']).
 * Returns null when Redis is unavailable or the command errored.
 */
export async function redis(command: RedisArg[]): Promise<RedisResult> {
  const json = (await post('', command)) as { result?: RedisResult; error?: string } | null;
  if (!json || json.error !== undefined) return null;
  return json.result ?? null;
}

/**
 * Run several commands in one HTTP round trip (not atomic).
 * Returns null when Redis is unavailable, otherwise one entry per command
 * (null for a command that errored).
 */
export async function redisPipeline(commands: RedisArg[][]): Promise<RedisResult[] | null> {
  const json = (await post('/pipeline', commands)) as Array<{ result?: RedisResult; error?: string }> | null;
  if (!Array.isArray(json)) return null;
  return json.map((r) => (r && r.error === undefined ? r.result ?? null : null));
}

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

/**
 * Fixed-window rate limiter. Returns true when the caller is over the limit.
 * Uses Redis when configured so the limit holds across edge isolates,
 * otherwise falls back to a per-isolate counter.
 */
export async function isRateLimited(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const redisKey = `cc:rl:${key}`;
  const results = await redisPipeline([
    ['SET', redisKey, 0, 'EX', windowSeconds, 'NX'],
    ['INCR', redisKey],
  ]);
  if (results && typeof results[1] === 'number') {
    return results[1] > limit;
  }

  const now = Date.now();
  const entry = memoryCounters.get(redisKey);
  if (!entry || now > entry.resetAt) {
    memoryCounters.set(redisKey, { count: 1, resetAt: now + windowSeconds * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export async function clearRateLimit(key: string): Promise<void> {
  memoryCounters.delete(`cc:rl:${key}`);
  await redis(['DEL', `cc:rl:${key}`]);
}
