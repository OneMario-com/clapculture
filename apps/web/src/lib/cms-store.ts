'use client';

import { useSyncExternalStore } from 'react';
import { getBootstrapHomepage, setBootstrapHomepage, subscribeToBootstrap } from './use-api-data';

export type AspectRatioType = 'portrait' | 'tall' | 'square' | 'landscape' | 'banner' | 'wide';

export interface TileBanner {
  id: string;
  title: string;
  subtitle?: string;
  tagline?: string;
  badge?: string;
  badgeColor?: 'lime' | 'amber' | 'cyan' | 'purple' | 'crimson' | 'white' | 'dark';
  imageUrl: string;
  link: string;
  ctaText?: string;
  price?: number;
  compareAtPrice?: number;
  aspectRatio?: AspectRatioType;
  active: boolean;
  order: number;
}

export interface HeroSlide {
  id: string;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  description: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  desktopImage: string;
  mobileImage: string;
  active: boolean;
}

export interface HeroSideBanner {
  active: boolean;
  badge: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  ctaText: string;
}

export type SectionType = 'lineup' | 'star_collection' | 'featured_drops' | 'promo_bento' | 'custom_tiles';

export interface HomepageSectionConfig {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  badge?: string;
  viewAllText?: string;
  viewAllLink?: string;
  layoutStyle?: 'grid-4' | 'grid-3' | 'grid-2' | 'carousel' | 'bento';
  active: boolean;
  order: number;
  tiles: TileBanner[];
}

export interface NewsletterConfig {
  active: boolean;
  title: string;
  subtitle: string;
  badge: string;
  stats: Array<{ value: string; label: string; highlight?: string }>;
}

export interface HomepageCMSData {
  hero: {
    active: boolean;
    slides: HeroSlide[];
    sideBanner: HeroSideBanner;
  };
  sections: HomepageSectionConfig[];
  newsletter: NewsletterConfig;
  lastUpdated: string;
}

