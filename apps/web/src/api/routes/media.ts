import { Hono } from 'hono';
import { adminAuth } from '../middleware/auth';
import { uploadFile, getFileUrl, deleteFile } from '../lib/storage';
import { getAppwriteClient } from '../lib/appwrite';
import { getEnv, runInBackground } from '../lib/utils';

const media = new Hono();
const BUCKET_ID = 'media';
const FILE_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

// Edge cache key depends only on the file id, so extra query parameters can't
// be used to bypass the cache and re-fetch from Appwrite.
const fileCacheKey = (requestUrl: string, id: string) =>
  new Request(new URL(`/api/media/file/${id}`, requestUrl).toString(), { method: 'GET' });

// Public CDN-cached image proxy for Appwrite storage files
media.get('/file/:id', async (c) => {
  try {
    const id = c.req.param('id') || '';
    if (!FILE_ID_PATTERN.test(id)) {
      return c.json({ error: 'Valid file ID required' }, 400);
    }

    const cacheKey = fileCacheKey(c.req.url, id);
    
    // 1. Check Cloudflare Global Edge Cache
    let cfCache: Cache | undefined;
    try {
      if (typeof caches !== 'undefined' && (caches as unknown as Record<string, Cache>).default) {
        cfCache = (caches as unknown as Record<string, Cache>).default;
        const cachedResponse = await cfCache.match(cacheKey);
        if (cachedResponse) {
          const resClone = new Response(cachedResponse.body, cachedResponse);
          resClone.headers.set('X-CF-Cache', 'HIT');
          return resClone;
        }
      }
    } catch {}

    const env = getEnv(c);
    const endpoint = env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
    const projectId = env.APPWRITE_PROJECT_ID || '6a7dfa97003713198186';
    
    const appwriteUrl = `${endpoint}/storage/buckets/${BUCKET_ID}/files/${id}/view?project=${projectId}`;
    
    // Fetch from Appwrite Storage with Cloudflare cache headers. The API key lets
    // this proxy serve files even when the bucket has no public read access
    // (which also stops anyone from listing every uploaded file).
    const apiKey = env.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY || '';
    const res = await fetch(appwriteUrl, {
      headers: apiKey ? { 'X-Appwrite-Project': projectId, 'X-Appwrite-Key': apiKey } : undefined,
      // @ts-expect-error Cloudflare specific options
      cf: {
        cacheEverything: true,
        cacheTtl: 31536000,
      },
    });

    if (!res.ok) {
      return c.json({ error: 'Image not found' }, res.status as unknown as 404);
    }
    
    const contentType = res.headers.get('content-type') || 'image/webp';
    const body = await res.arrayBuffer();
    
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      'CDN-Cache-Control': 'public, max-age=31536000, immutable',
      'Cloudflare-CDN-Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-CF-Cache': 'MISS',
    });

    const response = new Response(body, {
      status: 200,
      headers: responseHeaders,
    });

    // Save to Cloudflare Edge Cache for future requests
    if (cfCache) {
      runInBackground(cfCache.put(cacheKey, response.clone()), 'Media edge cache');
    }

    return response;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error streaming image';
    return c.json({ error: msg }, 500);
  }
});

media.post('/upload', adminAuth, async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'] as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }
    
    const env = getEnv(c);
    const uploaded = await uploadFile(env, BUCKET_ID, file);
    const url = getFileUrl(env, BUCKET_ID, uploaded.$id);
    
    return c.json({ 
      success: true, 
      data: {
        id: uploaded.$id,
        name: uploaded.name,
        size: uploaded.sizeOriginal,
        type: uploaded.mimeType,
        url,
        optimized: true,
        format: 'webp'
      } 
    });
  } catch (error: unknown) {
    console.error('Media upload error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

media.get('/', adminAuth, async (c) => {
  try {
    const env = getEnv(c);
    const endpoint = env?.APPWRITE_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
    const projectId = env?.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT_ID || '6a7dfa97003713198186';
    const apiKey = env?.APPWRITE_API_KEY || process.env.APPWRITE_API_KEY || '';

    const limit = c.req.query('limit') || '100';
    const res = await fetch(`${endpoint}/storage/buckets/${BUCKET_ID}/files?queries[]=${encodeURIComponent(`limit(${limit})`)}&queries[]=${encodeURIComponent('orderDesc("$createdAt")')}`, {
      headers: {
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
    });

    if (!res.ok) {
      const { storage } = getAppwriteClient(env);
      const response = await storage.listFiles(BUCKET_ID);
      const files = response.files.map(f => ({
        id: f.$id,
        name: f.name,
        size: f.sizeOriginal,
        type: f.mimeType,
        url: getFileUrl(env, BUCKET_ID, f.$id),
        createdAt: f.$createdAt
      }));
      return c.json({ success: true, data: files });
    }

    const json = (await res.json()) as { files: Array<{ $id: string; name: string; sizeOriginal: number; mimeType: string; $createdAt: string }> };
    const files = (json.files || []).map(f => ({
      id: f.$id,
      name: f.name,
      size: f.sizeOriginal,
      type: f.mimeType,
      url: getFileUrl(env, BUCKET_ID, f.$id),
      createdAt: f.$createdAt
    }));
    
    return c.json({ success: true, data: files });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

media.delete('/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id') || '';
    if (!FILE_ID_PATTERN.test(id)) {
      return c.json({ success: false, error: 'Valid file ID required' }, 400);
    }
    const env = getEnv(c);
    const deleted = await deleteFile(env, BUCKET_ID, id);
    if (!deleted) {
      return c.json({ success: false, error: 'Appwrite could not delete this file. Please try again.' }, 502);
    }

    // Best effort: edge caches are per data centre, so this only clears the local copy.
    try {
      if (typeof caches !== 'undefined' && (caches as unknown as Record<string, Cache>).default) {
        await (caches as unknown as Record<string, Cache>).default.delete(fileCacheKey(c.req.url, id));
      }
    } catch {}

    return c.json({ success: true, data: { deleted: true } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default media;
