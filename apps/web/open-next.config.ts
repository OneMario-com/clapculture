import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

export default defineCloudflareConfig({
  // Pre-rendered pages are served straight from Workers static assets. The app
  // has no ISR/revalidation (catalog data is cached by src/api/lib/cache.ts),
  // so no R2 bucket is needed.
  incrementalCache: staticAssetsIncrementalCache,
  // Answer requests for pre-rendered pages without booting the Next.js server.
  enableCacheInterception: true,
});
