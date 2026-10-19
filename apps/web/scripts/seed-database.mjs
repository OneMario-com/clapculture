/**
 * Seed script: Populate Appwrite database with collections, categories, and homepage config.
 * Products are already seeded.
 * Run: node --env-file=.env scripts/seed-database.mjs
 */
import { Client, Databases, ID, Query } from 'node-appwrite';

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error('Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and APPWRITE_API_KEY (e.g. node --env-file=.env scripts/seed-database.mjs).');
  process.exit(1);
}

const client = new Client();
client.setEndpoint(APPWRITE_ENDPOINT);
client.setProject(APPWRITE_PROJECT_ID);
client.setKey(APPWRITE_API_KEY);

const DB_ID = process.env.APPWRITE_DATABASE_ID || 'clapculture_db';
const db = new Databases(client);

// ---------- Categories ----------
const CATEGORIES = [
  { name: 'Tees', slug: 'tees' },
  { name: 'Outerwear', slug: 'outerwear' },
  { name: 'Bottoms', slug: 'bottoms' },
  { name: 'Headwear', slug: 'headwear' },
];

// ---------- Collections ----------
const COLLECTIONS_DATA = [
  { name: 'New Drop', slug: 'new-drop', description: 'Latest releases from ClapCulture', productIds: [] },
  { name: 'Pawan Kalyan Collection', slug: 'pawan-kalyan', description: 'Power Star Senani & OG Era fits', productIds: [] },
  { name: 'Mahesh Babu Collection', slug: 'mahesh-babu', description: 'Superstar & Pokiri edition streetwear', productIds: [] },
  { name: 'Prabhas Collection', slug: 'prabhas', description: 'Rebel Star & Raja Saab drops', productIds: [] },
  { name: 'Allu Arjun Collection', slug: 'allu-arjun', description: 'Icon Star & Pushpa 2 edition', productIds: [] },
  { name: 'Ram Charan Collection', slug: 'ram-charan', description: 'Global Star Game Changer fits', productIds: [] },
  { name: 'Jr NTR Collection', slug: 'ntr', description: 'Man of Masses Devara edition', productIds: [] },
  { name: 'T-Shirts', slug: 't-shirts', description: 'All heavyweight oversized tees', productIds: [] },
  { name: 'Best Sellers', slug: 'best-sellers', description: 'Top selling drops', productIds: [] },
];

