/**
 * Harden the Appwrite project's access rules and add query indexes.
 *
 *   node scripts/harden-appwrite.js           # dry run: shows what would change
 *   node scripts/harden-appwrite.js --apply   # makes the changes
 *   node scripts/harden-appwrite.js --apply --private-media
 *       # also removes public read from the media bucket — ONLY after deploying the
 *       # version of the site whose /api/media/file proxy sends the API key,
 *       # otherwise every product image stops loading.
 *
 * Why: every collection granted read/create/update/delete to "any", so anyone
 * who knows the (public) project ID could read every customer's order and
 * address, or edit prices and delete orders, straight through Appwrite's API.
 * The website never needs that: its server uses the API key, which bypasses
 * permissions, and browsers never talk to the database directly.
 *
 * Changes (each is skipped when already in place, so re-running is safe):
 *   1. Collections: remove all permissions (server-only access).
 *   2. `media` bucket: remove public create/update/delete. Public read stays
 *      unless --private-media is given; while it stays, anyone can list every
 *      uploaded file, including payment screenshots.
 *   3. Key indexes for the lookups the site performs (non-unique, so existing
 *      duplicate order numbers don't block them).
 *
 * Only configuration changes — no documents or files are read, modified or deleted.
 */
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...values] = trimmed.split('=');
    const val = values.join('=').trim().replace(/^["']|["']$/g, '');
    if (key.trim() && !process.env[key.trim()]) process.env[key.trim()] = val;
  }
}

loadEnv();

const APPLY = process.argv.includes('--apply');
const PRIVATE_MEDIA = process.argv.includes('--private-media');
const ENDPOINT = (process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').replace(/\/+$/, '');
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'clapculture_db';
const MEDIA_BUCKET = process.env.APPWRITE_STORAGE_BUCKET_MEDIA || 'media';

const COLLECTIONS = ['orders', 'customers', 'discounts', 'products', 'categories', 'collections', 'settings', 'homepage_sections'];

const INDEXES = [
  { collection: 'orders', key: 'idx_orderId', attributes: ['orderId'] },
  { collection: 'customers', key: 'idx_email', attributes: ['email'] },
  { collection: 'discounts', key: 'idx_code', attributes: ['code'] },
  { collection: 'products', key: 'idx_slug', attributes: ['slug'] },
];

if (!PROJECT_ID || !API_KEY) {
  console.error('APPWRITE_PROJECT_ID and APPWRITE_API_KEY must be set (in .env or the environment).');
  process.exit(1);
}

async function api(method, route, body) {
  const res = await fetch(`${ENDPOINT}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `${method} ${route} failed with ${res.status}`);
    err.code = res.status;
    throw err;
  }
  return json;
}

const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

async function change(description, action) {
  if (!APPLY) {
    console.log(`  WOULD ${description}`);
    return;
  }
  await action();
  console.log(`  DONE  ${description}`);
}

async function main() {
  console.log(`${APPLY ? 'APPLYING' : 'DRY RUN (pass --apply to make changes)'} — project ${PROJECT_ID}, database ${DATABASE_ID}\n`);

  console.log('1. Collection permissions');
  for (const id of COLLECTIONS) {
    let col;
    try {
      col = await api('GET', `/databases/${DATABASE_ID}/collections/${id}`);
    } catch (e) {
      console.log(`  skip  ${id}: ${e.message}`);
      continue;
    }
    if (col.$permissions.length === 0) {
      console.log(`  ok    ${id}: already server-only`);
      continue;
    }
    await change(`${id}: remove [${col.$permissions.join(', ')}]`, () =>
      api('PUT', `/databases/${DATABASE_ID}/collections/${id}`, {
        name: col.name,
        permissions: [],
        documentSecurity: col.documentSecurity,
        enabled: col.enabled,
      })
    );
  }

  console.log('\n2. Media bucket permissions');
  const publicRead = PRIVATE_MEDIA ? [] : ['read("any")'];
  const media = await api('GET', `/storage/buckets/${MEDIA_BUCKET}`);
  if (same(media.$permissions, publicRead)) {
    console.log(`  ok    ${MEDIA_BUCKET}: ${PRIVATE_MEDIA ? 'private (served only through the site proxy)' : 'public read only'}`);
  } else {
    await change(`${MEDIA_BUCKET}: set permissions to [${publicRead.join(', ')}] (was [${media.$permissions.join(', ')}])`, () =>
      api('PUT', `/storage/buckets/${MEDIA_BUCKET}`, {
        name: media.name,
        permissions: publicRead,
        fileSecurity: media.fileSecurity,
        enabled: media.enabled,
        maximumFileSize: media.maximumFileSize,
        allowedFileExtensions: media.allowedFileExtensions,
        compression: media.compression,
        encryption: media.encryption,
        antivirus: media.antivirus,
      })
    );
  }

  console.log('\n3. Indexes');
  for (const idx of INDEXES) {
    let existing;
    try {
      existing = await api('GET', `/databases/${DATABASE_ID}/collections/${idx.collection}/indexes`);
    } catch (e) {
      console.log(`  skip  ${idx.collection}.${idx.attributes}: ${e.message}`);
      continue;
    }
    const covered = existing.indexes.some((i) => i.key === idx.key || same(i.attributes, idx.attributes));
    if (covered) {
      console.log(`  ok    ${idx.collection}(${idx.attributes.join(', ')})`);
      continue;
    }
    await change(`create key index ${idx.collection}(${idx.attributes.join(', ')})`, () =>
      api('POST', `/databases/${DATABASE_ID}/collections/${idx.collection}/indexes`, {
        key: idx.key,
        type: 'key',
        attributes: idx.attributes,
        orders: idx.attributes.map(() => 'ASC'),
      })
    );
  }

  console.log(APPLY ? '\nFinished.' : '\nNothing was changed. Re-run with --apply to make these changes.');
}

main().catch((e) => {
  console.error('\nFailed:', e.message);
  process.exit(1);
});
