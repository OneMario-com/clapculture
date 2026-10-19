const { Client, Databases, Storage, Permission, Role, ID } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...values] = trimmed.split('=');
        const val = values.join('=').trim().replace(/^["']|["']$/g, '');
        if (key.trim() && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'clapculture_db';

console.log('⚡ CLAPCULTURE Appwrite Database Setup & Star Seeder');
console.log('--------------------------------------------------');
console.log(`📍 Endpoint: ${ENDPOINT}`);
console.log(`🆔 Project ID: ${PROJECT_ID || '(Not set)'}`);
console.log(`🗄️ Database ID: ${DATABASE_ID}`);
console.log('--------------------------------------------------');

if (!PROJECT_ID || !API_KEY || PROJECT_ID === 'clapculture_project_id' || API_KEY === 'your_appwrite_api_key_here') {
  console.log('⚠️ Notice: APPWRITE_PROJECT_ID or APPWRITE_API_KEY is not configured in .env.');
  process.exit(0);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);
const storage = new Storage(client);

async function ensureDatabase() {
  try {
    await databases.get(DATABASE_ID);
    console.log(`✅ Database "${DATABASE_ID}" exists.`);
  } catch (e) {
    if (e.code === 404) {
      console.log(`🔄 Creating Database "${DATABASE_ID}"...`);
      await databases.create(DATABASE_ID, 'ClapCulture Main Database');
      console.log(`✅ Database "${DATABASE_ID}" created.`);
    } else {
      throw e;
    }
  }
}

const COLLECTIONS = [
  {
    id: 'products',
    name: 'Products',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'slug', type: 'string', size: 255, required: true },
      { key: 'price', type: 'double', required: true },
      { key: 'compareAtPrice', type: 'double', required: false },
      { key: 'description', type: 'string', size: 5000, required: true },
      { key: 'images', type: 'string_array', size: 2000, required: true },
      { key: 'sizes', type: 'string_array', size: 10, required: true },
      { key: 'stock', type: 'integer', required: true },
      { key: 'badges', type: 'string_array', size: 50, required: false },
      { key: 'categoryId', type: 'string', size: 255, required: true },
      { key: 'createdAt', type: 'string', size: 255, required: false },
      { key: 'sizeStock', type: 'string', size: 2000, required: false },
      { key: 'isActive', type: 'boolean', required: false },
      { key: 'freeShipping', type: 'boolean', required: false },
      { key: 'deliveryChargeEnabled', type: 'boolean', required: false },
      { key: 'deliveryFee', type: 'double', required: false },
    ],
  },
  {
    id: 'categories',
    name: 'Categories',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'slug', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'image', type: 'string', size: 2000, required: false },
    ],
  },
  {
    id: 'collections',
    name: 'Collections',
    attributes: [
      { key: 'name', type: 'string', size: 255, required: true },
      { key: 'slug', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'image', type: 'string', size: 2000, required: false },
      { key: 'productIds', type: 'string_array', size: 255, required: false },
    ],
  },
  {
    id: 'orders',
    name: 'Orders',
    attributes: [
      { key: 'orderId', type: 'string', size: 255, required: true },
      { key: 'customer', type: 'string', size: 5000, required: true },
      { key: 'items', type: 'string', size: 10000, required: true },
      { key: 'subtotal', type: 'double', required: true },
      { key: 'shipping', type: 'double', required: true },
      { key: 'total', type: 'double', required: true },
      { key: 'paymentStatus', type: 'string', size: 50, required: true },
      { key: 'orderStatus', type: 'string', size: 50, required: true },
      { key: 'transactionId', type: 'string', size: 255, required: false },
      { key: 'trackingNumber', type: 'string', size: 255, required: false },
      { key: 'isArchived', type: 'boolean', required: false },
    ],
  },
  {
    id: 'customers',
    name: 'Customers',
    attributes: [
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'firstName', type: 'string', size: 255, required: true },
      { key: 'lastName', type: 'string', size: 255, required: true },
      { key: 'phone', type: 'string', size: 50, required: false },
      { key: 'orders', type: 'string_array', size: 255, required: false },
    ],
  },
  {
    id: 'discounts',
    name: 'Discounts',
    attributes: [
      { key: 'code', type: 'string', size: 100, required: true },
      { key: 'type', type: 'string', size: 50, required: true },
      { key: 'value', type: 'double', required: true },
      { key: 'minOrder', type: 'double', required: false },
      { key: 'expiry', type: 'string', size: 255, required: false },
      { key: 'usageLimit', type: 'integer', required: false },
      { key: 'usageCount', type: 'integer', required: true },
      { key: 'active', type: 'boolean', required: true },
    ],
  },
  {
    id: 'settings',
    name: 'Settings',
    attributes: [
      { key: 'storeName', type: 'string', size: 255, required: true },
      { key: 'currency', type: 'string', size: 50, required: true },
      { key: 'freeShippingThreshold', type: 'double', required: true },
      { key: 'shippingFee', type: 'double', required: false },
      { key: 'upiId', type: 'string', size: 255, required: false },
      { key: 'qrCodeUrl', type: 'string', size: 2000, required: false },
    ],
  },
  {
    id: 'homepage_sections',
    name: 'Homepage Sections',
    attributes: [
      { key: 'type', type: 'string', size: 100, required: true },
      { key: 'title', type: 'string', size: 255, required: false },
      { key: 'subtitle', type: 'string', size: 255, required: false },
      { key: 'content', type: 'string', size: 10000, required: true },
      { key: 'order', type: 'integer', required: true },
    ],
  },
];