// ---------- Homepage Config (stored as single JSON doc) ----------
const HOMEPAGE_CONFIG = {
  type: 'homepage_config',
  title: 'Homepage Configuration',
  order: 0,
  active: true,
  data: JSON.stringify({
    hero: {
      active: true,
      slides: [
        {
          id: 'slide-1',
          badge: 'NEW DROP LIVE',
          titleLine1: 'BORN TO',
          titleLine2: 'STAND OUT',
          subtitle: 'CLAP CULTURE',
          description: 'Unapologetic streetwear for the modern rebel. Elevate your everyday fit with our latest exclusive collection.',
          primaryCtaText: 'SHOP NOW',
          primaryCtaLink: '/shop',
          secondaryCtaText: 'EXPLORE COLLECTIONS',
          secondaryCtaLink: '/collections',
          desktopImage: '/herobg1-desktop.png',
          mobileImage: '/herobg1-mobile.png',
          active: true,
        },
        {
          id: 'slide-2',
          badge: 'EXCLUSIVE EDITION',
          titleLine1: 'ICONIC',
          titleLine2: 'HEAVYWEIGHT',
          subtitle: 'REBEL ESSENTIALS',
          description: 'Precision cut bio-washed cotton engineered for durability, comfort, and uncompromising attitude.',
          primaryCtaText: 'EXPLORE DROPS',
          primaryCtaLink: '/shop',
          secondaryCtaText: 'VIEW LOOKBOOK',
          secondaryCtaLink: '/collections',
          desktopImage: '/herobg2-desktop.png',
          mobileImage: '/herobg2-desktop.png',
          active: true,
        },
        {
          id: 'slide-3',
          badge: 'LIMITED RUN',
          titleLine1: 'CINEMATIC',
          titleLine2: 'STREETWEAR',
          subtitle: 'LEGEND SERIES',
          description: 'Pay homage to iconic cinema legends with custom illustrated graphics and oversized silhouettes.',
          primaryCtaText: 'SHOP STAR EDITION',
          primaryCtaLink: '/shop?star=pawan-kalyan',
          secondaryCtaText: 'ALL HEROES',
          secondaryCtaLink: '/shop',
          desktopImage: '/herobg3-desktop.png',
          mobileImage: '/herobg3-desktop.png',
          active: true,
        }
      ],
      sideBanner: {
        active: true,
        badge: 'TRENDING NOW',
        title: 'OVERSIZED COLLECTION',
        description: 'Heavyweight cotton blanks engineered for maximum comfort and durability.',
        imageUrl: '/herobg1-desktop.png',
        link: '/category/tees',
        ctaText: 'SHOP OVERSIZED',
      }
    },
    sections: [
      {
        id: 'section-lineup',
        type: 'lineup',
        title: 'EXPLORE THE LINEUP',
        subtitle: 'CATEGORIES',
        badge: 'CATEGORIES',
        viewAllText: 'VIEW ALL CATEGORIES',
        viewAllLink: '/shop',
        layoutStyle: 'grid-4',
        active: true,
        order: 1,
        tiles: [
          { id: 'tile-cat-1', title: 'TEES', subtitle: 'Heavyweight graphic blanks', tagline: 'HEAVYWEIGHT 240 GSM', badge: 'BESTSELLER', badgeColor: 'lime', imageUrl: '/herobg1-desktop.png', link: '/category/tees', ctaText: 'EXPLORE TEES', aspectRatio: 'portrait', active: true, order: 1 },
          { id: 'tile-cat-2', title: 'OUTERWEAR', subtitle: 'Fleece hoodies & jackets', tagline: 'PREMIUM 380 GSM FLEECE', badge: 'WINTER DROP', badgeColor: 'cyan', imageUrl: '/herobg2-desktop.png', link: '/category/outerwear', ctaText: 'EXPLORE HOODIES', aspectRatio: 'portrait', active: true, order: 2 },
          { id: 'tile-cat-3', title: 'BOTTOMS', subtitle: 'Tactical cargo utility', tagline: 'MULTI-POCKET RELAXED', badge: 'TRENDING', badgeColor: 'amber', imageUrl: '/herobg3-desktop.png', link: '/category/bottoms', ctaText: 'EXPLORE CARGOS', aspectRatio: 'portrait', active: true, order: 3 },
          { id: 'tile-cat-4', title: 'HEADWEAR', subtitle: 'Snapbacks & caps', tagline: 'STRUCTURED FIT', badge: 'NEW', badgeColor: 'purple', imageUrl: '/herobg1-mobile.png', link: '/category/headwear', ctaText: 'EXPLORE CAPS', aspectRatio: 'portrait', active: true, order: 4 },
        ]
      },
      {
        id: 'section-star-collection',
        type: 'star_collection',
        title: 'EXPLORE STAR COLLECTION',
        subtitle: 'TOLLYWOOD LEGENDS',
        badge: 'TOLLYWOOD LEGENDS',
        viewAllText: 'VIEW ALL HERO EDITIONS',
        viewAllLink: '/shop',
        layoutStyle: 'carousel',
        active: true,
        order: 2,
        tiles: [
          { id: 'tile-star-1', title: 'Pawan Kalyan', subtitle: 'Power Star Collection', tagline: 'SENANI & OG ERA FITS', badge: '12 DROPS', badgeColor: 'lime', imageUrl: '/pawankalyan.jpeg', link: '/collections/pawan-kalyan', ctaText: 'VIEW COLLECTION', aspectRatio: 'tall', active: true, order: 1 },
          { id: 'tile-star-2', title: 'Mahesh Babu', subtitle: 'Superstar Collection', tagline: 'PRINCE SLEEK STREETWEAR', badge: '10 DROPS', badgeColor: 'lime', imageUrl: '/mahesh-babu.jpeg', link: '/collections/mahesh-babu', ctaText: 'VIEW COLLECTION', aspectRatio: 'tall', active: true, order: 2 },
          { id: 'tile-star-3', title: 'Prabhas', subtitle: 'Rebel Star Collection', tagline: 'REBEL STAR HEAVYWEIGHT FITS', badge: '14 DROPS', badgeColor: 'lime', imageUrl: '/prabhas.jpeg', link: '/collections/prabhas', ctaText: 'VIEW COLLECTION', aspectRatio: 'tall', active: true, order: 3 },
          { id: 'tile-star-4', title: 'Allu Arjun', subtitle: 'Icon Star Collection', tagline: 'ICON STAR PUSHPA EDITION', badge: '15 DROPS', badgeColor: 'lime', imageUrl: '/allu-arjun.jpeg', link: '/collections/allu-arjun', ctaText: 'VIEW COLLECTION', aspectRatio: 'tall', active: true, order: 4 },
          { id: 'tile-star-5', title: 'Ram Charan', subtitle: 'Global Star Collection', tagline: 'GLOBAL STAR GAME CHANGER', badge: '12 DROPS', badgeColor: 'lime', imageUrl: '/ramcharan.jpeg', link: '/collections/ram-charan', ctaText: 'VIEW COLLECTION', aspectRatio: 'tall', active: true, order: 5 },
          { id: 'tile-star-6', title: 'Jr NTR', subtitle: 'Man of Masses Collection', tagline: 'MAN OF MASSES DEVARA', badge: '11 DROPS', badgeColor: 'lime', imageUrl: '/ntr.jpeg', link: '/collections/ntr', ctaText: 'VIEW COLLECTION', aspectRatio: 'tall', active: true, order: 6 },
        ]
      },
      {
        id: 'section-featured-drops',
        type: 'featured_drops',
        title: 'FEATURED DROPS',
        subtitle: 'CURATED SELECTION',
        badge: 'CURATED SELECTION',
        viewAllText: 'VIEW ALL DROPS',
        viewAllLink: '/shop',
        layoutStyle: 'carousel',
        active: true,
        order: 3,
        tiles: [
          { id: 'tile-drop-1', title: 'SUPERSTAR MAHESH BABU OVERSIZED TEE', subtitle: '320 GSM Heavyweight French Terry Cotton', badge: 'IN STOCK', badgeColor: 'lime', imageUrl: '/stock/superstar-mockup1.webp', link: '/product/superstar-mahesh-babu-oversized-tee', ctaText: 'SHOP NOW', price: 699, compareAtPrice: 1299, aspectRatio: 'portrait', active: true, order: 1 },
          { id: 'tile-drop-2', title: 'POKIRI ICONIC OVERSIZED TEE', subtitle: '320 GSM Heavyweight Bio-Washed Cotton', badge: 'SOLD OUT', badgeColor: 'crimson', imageUrl: '/stock/pokiri-mock1.webp', link: '/product/pokiri-iconic-oversized-tee', ctaText: 'SOLD OUT', price: 699, compareAtPrice: 1299, aspectRatio: 'portrait', active: true, order: 2 },
          { id: 'tile-drop-3', title: 'REBEL STAR DARLING OVERSIZED TEE', subtitle: '320 GSM Heavyweight Streetwear Fit', badge: 'SOLD OUT', badgeColor: 'crimson', imageUrl: '/stock/darling-mockup1.webp', link: '/product/rebel-star-darling-oversized-tee', ctaText: 'SOLD OUT', price: 699, compareAtPrice: 1299, aspectRatio: 'portrait', active: true, order: 3 },
          { id: 'tile-drop-4', title: 'ICON STAR AA RULE OVERSIZED TEE', subtitle: '320 GSM Heavyweight Drop-Shoulder Tee', badge: 'SOLD OUT', badgeColor: 'crimson', imageUrl: '/stock/aa-mockup1.webp', link: '/product/icon-star-aa-rule-oversized-tee', ctaText: 'SOLD OUT', price: 699, compareAtPrice: 1299, aspectRatio: 'portrait', active: true, order: 4 },
        ]
      },
      {
        id: 'section-promo-bento',
        type: 'promo_bento',
        title: 'SPECIAL EDITIONS & COLLABS',
        subtitle: 'LIMITED DROPS',
        badge: 'PROMO BENTO',
        viewAllText: 'SHOP ALL DROPS',
        viewAllLink: '/shop',
        layoutStyle: 'bento',
        active: true,
        order: 4,
        tiles: [
          { id: 'tile-promo-1', title: 'HEAVYWEIGHT OVERSIZED ESSENTIALS', subtitle: 'Crafted with 280 GSM premium French terry and custom silicone badges.', tagline: 'PREMIUM LINE', badge: 'TRENDING', badgeColor: 'lime', imageUrl: '/herobg2-desktop.png', link: '/shop', ctaText: 'EXPLORE DROP', aspectRatio: 'wide', active: true, order: 1 },
          { id: 'tile-promo-2', title: 'VINTAGE GRAPHIC SERIES', subtitle: 'Hand-distressed streetwear graphics inspired by 90s cinema posters.', tagline: 'LIMITED EDITION', badge: 'EXCLUSIVE', badgeColor: 'amber', imageUrl: '/herobg3-desktop.png', link: '/shop', ctaText: 'SHOP SERIES', aspectRatio: 'square', active: true, order: 2 },
          { id: 'tile-promo-3', title: 'TACTICAL ACCESSORIES', subtitle: 'Utility crossbody bags, embroidered snapbacks, and socks.', tagline: 'EVERYDAY FIT', badge: 'NEW ARRIVAL', badgeColor: 'cyan', imageUrl: '/herobg1-desktop.png', link: '/shop', ctaText: 'VIEW ACCESSORIES', aspectRatio: 'square', active: true, order: 3 },
        ]
      }
    ],
    newsletter: {
      active: true,
      title: 'JOIN THE CULTURE',
      subtitle: 'Exclusive drops, early access & more straight to your inbox.',
      badge: 'STAY AHEAD',
      stats: [
        { value: '2,000+', label: 'HAPPY FANS' },
        { value: '4.9/5', label: 'CUSTOMER RATING', highlight: '★★★★★' },
        { value: 'PAN INDIA', label: 'EXPRESS SHIPPING' }
      ]
    },
    lastUpdated: new Date().toISOString()
  })
};