export const DEFAULT_HOMEPAGE_CMS: HomepageCMSData = {
  hero: {
    active: true,
    slides: [
      {
        id: 'slide-gjt7taw',
        badge: 'NEW DROP',
        titleLine1: 'PANJAA',
        titleLine2: 'THE NEW DROP',
        subtitle: 'CLAP CULTURE',
        description: 'A bold oversized hoodie made for the ones who wear their culture loud. Includes a surprise PANJAA keychain + wall poster with every order.',
        primaryCtaText: 'SHOP NOW',
        primaryCtaLink: '/product/panjaa-pawan-kalyan-graphic-oversized-hoodie-surprise-kit',
        secondaryCtaText: 'COLLECTIONS',
        secondaryCtaLink: '/collections',
        desktopImage: '6a803f110015ee9020b5',
        mobileImage: '6a803f110015ee9020b5',
        active: true,
      }
    ],
    sideBanner: {
      active: true,
      badge: 'TRENDING NOW',
      title: 'OVERSIZED COLLECTION',
      description: 'Heavyweight cotton blanks engineered for maximum comfort and durability.',
      imageUrl: '6a7fa922002c9b023447',
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
        {
          id: 'tile-cat-1',
          title: 'TEES',
          subtitle: 'Heavyweight graphic blanks',
          tagline: 'HEAVYWEIGHT 240 GSM',
          badge: 'BESTSELLER',
          badgeColor: 'lime',
          imageUrl: '6a7fa922002c9b023447',
          link: '/category/tees',
          ctaText: 'EXPLORE TEES',
          aspectRatio: 'portrait',
          active: true,
          order: 1,
        },
        {
          id: 'tile-cat-2',
          title: 'OUTERWEAR',
          subtitle: 'Fleece hoodies & jackets',
          tagline: 'PREMIUM 380 GSM FLEECE',
          badge: 'WINTER DROP',
          badgeColor: 'cyan',
          imageUrl: '6a7fa926003c73611eef',
          link: '/category/outerwear',
          ctaText: 'EXPLORE HOODIES',
          aspectRatio: 'portrait',
          active: true,
          order: 2,
        },
        {
          id: 'tile-cat-3',
          title: 'BOTTOMS',
          subtitle: 'Tactical cargo utility',
          tagline: 'MULTI-POCKET RELAXED',
          badge: 'TRENDING',
          badgeColor: 'amber',
          imageUrl: '6a7fa92b001fdc8fc236',
          link: '/category/bottoms',
          ctaText: 'EXPLORE CARGOS',
          aspectRatio: 'portrait',
          active: true,
          order: 3,
        },
        {
          id: 'tile-cat-4',
          title: 'HEADWEAR',
          subtitle: 'Snapbacks & caps',
          tagline: 'STRUCTURED FIT',
          badge: 'NEW',
          badgeColor: 'purple',
          imageUrl: '6a7fa92400303d551b68',
          link: '/category/headwear',
          ctaText: 'EXPLORE CAPS',
          aspectRatio: 'portrait',
          active: true,
          order: 4,
        }
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
        {
          id: 'tile-star-1',
          title: 'Pawan Kalyan',
          subtitle: 'Power Star Collection',
          tagline: 'SENANI & OG ERA FITS',
          badge: '12 DROPS',
          badgeColor: 'lime',
          imageUrl: '6a7fa5f80010fcd2bc85',
          link: '/shop?star=pawan-kalyan',
          ctaText: 'VIEW COLLECTION',
          aspectRatio: 'tall',
          active: true,
          order: 1,
        },
        {
          id: 'tile-star-2',
          title: 'Mahesh Babu',
          subtitle: 'Superstar Collection',
          tagline: 'PRINCE SLEEK STREETWEAR',
          badge: '10 DROPS',
          badgeColor: 'lime',
          imageUrl: '6a7fa5f700082ba1bbc3',
          link: '/shop?star=mahesh-babu',
          ctaText: 'VIEW COLLECTION',
          aspectRatio: 'tall',
          active: true,
          order: 2,
        },
        {
          id: 'tile-star-3',
          title: 'Prabhas',
          subtitle: 'Rebel Star Collection',
          tagline: 'REBEL STAR HEAVYWEIGHT FITS',
          badge: '14 DROPS',
          badgeColor: 'lime',
          imageUrl: '6a7fa5fb001234ea8799',
          link: '/shop?star=prabhas',
          ctaText: 'VIEW COLLECTION',
          aspectRatio: 'tall',
          active: true,
          order: 3,
        },
        {
          id: 'tile-star-4',
          title: 'Allu Arjun',
          subtitle: 'Icon Star Collection',
          tagline: 'ICON STAR PUSHPA EDITION',
          badge: '15 DROPS',
          badgeColor: 'lime',
          imageUrl: '6a7fa5f5002dd6861328',
          link: '/shop?star=allu-arjun',
          ctaText: 'VIEW COLLECTION',
          aspectRatio: 'tall',
          active: true,
          order: 4,
        },
        {
          id: 'tile-star-5',
          title: 'Ram Charan',
          subtitle: 'Global Star Collection',
          tagline: 'GLOBAL STAR GAME CHANGER',
          badge: '12 DROPS',
          badgeColor: 'lime',
          imageUrl: '6a7fa5ff00162b33637d',
          link: '/shop?star=ram-charan',
          ctaText: 'VIEW COLLECTION',
          aspectRatio: 'tall',
          active: true,
          order: 5,
        },
        {
          id: 'tile-star-6',
          title: 'Jr NTR',
          subtitle: 'Man of Masses Collection',
          tagline: 'MAN OF MASSES DEVARA',
          badge: '11 DROPS',
          badgeColor: 'lime',
          imageUrl: '6a7fa6010011985f8642',
          link: '/shop?star=ntr',
          ctaText: 'VIEW COLLECTION',
          aspectRatio: 'tall',
          active: true,
          order: 6,
        }
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
        {
          id: 'tile-drop-1',
          title: 'SUPERSTAR MAHESH BABU OVERSIZED TEE',
          subtitle: '320 GSM Heavyweight French Terry Cotton',
          badge: 'IN STOCK',
          badgeColor: 'lime',
          imageUrl: 'superstar-mockup1',
          link: '/product/superstar-mahesh-babu-oversized-tee',
          ctaText: 'SHOP NOW',
          price: 699,
          compareAtPrice: 1299,
          aspectRatio: 'portrait',
          active: true,
          order: 1,
        },
        {
          id: 'tile-drop-2',
          title: 'POKIRI ICONIC OVERSIZED TEE',
          subtitle: '320 GSM Heavyweight Bio-Washed Cotton',
          badge: 'SOLD OUT',
          badgeColor: 'crimson',
          imageUrl: 'pokiri-mock1',
          link: '/product/pokiri-iconic-oversized-tee',
          ctaText: 'SOLD OUT',
          price: 699,
          compareAtPrice: 1299,
          aspectRatio: 'portrait',
          active: true,
          order: 2,
        },
        {
          id: 'tile-drop-3',
          title: 'REBEL STAR DARLING OVERSIZED TEE',
          subtitle: '320 GSM Heavyweight Streetwear Fit',
          badge: 'SOLD OUT',
          badgeColor: 'crimson',
          imageUrl: 'darling-mockup1',
          link: '/product/rebel-star-darling-oversized-tee',
          ctaText: 'SOLD OUT',
          price: 699,
          compareAtPrice: 1299,
          aspectRatio: 'portrait',
          active: true,
          order: 3,
        },
        {
          id: 'tile-drop-4',
          title: 'ICON STAR AA RULE OVERSIZED TEE',
          subtitle: '320 GSM Heavyweight Drop-Shoulder Tee',
          badge: 'SOLD OUT',
          badgeColor: 'crimson',
          imageUrl: 'aa-mockup1',
          link: '/product/pushpa-the-rule-drop-shoulder-tee',
          ctaText: 'SOLD OUT',
          price: 699,
          compareAtPrice: 1299,
          aspectRatio: 'portrait',
          active: true,
          order: 4,
        }
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
        {
          id: 'tile-promo-1',
          title: 'HEAVYWEIGHT OVERSIZED ESSENTIALS',
          subtitle: 'Crafted with 280 GSM premium French terry and custom silicone badges.',
          tagline: 'PREMIUM LINE',
          badge: 'TRENDING',
          badgeColor: 'lime',
          imageUrl: '6a7fa926003c73611eef',
          link: '/shop',
          ctaText: 'EXPLORE DROP',
          aspectRatio: 'wide',
          active: true,
          order: 1,
        },
        {
          id: 'tile-promo-2',
          title: 'VINTAGE GRAPHIC SERIES',
          subtitle: 'Hand-distressed streetwear graphics inspired by 90s cinema posters.',
          tagline: 'LIMITED EDITION',
          badge: 'EXCLUSIVE',
          badgeColor: 'amber',
          imageUrl: '6a7fa92b001fdc8fc236',
          link: '/shop',
          ctaText: 'SHOP SERIES',
          aspectRatio: 'square',
          active: true,
          order: 2,
        },
        {
          id: 'tile-promo-3',
          title: 'TACTICAL ACCESSORIES',
          subtitle: 'Utility crossbody bags, embroidered snapbacks, and socks.',
          tagline: 'EVERYDAY FIT',
          badge: 'NEW ARRIVAL',
          badgeColor: 'cyan',
          imageUrl: '6a7fa922002c9b023447',
          link: '/shop',
          ctaText: 'VIEW ACCESSORIES',
          aspectRatio: 'square',
          active: true,
          order: 3,
        }
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
};

const STORAGE_KEY = 'cc_homepage_cms_v4';

export function getHomepageCMS(): HomepageCMSData {
  if (typeof window === 'undefined') return DEFAULT_HOMEPAGE_CMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOMEPAGE_CMS;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.sections || !Array.isArray(parsed.sections)) {
      return DEFAULT_HOMEPAGE_CMS;
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse Homepage CMS from localStorage', e);
    return DEFAULT_HOMEPAGE_CMS;
  }
}

export type HomepageCMSSaveResult =
  | { ok: true; data: HomepageCMSData }
  | { ok: false; error: string };

// PUT the homepage config to the API; the local copy is only updated once the server accepted it.
async function persistHomepageCMS(payload: HomepageCMSData): Promise<HomepageCMSSaveResult> {
  if (typeof window === 'undefined') return { ok: false, error: 'Not available on the server' };
  try {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const res = await fetch('/api/homepage', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      return { ok: false, error: json?.error || `Save failed (HTTP ${res.status})` };
    }
  } catch (err) {
    console.error('Database homepage save failed:', err);
    return { ok: false, error: 'Network error while saving homepage' };
  }

  currentCMSData = payload;
  lastSavedAt = Date.parse(payload.lastUpdated) || Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to cache Homepage CMS in localStorage', e);
  }
  // The cached bootstrap still holds the previous homepage; replace it so it can't be re-applied
  setBootstrapHomepage(payload as unknown as Record<string, unknown>);
  window.dispatchEvent(new Event('homepage-cms-updated'));
  return { ok: true, data: payload };
}