async function ensureCollections() {
  for (const col of COLLECTIONS) {
    try {
      await databases.getCollection(DATABASE_ID, col.id);
      console.log(`📦 Collection "${col.name}" (${col.id}) exists.`);
    } catch (e) {
      if (e.code === 404) {
        console.log(`🔄 Creating Collection "${col.name}" (${col.id})...`);
        await databases.createCollection(
          DATABASE_ID,
          col.id,
          col.name,
          // No public permissions: the site only accesses data through its server API key.
          []
        );
        console.log(`✅ Collection "${col.name}" created.`);
      } else {
        console.error(`❌ Error checking collection ${col.id}:`, e.message);
      }
    }

    for (const attr of col.attributes) {
      try {
        if (attr.type === 'string') {
          await databases.createStringAttribute(DATABASE_ID, col.id, attr.key, attr.size || 255, attr.required, attr.default);
        } else if (attr.type === 'double') {
          await databases.createFloatAttribute(DATABASE_ID, col.id, attr.key, attr.required, undefined, undefined, attr.default);
        } else if (attr.type === 'integer') {
          await databases.createIntegerAttribute(DATABASE_ID, col.id, attr.key, attr.required, undefined, undefined, attr.default);
        } else if (attr.type === 'boolean') {
          await databases.createBooleanAttribute(DATABASE_ID, col.id, attr.key, attr.required, attr.default);
        } else if (attr.type === 'string_array') {
          await databases.createStringAttribute(DATABASE_ID, col.id, attr.key, attr.size || 255, attr.required, undefined, true);
        }
      } catch (e) {}
    }
  }
}

async function ensureStorageBucket() {
  const bucketId = 'media';
  try {
    await storage.getBucket(bucketId);
    console.log(`🪣 Storage Bucket "${bucketId}" exists.`);
  } catch (e) {
    if (e.code === 404) {
      await storage.createBucket(
        bucketId,
        'ClapCulture Media Storage',
        // Public read only (images). Uploads and deletes go through the server API key.
        [Permission.read(Role.any())],
        false,
        true,
        50000000,
        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'mp4']
      );
      console.log(`✅ Storage Bucket "${bucketId}" created.`);
    }
  }
}

const SAMPLE_CATEGORIES = [
  { id: 'c1', name: 'Tees', slug: 'tees', description: 'Heavyweight oversized graphic tees' },
  { id: 'c2', name: 'Outerwear', slug: 'outerwear', description: 'Streetwear hoodies, jackets & fleece' },
  { id: 'c3', name: 'Bottoms', slug: 'bottoms', description: 'Cargo pants, sweatpants & denim' },
  { id: 'c4', name: 'Headwear', slug: 'headwear', description: 'Snapbacks, caps & beanies' }
];