async function seedCollections() {
  // First get all product IDs from DB
  const products = await db.listDocuments(DB_ID, 'products');
  const prodMap = {};
  products.documents.forEach(p => {
    prodMap[p.slug] = p.$id;
    // Also index by name keywords
    prodMap[p.name.toLowerCase()] = p.$id;
  });

  const allProductIds = products.documents.map(p => p.$id);

  // Map collection slugs to product IDs
  const collectionProductMap = {
    'new-drop': allProductIds,
    'pawan-kalyan': [],
    'mahesh-babu': products.documents.filter(p => {
      const t = `${p.name} ${(p.badges || []).join(' ')}`.toLowerCase();
      return t.includes('mahesh') || t.includes('ssmb') || t.includes('superstar') || t.includes('pokiri');
    }).map(p => p.$id),
    'prabhas': products.documents.filter(p => {
      const t = `${p.name} ${(p.badges || []).join(' ')}`.toLowerCase();
      return t.includes('prabhas') || t.includes('rebel star') || t.includes('darling') || t.includes('raja saab');
    }).map(p => p.$id),
    'allu-arjun': products.documents.filter(p => {
      const t = `${p.name} ${(p.badges || []).join(' ')}`.toLowerCase();
      return t.includes('allu') || t.includes('pushpa') || t.includes('icon star') || t.includes('aa rule');
    }).map(p => p.$id),
    'ram-charan': [],
    'ntr': [],
    't-shirts': products.documents.filter(p => p.categoryId === 'c1' || p.categoryId === 'tees').map(p => p.$id),
    'best-sellers': products.documents.filter(p => p.stock > 0).map(p => p.$id),
  };

  // If t-shirts matched nothing, use all
  if (collectionProductMap['t-shirts'].length === 0) {
    collectionProductMap['t-shirts'] = allProductIds;
  }

  for (const col of COLLECTIONS_DATA) {
    const pIds = collectionProductMap[col.slug] || [];
    try {
      await db.createDocument(DB_ID, 'collections', ID.unique(), {
        name: col.name,
        slug: col.slug,
        description: col.description,
        productIds: pIds,
      });
      console.log(`✅ Collection: ${col.name} (${pIds.length} products)`);
    } catch (e) {
      console.log(`❌ Collection ${col.name}: ${e.message}`);
    }
  }
}

async function seedCategories() {
  for (const cat of CATEGORIES) {
    try {
      await db.createDocument(DB_ID, 'categories', ID.unique(), {
        name: cat.name,
        slug: cat.slug,
      });
      console.log(`✅ Category: ${cat.name}`);
    } catch (e) {
      console.log(`❌ Category ${cat.name}: ${e.message}`);
    }
  }
}

async function seedHomepage() {
  try {
    await db.createDocument(DB_ID, 'homepage_sections', 'homepage_config', HOMEPAGE_CONFIG);
    console.log('✅ Homepage config seeded');
  } catch (e) {
    console.log(`❌ Homepage config: ${e.message}`);
  }
}

async function main() {
  console.log('🌱 Seeding ClapCulture Database...\n');

  console.log('--- Categories ---');
  await seedCategories();

  console.log('\n--- Collections ---');
  await seedCollections();

  console.log('\n--- Homepage Config ---');
  await seedHomepage();

  console.log('\n🎉 Seeding complete!');
}

main().catch(console.error);