export function saveHomepageCMS(data: HomepageCMSData): Promise<HomepageCMSSaveResult> {
  return persistHomepageCMS({
    ...data,
    lastUpdated: new Date().toISOString()
  });
}

export function resetHomepageCMS(): Promise<HomepageCMSSaveResult> {
  // Stamped like any save so the reset copy counts as the newest one
  return saveHomepageCMS(DEFAULT_HOMEPAGE_CMS);
}

let currentCMSData: HomepageCMSData = DEFAULT_HOMEPAGE_CMS;
// lastUpdated (ms) of the copy this tab last saved; older bootstrap copies (e.g. from a CDN-cached
// /api/bootstrap) must not replace it
let lastSavedAt = 0;
if (typeof window !== 'undefined') {
  currentCMSData = getHomepageCMS();
}

function subscribeCMS(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handleUpdate = () => {
    currentCMSData = getHomepageCMS();
    callback();
  };
  window.addEventListener('homepage-cms-updated', handleUpdate);
  window.addEventListener('storage', handleUpdate);

  // Read homepage from bootstrap cache or listen to new API fetch
  const updateFromBootstrap = () => {
    const bootstrapHomepage = getBootstrapHomepage();
    if (bootstrapHomepage && (bootstrapHomepage as Record<string, unknown>).sections) {
      if (lastSavedAt && (Date.parse(String(bootstrapHomepage.lastUpdated || '')) || 0) < lastSavedAt) return;
      currentCMSData = bootstrapHomepage as unknown as HomepageCMSData;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bootstrapHomepage));
      } catch {}
      callback();
    }
  };

  updateFromBootstrap();
  const unsubscribeBootstrap = subscribeToBootstrap(updateFromBootstrap);

  return () => {
    window.removeEventListener('homepage-cms-updated', handleUpdate);
    window.removeEventListener('storage', handleUpdate);
    unsubscribeBootstrap();
  };
}

function getCMSSnapshot(): HomepageCMSData {
  return currentCMSData;
}

function getCMSServerSnapshot(): HomepageCMSData {
  return DEFAULT_HOMEPAGE_CMS;
}

const emptySubscribe = () => () => {};

export function useHomepageCMS() {
  const data = useSyncExternalStore(subscribeCMS, getCMSSnapshot, getCMSServerSnapshot);
  const isLoaded = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return {
    data,
    isLoaded,
    // Resolve with the server result so callers only report success when the save really persisted
    updateData: (newData: HomepageCMSData) => saveHomepageCMS(newData),
    resetData: () => resetHomepageCMS(),
  };
}