const SAMPLE_PRODUCTS = [
  {
    id: 'p1',
    name: 'OG SENANI OVERSIZED TEE',
    slug: 'og-senani-oversized-tee',
    price: 1499,
    compareAtPrice: 1999,
    images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'],
    description: 'Pawan Kalyan Senani edition. 240 GSM bio-washed heavy cotton oversized graphic tee.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    stock: 50,
    badges: ['PAWAN KALYAN', 'NEW'],
    categoryId: 'c1'
  },
  {
    id: 'p2',
    name: 'POWER STAR HEAVYWEIGHT HOODIE',
    slug: 'power-star-heavyweight-hoodie',
    price: 2799,
    compareAtPrice: 3499,
    images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80'],
    description: 'Vintage high-density fleece hoodie homage to Power Star Pawan Kalyan.',
    sizes: ['M', 'L', 'XL'],
    stock: 25,
    badges: ['PAWAN KALYAN', 'BEST SELLER'],
    categoryId: 'c2'
  },
  {
    id: 'p3',
    name: 'PRINCE VINTAGE WASH TEE',
    slug: 'prince-vintage-wash-tee',
    price: 1399,
    compareAtPrice: 1899,
    images: ['https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80'],
    description: 'Mahesh Babu sleek minimalism edition. Hand-washed acid grunge cotton fit.',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 40,
    badges: ['MAHESH BABU', 'NEW'],
    categoryId: 'c1'
  },
  {
    id: 'p4',
    name: 'SSMB CYBERPUNK CARGO PANTS',
    slug: 'ssmb-cyberpunk-cargo-pants',
    price: 2999,
    images: ['https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=80'],
    description: 'Tactical cargo utility designed for modern rebels.',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 30,
    badges: ['MAHESH BABU'],
    categoryId: 'c3'
  },
  {
    id: 'p5',
    name: 'REBEL STAR SALAAR HOODIE',
    slug: 'rebel-star-salaar-hoodie',
    price: 2999,
    compareAtPrice: 3999,
    images: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80'],
    description: 'Prabhas Salaar heavy-duty thermal fleece hoodie with custom back print.',
    sizes: ['M', 'L', 'XL', 'XXL'],
    stock: 35,
    badges: ['PRABHAS', 'LIMITED'],
    categoryId: 'c2'
  },
  {
    id: 'p6',
    name: 'PUSHPA ICON STAR TEE',
    slug: 'pushpa-icon-star-tee',
    price: 1399,
    compareAtPrice: 1799,
    images: ['https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=800&q=80'],
    description: 'Allu Arjun Pushpa Rule edition. Bio-washed drop-shoulder streetwear tee.',
    sizes: ['S', 'M', 'L', 'XL'],
    stock: 60,
    badges: ['ALLU ARJUN', 'BEST SELLER'],
    categoryId: 'c1'
  }
];

const SAMPLE_COLLECTIONS = [
  { id: 'col1', name: 'New Drop', slug: 'new-drop', description: 'Fresh drops straight from the workshop', productIds: ['p1', 'p3', 'p6'] },
  { id: 'col2', name: 'Pawan Kalyan Collection', slug: 'pawan-kalyan', description: 'Senani & OG Era Fits', productIds: ['p1', 'p2'] },
  { id: 'col3', name: 'Mahesh Babu Collection', slug: 'mahesh-babu', description: 'Prince Sleek Streetwear', productIds: ['p3', 'p4'] },
  { id: 'col4', name: 'Prabhas Collection', slug: 'prabhas', description: 'Rebel Star Heavyweight Fits', productIds: ['p5'] },
  { id: 'col5', name: 'Allu Arjun Collection', slug: 'allu-arjun', description: 'Icon Star Pushpa Edition', productIds: ['p6'] },
];

async function seedData() {
  console.log('🌱 Seeding Star Collections (Pawan Kalyan, Mahesh Babu, Prabhas, Allu Arjun)...');
  
  try {
    const existing = await databases.listDocuments(DATABASE_ID, 'categories');
    if (existing.documents.length === 0) {
      for (const cat of SAMPLE_CATEGORIES) {
        await databases.createDocument(DATABASE_ID, 'categories', cat.id, cat);
      }
    }
  } catch (e) {}

  try {
    const existing = await databases.listDocuments(DATABASE_ID, 'products');
    if (existing.documents.length === 0) {
      for (const prod of SAMPLE_PRODUCTS) {
        await databases.createDocument(DATABASE_ID, 'products', prod.id, prod);
      }
    }
  } catch (e) {}

  try {
    const existing = await databases.listDocuments(DATABASE_ID, 'collections');
    if (existing.documents.length === 0) {
      for (const col of SAMPLE_COLLECTIONS) {
        await databases.createDocument(DATABASE_ID, 'collections', col.id, col);
      }
    }
  } catch (e) {}
}

async function run() {
  try {
    await ensureDatabase();
    await ensureCollections();
    await ensureStorageBucket();
    await seedData();
    console.log('--------------------------------------------------');
    console.log('✨ All Appwrite collections & Star Collections (Pawan Kalyan, Mahesh Babu, Prabhas, Allu Arjun) seeded successfully!');
  } catch (error) {
    console.error('❌ Setup error:', error.message || error);
  }
}

run();
