/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  HomepageCMSData, 
  HomepageSectionConfig, 
  TileBanner, 
  HeroSlide, 
  DEFAULT_HOMEPAGE_CMS, 
  useHomepageCMS,
  SectionType
} from '@/lib/cms-store';
import { resolveImageUrl } from '@/lib/utils';
import { useProducts } from '@/lib/use-api-data';

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

const IMAGE_PRESETS = [
  { label: 'Allu Arjun (Appwrite WebP)', url: '6a7fa5f5002dd6861328' },
  { label: 'Mahesh Babu (Appwrite WebP)', url: '6a7fa5f700082ba1bbc3' },
  { label: 'Pawan Kalyan (Appwrite WebP)', url: '6a7fa5f80010fcd2bc85' },
  { label: 'Prabhas (Appwrite WebP)', url: '6a7fa5fb001234ea8799' },
  { label: 'Ram Charan (Appwrite WebP)', url: '6a7fa5ff00162b33637d' },
  { label: 'Jr NTR (Appwrite WebP)', url: '6a7fa6010011985f8642' },
  { label: 'Hero 1 (Black Graphic)', url: '6a7fa922002c9b023447' },
  { label: 'Hero 2 (Vintage Grunge)', url: '6a7fa926003c73611eef' },
  { label: 'Hero 3 (Neon Street)', url: '6a7fa92b001fdc8fc236' },
  { label: 'Mobile Banner', url: '6a7fa92400303d551b68' },
  { label: 'Superstar Tee Mockup 1', url: 'superstar-mockup1' },
  { label: 'Superstar Tee Mockup 2', url: 'superstar-mockup2' },
  { label: 'Pokiri Tee Mockup', url: 'pokiri-mock1' },
  { label: 'Darling Tee Mockup', url: 'darling-mockup1' },
  { label: 'Pushpa 2 Tee Mockup', url: 'aa-mockup5' },
  { label: 'AA Rule Mockup', url: 'aa-mockup1' },
  { label: 'Panjaa Logo', url: '6a803f110015ee9020b5' },
];

const SYSTEM_ROUTE_GROUPS = [
  {
    group: 'Garment Categories',
    routes: [
      { label: 'Category: Tees (Graphic Blanks)', url: '/category/tees' },
      { label: 'Category: Outerwear (Hoodies & Fleece)', url: '/category/outerwear' },
      { label: 'Category: Bottoms (Cargo Utility)', url: '/category/bottoms' },
      { label: 'Category: Headwear (Caps & Snapbacks)', url: '/category/headwear' },
    ],
  },
  {
    group: 'Tollywood Star Collections',
    routes: [
      { label: 'Star: Pawan Kalyan (Power Star)', url: '/shop?star=pawan-kalyan' },
      { label: 'Star: Mahesh Babu (Superstar)', url: '/shop?mahesh-babu' },
      { label: 'Star: Prabhas (Rebel Star)', url: '/shop?star=prabhas' },
      { label: 'Star: Allu Arjun (Icon Star)', url: '/shop?star=allu-arjun' },
      { label: 'Star: Ram Charan (Global Star)', url: '/shop?star=ram-charan' },
      { label: 'Star: Jr NTR (Man of Masses)', url: '/shop?star=ntr' },
    ],
  },
  {
    group: 'Curated Drops & Collections',
    routes: [
      { label: 'All Collections Page', url: '/collections' },
      { label: 'Collection: New Drops', url: '/collections/new-drop' },
      { label: 'Collection: Best Sellers', url: '/collections/best-sellers' },
      { label: 'Collection: All T-Shirts', url: '/collections/t-shirts' },
    ],
  },
  {
    group: 'Store Pages',
    routes: [
      { label: 'Shop (All Products)', url: '/shop' },
      { label: 'About ClapCulture', url: '/about' },
      { label: 'Contact Us', url: '/contact' },
      { label: 'Track Order', url: '/track-order' },
      { label: 'FAQ', url: '/faq' },
    ],
  },
];

export default function HomepageCMSPage() {
  const { data, updateData, resetData } = useHomepageCMS();
  const { data: dbProducts } = useProducts();

  // `formBase.source` is the store snapshot the form was copied from; `formBase.copy` is that pristine copy
  const [formBase, setFormBase] = useState<{ source: HomepageCMSData; copy: HomepageCMSData }>(() => ({
    source: data,
    copy: JSON.parse(JSON.stringify(data)),
  }));
  const [formData, setFormData] = useState<HomepageCMSData>(formBase.copy);
  const isFormDirty = formData !== formBase.copy;
  if (data !== formBase.source && !isFormDirty) {
    // Store refreshed (e.g. server data arrived after mount) before any edits: re-copy so Save can't push stale content
    const copy: HomepageCMSData = JSON.parse(JSON.stringify(data));
    setFormBase({ source: data, copy });
    setFormData(copy);
  }
  // Newer content was loaded while this form has unsaved edits
  const hasNewerStoreData = isFormDirty && data !== formBase.source && data.lastUpdated !== formBase.source.lastUpdated;
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'hero' | 'sections' | 'newsletter'>('all');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    hero: true,
    'section-lineup': true,
    'section-star-collection': true,
    'section-featured-drops': true,
    'section-promo-bento': true,
    newsletter: false,
  });

  // Attached Product State for Card Editor
  const [attachedProductSlug, setAttachedProductSlug] = useState<string>('');

  // Tile Editor Modal State
  const [editingTile, setEditingTile] = useState<{
    sectionId: string;
    tile: TileBanner;
    isNew?: boolean;
  } | null>(null);

  // Hero Slide Editor Modal State
  const [editingSlide, setEditingSlide] = useState<{
    slide: HeroSlide;
    isNew?: boolean;
  } | null>(null);

  // New Section Modal State
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [newSectionType, setNewSectionType] = useState<SectionType>('custom_tiles');
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('');
  const [newSectionBadge, setNewSectionBadge] = useState('');
  const [newSectionLayout, setNewSectionLayout] = useState<'grid-4' | 'grid-3' | 'grid-2' | 'carousel' | 'bento'>('grid-4');

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState(false);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setTimeout(() => setToastMessage(null), isError ? 5000 : 3000);
  };

  const handleSaveAll = async () => {
    if (isSaving) return;
    if (
      hasNewerStoreData &&
      !confirm('The homepage was updated after you started editing. Saving will overwrite those newer changes with this form. Continue?')
    ) {
      return;
    }
    setIsSaving(true);
    const submitted = formData;
    const result = await updateData(submitted);
    setIsSaving(false);
    if (result.ok) {
      setFormBase({ source: result.data, copy: submitted });
      showToast('✨ Homepage changes saved successfully! Storefront updated in real-time.');
    } else {
      showToast(`Homepage NOT saved: ${result.error}`, true);
    }
  };

  const handleReset = async () => {
    if (isSaving) return;
    if (confirm('Are you sure you want to reset the homepage to the original curated default configuration? Any custom card banners will be restored.')) {
      setIsSaving(true);
      const result = await resetData();
      setIsSaving(false);
      if (result.ok) {
        const copy: HomepageCMSData = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE_CMS));
        setFormBase({ source: result.data, copy });
        setFormData(copy);
        showToast('🔄 Homepage reset to default configuration.');
      } else {
        showToast(`Homepage NOT reset: ${result.error}`, true);
      }
    }
  };

  const toggleSectionExpand = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Section level handlers
  const toggleSectionActive = (sectionId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === sectionId ? { ...sec, active: !sec.active } : sec
      )
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...formData.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;
    
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // reindex order
    newSections.forEach((s, idx) => { s.order = idx + 1; });
    setFormData(prev => ({ ...prev, sections: newSections }));
  };

  const deleteSection = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section and all of its card tiles?')) {
      setFormData(prev => ({
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId)
      }));
      showToast('Section deleted');
    }
  };

  // Tile level handlers
  const openAddTileModal = (sectionId: string) => {
    const newTile: TileBanner = {
      id: generateId('tile'),
      title: 'NEW CARD BANNER',
      subtitle: 'Custom subtitle description',
      tagline: 'EXCLUSIVE FIT',
      badge: 'NEW',
      badgeColor: 'lime',
      imageUrl: '6a7fa922002c9b023447',
      link: '/shop',
      ctaText: 'EXPLORE',
      aspectRatio: 'portrait',
      active: true,
      order: 999,
    };
    setAttachedProductSlug('');
    setEditingTile({ sectionId, tile: newTile, isNew: true });
  };

  const openEditTileModal = (sectionId: string, tile: TileBanner) => {
    // If tile link matches /product/slug, preselect attached product
    const matchedSlug = tile.link.startsWith('/product/') ? tile.link.replace('/product/', '') : '';
    setAttachedProductSlug(matchedSlug);
    setEditingTile({ sectionId, tile: JSON.parse(JSON.stringify(tile)), isNew: false });
  };

  const handleAttachProduct = (slug: string) => {
    setAttachedProductSlug(slug);
    if (!editingTile || !slug) return;
    const prod = dbProducts.find(
      (p) => p.slug === slug || (p.id || (p as unknown as Record<string, string>).$id) === slug
    );
    if (!prod) return;

    const isSoldOut = prod.stock <= 0;
    const badge = isSoldOut ? 'SOLD OUT' : (prod.badges?.[0] || 'IN STOCK');
    const badgeColor = isSoldOut ? 'crimson' : 'lime';

    setEditingTile({
      ...editingTile,
      tile: {
        ...editingTile.tile,
        title: prod.name,
        subtitle: prod.description ? (prod.description.length > 70 ? prod.description.slice(0, 70) + '...' : prod.description) : editingTile.tile.subtitle,
        link: `/product/${prod.slug}`,
        imageUrl: prod.images?.[0] || editingTile.tile.imageUrl,
        price: prod.price,
        compareAtPrice: prod.compareAtPrice || undefined,
        badge: badge,
        badgeColor: badgeColor as TileBanner['badgeColor'],
        ctaText: isSoldOut ? 'SOLD OUT' : 'SHOP NOW',
      }
    });
    showToast(`✨ Attached "${prod.name}" - details & route auto-filled!`);
  };

  const handleSaveTileModal = () => {
    if (!editingTile) return;
    const { sectionId, tile, isNew } = editingTile;

    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        if (isNew) {
          return { ...sec, tiles: [...sec.tiles, { ...tile, order: sec.tiles.length + 1 }] };
        } else {
          return {
            ...sec,
            tiles: sec.tiles.map(t => t.id === tile.id ? tile : t)
          };
        }
      })
    }));

    setEditingTile(null);
    showToast(`Tile "${tile.title}" updated.`);
  };

  const duplicateTile = (sectionId: string, tile: TileBanner) => {
    const dup: TileBanner = {
      ...JSON.parse(JSON.stringify(tile)),
      id: generateId('tile'),
      title: `${tile.title} (Copy)`,
      order: tile.order + 1,
    };

    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        return { ...sec, tiles: [...sec.tiles, dup] };
      })
    }));
    showToast(`Duplicated "${tile.title}"`);
  };

  const deleteTile = (sectionId: string, tileId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        return { ...sec, tiles: sec.tiles.filter(t => t.id !== tileId) };
      })
    }));
    showToast('Tile removed');
  };

  const toggleTileActive = (sectionId: string, tileId: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          tiles: sec.tiles.map(t => t.id === tileId ? { ...t, active: !t.active } : t)
        };
      })
    }));
  };

  const moveTile = (sectionId: string, tileIndex: number, direction: 'left' | 'right') => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        const newTiles = [...sec.tiles];
        const targetIndex = direction === 'left' ? tileIndex - 1 : tileIndex + 1;
        if (targetIndex < 0 || targetIndex >= newTiles.length) return sec;
        const temp = newTiles[tileIndex];
        newTiles[tileIndex] = newTiles[targetIndex];
        newTiles[targetIndex] = temp;
        newTiles.forEach((t, idx) => { t.order = idx + 1; });
        return { ...sec, tiles: newTiles };
      })
    }));
  };

  // Add New Section
  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) {
      alert('Please enter a section title');
      return;
    }

    const newSection: HomepageSectionConfig = {
      id: generateId('section-custom'),
      type: newSectionType,
      title: newSectionTitle,
      subtitle: newSectionSubtitle || 'CUSTOM COLLECTION',
      badge: newSectionBadge || 'NEW SECTION',
      viewAllText: 'VIEW ALL',
      viewAllLink: '/shop',
      layoutStyle: newSectionLayout,
      active: true,
      order: formData.sections.length + 1,
      tiles: [
        {
          id: generateId('tile'),
          title: 'BANNER TILE 1',
          subtitle: 'Featured showcase fit',
          tagline: 'SPECIAL DROP',
          badge: 'FEATURED',
          badgeColor: 'lime',
          imageUrl: '6a7fa922002c9b023447',
          link: '/shop',
          ctaText: 'EXPLORE',
          aspectRatio: newSectionType === 'star_collection' ? 'tall' : 'portrait',
          active: true,
          order: 1,
        },
        {
          id: generateId('tile'),
          title: 'BANNER TILE 2',
          subtitle: 'Heavyweight graphic series',
          tagline: 'PREMIUM QUALITY',
          badge: 'NEW',
          badgeColor: 'cyan',
          imageUrl: '6a7fa926003c73611eef',
          link: '/shop',
          ctaText: 'EXPLORE',
          aspectRatio: newSectionType === 'star_collection' ? 'tall' : 'portrait',
          active: true,
          order: 2,
        }
      ]
    };

    setFormData(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));

    setExpandedSections(prev => ({ ...prev, [newSection.id]: true }));
    setIsAddSectionModalOpen(false);
    setNewSectionTitle('');
    setNewSectionSubtitle('');
    setNewSectionBadge('');
    showToast(`Created section "${newSection.title}"`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-8 right-8 z-100 bg-[#141414] border-2 ${toastIsError ? 'border-red-500' : 'border-[#d2f000]'} text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5`}>
          <span className={`material-symbols-outlined ${toastIsError ? 'text-red-400' : 'text-[#d2f000]'}`}>{toastIsError ? 'error' : 'check_circle'}</span>
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 pb-6 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Homepage CMS & Tile Customizer</h1>
            <span className="bg-[#d2f000]/10 text-[#d2f000] border border-[#d2f000]/30 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold">
              DYNAMIC LIVE
            </span>
          </div>
          <p className="text-[#a3a3a3] text-sm mt-1">
            Customize banner cards for any tile (Star Collections, Lineup, Featured Drops, Hero, Promo Bento, Custom Sections). All storefront sections update dynamically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="border border-[#333] hover:border-white text-[#d4d4d4] hover:text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-[#141414]"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Preview Storefront
          </Link>

          <button
            onClick={handleReset}
            disabled={isSaving}
            className="disabled:opacity-50 border border-red-500/30 hover:border-red-500 text-red-400 hover:text-red-300 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 bg-red-950/20"
            title="Reset to default curated configuration"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            Reset Defaults
          </button>

          <button
            onClick={() => setIsAddSectionModalOpen(true)}
            className="border border-[#262626] hover:border-[#d2f000] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 bg-[#1a1a1a]"
          >
            <span className="material-symbols-outlined text-[18px] text-[#d2f000]">add_circle</span>
            Add Section
          </button>

          <button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="bg-[#d2f000] text-black hover:bg-[#b8d400] font-bold px-6 py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-[#d2f000]/20 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-wait"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 border-b border-[#1f1f1f]">
        {[
          { id: 'all', label: 'All Sections & Tiles', icon: 'dashboard' },
          { id: 'hero', label: 'Hero Slides & Side Banner', icon: 'view_carousel' },
          { id: 'sections', label: 'Tile & Card Sections', icon: 'grid_view' },
          { id: 'newsletter', label: 'Newsletter & Stats', icon: 'mark_email_read' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'all' | 'hero' | 'sections' | 'newsletter')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#d2f000] text-black font-bold shadow-md shadow-[#d2f000]/10'
                : 'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. HERO SLIDES & SIDE BANNER SECTION */}
      {/* ────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'hero') && (
        <div className="mb-8 bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 flex items-center justify-between bg-soft-charcoal border-b border-[#262626]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#d2f000]">image</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">Hero Slideshow & Right Side Banner</h2>
                  <span className="bg-[#262626] text-[10px] text-[#a3a3a3] px-2 py-0.5 rounded font-mono uppercase">
                    HERO BANNER
                  </span>
                </div>
                <p className="text-xs text-[#737373] mt-0.5">Customize main slideshow banners, badges, text, links, and side banner tile.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-[#1f1f1f] px-3 py-1.5 rounded-lg border border-[#2e2e2e]">
                <input
                  type="checkbox"
                  checked={formData.hero.active}
                  onChange={(e) => setFormData({ ...formData, hero: { ...formData.hero, active: e.target.checked } })}
                  className="accent-[#d2f000] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-white">
                  {formData.hero.active ? 'Section Active' : 'Hidden on Storefront'}
                </span>
              </label>

              <button
                onClick={() => toggleSectionExpand('hero')}
                className="p-1.5 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">
                  {expandedSections['hero'] ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
          </div>

          {expandedSections['hero'] && (
            <div className="p-6 space-y-8">
              {/* Slides Grid */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#d2f000]">slideshow</span>
                    Hero Slides ({formData.hero.slides.length})
                  </h3>
                  <button
                    onClick={() => {
                      const newSlide: HeroSlide = {
                        id: generateId('slide'),
                        badge: 'NEW DROP',
                        titleLine1: 'NEW ERA',
                        titleLine2: 'STREET FIT',
                        subtitle: 'CLAP CULTURE',
                        description: 'Custom tailored bio-washed oversized blanks.',
                        primaryCtaText: 'SHOP NOW',
                        primaryCtaLink: '/shop',
                        secondaryCtaText: 'COLLECTIONS',
                        secondaryCtaLink: '/collections',
                        desktopImage: '6a7fa922002c9b023447',
                        mobileImage: '6a7fa92400303d551b68',
                        active: true
                      };
                      setEditingSlide({ slide: newSlide, isNew: true });
                    }}
                    className="bg-[#1f1f1f] hover:bg-[#262626] text-[#d2f000] border border-[#2e2e2e] hover:border-[#d2f000] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Slide
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.hero.slides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="group relative bg-[#1a1a1a] border border-[#262626] hover:border-[#d2f000]/50 rounded-xl overflow-hidden flex flex-col transition-all shadow-md"
                    >
                      {/* Slide Image Preview */}
                      <div className="relative aspect-video bg-black overflow-hidden">
                        <img
                          src={resolveImageUrl(slide.desktopImage)}
                          alt={slide.titleLine1}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent"></div>
                        <span className="absolute top-2 left-2 bg-[#d2f000] text-black font-bold text-[9px] px-2 py-0.5 rounded font-mono">
                          {slide.badge || `SLIDE ${idx + 1}`}
                        </span>
                        <div className="absolute bottom-2 left-3 right-3">
                          <p className="text-white font-black text-sm uppercase leading-tight">{slide.titleLine1} {slide.titleLine2}</p>
                          <p className="text-[#d2f000] font-mono text-[10px] truncate">{slide.subtitle}</p>
                        </div>
                      </div>

                      {/* Card Content & Actions */}
                      <div className="p-3 bg-[#171717] flex items-center justify-between border-t border-[#262626]">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${slide.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-500'}`}>
                          {slide.active ? 'Active' : 'Disabled'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingSlide({ slide: JSON.parse(JSON.stringify(slide)), isNew: false })}
                            className="p-1.5 hover:bg-[#262626] rounded text-[#d2f000] hover:text-white transition-colors"
                            title="Edit Slide"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this slide?')) {
                                setFormData({
                                  ...formData,
                                  hero: {
                                    ...formData.hero,
                                    slides: formData.hero.slides.filter(s => s.id !== slide.id)
                                  }
                                });
                                showToast('Slide deleted');
                              }
                            }}
                            className="p-1.5 hover:bg-red-950/40 rounded text-red-400 transition-colors"
                            title="Delete Slide"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Side Banner Tile Customizer */}
              <div className="border-t border-[#262626] pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-[#d2f000]">view_sidebar</span>
                      Hero Right Side Banner Tile
                    </h3>
                    <p className="text-xs text-[#737373]">Featured highlight card banner located on the right side of the main hero.</p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer bg-[#1a1a1a] px-3 py-1.5 rounded-lg border border-[#2e2e2e]">
                    <input
                      type="checkbox"
                      checked={formData.hero.sideBanner.active}
                      onChange={(e) => setFormData({
                        ...formData,
                        hero: {
                          ...formData.hero,
                          sideBanner: { ...formData.hero.sideBanner, active: e.target.checked }
                        }
                      })}
                      className="accent-[#d2f000] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-white">
                      {formData.hero.sideBanner.active ? 'Side Banner Active' : 'Hidden'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#171717] p-5 rounded-xl border border-[#262626]">
                  {/* Live Visual Preview of Side Banner */}
                  <div className="relative aspect-3/4 bg-black rounded-lg overflow-hidden border border-[#333] flex flex-col justify-between p-4 shadow-lg">
                    <img
                      src={resolveImageUrl(formData.hero.sideBanner.imageUrl || '6a7fa922002c9b023447')}
                      alt="Side Banner"
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black via-black/50 to-transparent"></div>
                    <div className="relative z-10">
                      <span className="bg-[#d2f000] text-black font-mono font-bold text-[9px] px-2 py-0.5 uppercase">
                        {formData.hero.sideBanner.badge || 'BADGE'}
                      </span>
                    </div>
                    <div className="relative z-10">
                      <h4 className="font-bold text-lg text-white uppercase leading-snug">{formData.hero.sideBanner.title || 'BANNER TITLE'}</h4>
                      <p className="text-[11px] text-[#a3a3a3] mt-1 line-clamp-2">{formData.hero.sideBanner.description}</p>
                      <div className="mt-3 text-[11px] font-bold text-[#d2f000] flex items-center gap-1 uppercase">
                        {formData.hero.sideBanner.ctaText || 'SHOP NOW'}
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </div>
                    </div>
                  </div>

                  {/* Form Inputs for Side Banner */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Banner Badge</label>
                        <input
                          type="text"
                          value={formData.hero.sideBanner.badge}
                          onChange={(e) => setFormData({
                            ...formData,
                            hero: {
                              ...formData.hero,
                              sideBanner: { ...formData.hero.sideBanner, badge: e.target.value }
                            }
                          })}
                          className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Banner Title</label>
                        <input
                          type="text"
                          value={formData.hero.sideBanner.title}
                          onChange={(e) => setFormData({
                            ...formData,
                            hero: {
                              ...formData.hero,
                              sideBanner: { ...formData.hero.sideBanner, title: e.target.value }
                            }
                          })}
                          className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={formData.hero.sideBanner.description}
                        onChange={(e) => setFormData({
                          ...formData,
                          hero: {
                            ...formData.hero,
                            sideBanner: { ...formData.hero.sideBanner, description: e.target.value }
                          }
                        })}
                        className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Banner Image URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.hero.sideBanner.imageUrl}
                          onChange={(e) => setFormData({
                            ...formData,
                            hero: {
                              ...formData.hero,
                              sideBanner: { ...formData.hero.sideBanner, imageUrl: e.target.value }
                            }
                          })}
                          className="flex-1 bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                        />
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              setFormData({
                                ...formData,
                                hero: {
                                  ...formData.hero,
                                  sideBanner: { ...formData.hero.sideBanner, imageUrl: e.target.value }
                                }
                              });
                            }
                          }}
                          className="bg-[#1f1f1f] border border-[#2e2e2e] text-[#d2f000] text-xs px-2.5 py-2 rounded-lg outline-none cursor-pointer"
                        >
                          <option value="">Presets</option>
                          {IMAGE_PRESETS.map((p, i) => (
                            <option key={i} value={p.url}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Link URL</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.hero.sideBanner.link}
                            onChange={(e) => setFormData({
                              ...formData,
                              hero: {
                                ...formData.hero,
                                sideBanner: { ...formData.hero.sideBanner, link: e.target.value }
                              }
                            })}
                            className="flex-1 bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                          />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                setFormData({
                                  ...formData,
                                  hero: {
                                    ...formData.hero,
                                    sideBanner: { ...formData.hero.sideBanner, link: e.target.value }
                                  }
                                });
                              }
                            }}
                            className="bg-[#1f1f1f] border border-[#2e2e2e] text-[#d2f000] text-xs px-2.5 py-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="">Routes</option>
                            {SYSTEM_ROUTE_GROUPS.map((group) => (
                              <optgroup key={group.group} label={group.group}>
                                {group.routes.map((r, i) => (
                                  <option key={i} value={r.url}>{r.label}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-[#a3a3a3] mb-1">CTA Button Text</label>
                        <input
                          type="text"
                          value={formData.hero.sideBanner.ctaText}
                          onChange={(e) => setFormData({
                            ...formData,
                            hero: {
                              ...formData.hero,
                              sideBanner: { ...formData.hero.sideBanner, ctaText: e.target.value }
                            }
                          })}
                          className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. DYNAMIC HOMEPAGE SECTIONS & CARD BANNER TILES */}
      {/* ────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'sections') && (
        <div className="space-y-6">
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#d2f000]">grid_view</span>
                Homepage Tile & Card Banner Sections ({formData.sections.length})
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Every tile banner in each section is 100% customizable. Customize star collections, lineups, feature drops, promo bentos, and custom tile grids.
              </p>
            </div>

            <button
              onClick={() => setIsAddSectionModalOpen(true)}
              className="bg-[#1f1f1f] hover:bg-[#262626] text-[#d2f000] border border-[#2e2e2e] hover:border-[#d2f000] text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_box</span>
              Add New Section
            </button>
          </div>

          {formData.sections.map((section, secIndex) => (
            <div
              key={section.id}
              className={`bg-[#141414] border ${section.active ? 'border-[#262626]' : 'border-zinc-800 opacity-70'} rounded-xl overflow-hidden shadow-xl transition-all`}
            >
              {/* Section Header Bar */}
              <div className="p-4 md:p-5 flex flex-wrap items-center justify-between gap-4 bg-soft-charcoal border-b border-[#262626]">
                <div className="flex items-center gap-3 flex-1 min-w-70">
                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSection(secIndex, 'up')}
                      disabled={secIndex === 0}
                      className="p-1 hover:bg-[#262626] text-[#737373] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent rounded"
                      title="Move Section Up"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                    </button>
                    <button
                      onClick={() => moveSection(secIndex, 'down')}
                      disabled={secIndex === formData.sections.length - 1}
                      className="p-1 hover:bg-[#262626] text-[#737373] hover:text-white disabled:opacity-20 disabled:hover:bg-transparent rounded"
                      title="Move Section Down"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                    </button>
                  </div>

                  {/* Section Title & Type */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-[#d2f000]/10 text-[#d2f000] border border-[#d2f000]/30 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                        {section.type.replace('_', ' ')}
                      </span>
                      <h3 className="text-base font-bold text-white">{section.title}</h3>
                      <span className="text-xs text-[#737373]">({section.tiles.length} cards)</span>
                    </div>
                    <p className="text-xs text-[#a3a3a3] mt-0.5 font-mono">{section.subtitle || 'Custom Collection'}</p>
                  </div>
                </div>

                {/* Section Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Layout Selector */}
                  <select
                    value={section.layoutStyle || 'grid-4'}
                    onChange={(e) => {
                      const newSecs = [...formData.sections];
                      newSecs[secIndex].layoutStyle = e.target.value as 'grid-4' | 'grid-3' | 'grid-2' | 'carousel' | 'bento';
                      setFormData({ ...formData, sections: newSecs });
                    }}
                    className="bg-[#111] border border-[#2e2e2e] text-xs text-[#d2f000] px-2.5 py-1.5 rounded-lg outline-none"
                    title="Layout Style"
                  >
                    <option value="grid-4">4 Columns Grid</option>
                    <option value="grid-3">3 Columns Grid</option>
                    <option value="grid-2">2 Columns Grid</option>
                    <option value="carousel">Horizontal Carousel</option>
                    <option value="bento">Bento Grid</option>
                  </select>

                  {/* Add Tile Button */}
                  <button
                    onClick={() => openAddTileModal(section.id)}
                    className="bg-[#1f1f1f] hover:bg-[#262626] text-[#d2f000] border border-[#2e2e2e] hover:border-[#d2f000] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Add Card Banner
                  </button>

                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer bg-[#1f1f1f] px-3 py-1.5 rounded-lg border border-[#2e2e2e]">
                    <input
                      type="checkbox"
                      checked={section.active}
                      onChange={() => toggleSectionActive(section.id)}
                      className="accent-[#d2f000] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-white">
                      {section.active ? 'Active' : 'Hidden'}
                    </span>
                  </label>

                  {/* Delete Section */}
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="p-1.5 hover:bg-red-950/40 rounded text-red-400 transition-colors"
                    title="Delete Section"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>

                  {/* Expand / Collapse */}
                  <button
                    onClick={() => toggleSectionExpand(section.id)}
                    className="p-1.5 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined">
                      {expandedSections[section.id] ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Section Body */}
              {expandedSections[section.id] && (
                <div className="p-6 space-y-6">
                  {/* Section Meta Config Header Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#111] p-4 rounded-xl border border-[#262626]">
                    <div>
                      <label className="block text-[11px] font-mono text-[#a3a3a3] mb-1">Section Heading Title</label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => {
                          const newSecs = [...formData.sections];
                          newSecs[secIndex].title = e.target.value;
                          setFormData({ ...formData, sections: newSecs });
                        }}
                        className="w-full bg-[#1a1a1a] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#a3a3a3] mb-1">Section Top Badge / Subtitle</label>
                      <input
                        type="text"
                        value={section.subtitle || ''}
                        onChange={(e) => {
                          const newSecs = [...formData.sections];
                          newSecs[secIndex].subtitle = e.target.value;
                          setFormData({ ...formData, sections: newSecs });
                        }}
                        className="w-full bg-[#1a1a1a] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#a3a3a3] mb-1">&quot;View All&quot; Button Text</label>
                      <input
                        type="text"
                        value={section.viewAllText || ''}
                        onChange={(e) => {
                          const newSecs = [...formData.sections];
                          newSecs[secIndex].viewAllText = e.target.value;
                          setFormData({ ...formData, sections: newSecs });
                        }}
                        className="w-full bg-[#1a1a1a] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-[#a3a3a3] mb-1">&quot;View All&quot; Link Destination</label>
                      <input
                        type="text"
                        value={section.viewAllLink || ''}
                        onChange={(e) => {
                          const newSecs = [...formData.sections];
                          newSecs[secIndex].viewAllLink = e.target.value;
                          setFormData({ ...formData, sections: newSecs });
                        }}
                        className="w-full bg-[#1a1a1a] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Card Banners / Tiles Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-mono font-bold text-[#a3a3a3] uppercase tracking-wider">
                        Configured Card Banners & Tiles ({section.tiles.length})
                      </h4>
                      <p className="text-[11px] text-[#737373]">
                        Click &quot;Edit&quot; on any tile to customize its banner image, badge, text, and link.
                      </p>
                    </div>

                    {section.tiles.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-[#262626] rounded-xl text-center">
                        <span className="material-symbols-outlined text-4xl text-[#737373] mb-2">style</span>
                        <p className="text-sm text-[#a3a3a3]">No card banners in this section.</p>
                        <button
                          onClick={() => openAddTileModal(section.id)}
                          className="mt-3 bg-[#d2f000] text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-[#b8d400] transition-colors inline-flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Add First Card Banner
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {section.tiles.map((tile, tileIdx) => (
                          <div
                            key={tile.id}
                            className={`group relative bg-[#171717] border ${tile.active ? 'border-[#262626] hover:border-[#d2f000]' : 'border-zinc-800 opacity-60'} rounded-xl overflow-hidden flex flex-col transition-all shadow-md`}
                          >
                            {/* Card Banner Visual Preview */}
                            <div className="relative aspect-4/5 bg-black overflow-hidden flex flex-col justify-between p-3.5">
                              <img
                                src={resolveImageUrl(tile.imageUrl || '6a7fa922002c9b023447')}
                                alt={tile.title}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70"
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent"></div>

                              {/* Top Badge & Status */}
                              <div className="relative z-10 flex items-start justify-between">
                                {tile.badge ? (
                                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                                    tile.badgeColor === 'amber' ? 'bg-amber-400 text-black' :
                                    tile.badgeColor === 'cyan' ? 'bg-cyan-400 text-black' :
                                    tile.badgeColor === 'purple' ? 'bg-purple-500 text-white' :
                                    tile.badgeColor === 'crimson' ? 'bg-rose-600 text-white' :
                                    tile.badgeColor === 'white' ? 'bg-white text-black' :
                                    'bg-[#d2f000] text-black'
                                  }`}>
                                    {tile.badge}
                                  </span>
                                ) : <span />}

                                <button
                                  onClick={() => toggleTileActive(section.id, tile.id)}
                                  className={`text-[9px] font-mono px-2 py-0.5 rounded cursor-pointer ${tile.active ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700' : 'bg-zinc-800 text-zinc-400'}`}
                                  title="Toggle active"
                                >
                                  {tile.active ? 'Visible' : 'Hidden'}
                                </button>
                              </div>

                              {/* Bottom Info */}
                              <div className="relative z-10">
                                {tile.tagline && (
                                  <p className="text-[10px] text-[#d2f000] font-mono font-semibold tracking-wider uppercase truncate">
                                    {tile.tagline}
                                  </p>
                                )}
                                <h4 className="text-white font-bold text-sm md:text-base uppercase leading-tight line-clamp-2 mt-0.5">
                                  {tile.title}
                                </h4>
                                {tile.subtitle && (
                                  <p className="text-[11px] text-[#a3a3a3] line-clamp-1 mt-0.5">
                                    {tile.subtitle}
                                  </p>
                                )}
                                {tile.price !== undefined && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[#d2f000] font-bold text-xs font-mono">₹{tile.price}</span>
                                    {tile.compareAtPrice && (
                                      <span className="text-zinc-500 line-through text-[10px] font-mono">₹{tile.compareAtPrice}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card Footer Bar with Actions */}
                            <div className="p-3 bg-[#111] border-t border-[#262626] flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => moveTile(section.id, tileIdx, 'left')}
                                  disabled={tileIdx === 0}
                                  className="p-1 hover:bg-[#262626] text-[#737373] hover:text-white disabled:opacity-20 rounded"
                                  title="Move Left"
                                >
                                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                </button>
                                <button
                                  onClick={() => moveTile(section.id, tileIdx, 'right')}
                                  disabled={tileIdx === section.tiles.length - 1}
                                  className="p-1 hover:bg-[#262626] text-[#737373] hover:text-white disabled:opacity-20 rounded"
                                  title="Move Right"
                                >
                                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                </button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => duplicateTile(section.id, tile)}
                                  className="p-1.5 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-white transition-colors"
                                  title="Duplicate Card"
                                >
                                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                </button>
                                <button
                                  onClick={() => openEditTileModal(section.id, tile)}
                                  className="px-2.5 py-1 bg-[#1f1f1f] hover:bg-[#262626] text-[#d2f000] text-xs font-bold rounded flex items-center gap-1 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                  Edit
                                </button>
                                <button
                                  onClick={() => deleteTile(section.id, tile.id)}
                                  className="p-1.5 hover:bg-red-950/40 rounded text-red-400 transition-colors"
                                  title="Delete Card"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Quick Add Card Button inside grid */}
                        <button
                          onClick={() => openAddTileModal(section.id)}
                          className="aspect-4/5 border-2 border-dashed border-[#262626] hover:border-[#d2f000] rounded-xl flex flex-col items-center justify-center p-6 text-center hover:bg-[#141414] transition-all cursor-pointer group"
                        >
                          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] group-hover:bg-[#d2f000] group-hover:text-black text-[#d2f000] flex items-center justify-center transition-all mb-2">
                            <span className="material-symbols-outlined text-2xl">add</span>
                          </div>
                          <span className="text-xs font-bold text-white group-hover:text-[#d2f000] uppercase">
                            Add New Card
                          </span>
                          <span className="text-[10px] text-[#737373] mt-1 font-mono">
                            Tile Banner for {section.title}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. NEWSLETTER & STATS CONFIGURATION */}
      {/* ────────────────────────────────────────────────────────── */}
      {(activeTab === 'all' || activeTab === 'newsletter') && (
        <div className="mt-8 bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 flex items-center justify-between bg-soft-charcoal border-b border-[#262626]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#d2f000]">mark_email_read</span>
              <div>
                <h2 className="text-lg font-bold text-white">Newsletter Banner & Social Proof Stats</h2>
                <p className="text-xs text-[#737373]">Customize bottom call-to-action subscription banner and customer metrics.</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer bg-[#1f1f1f] px-3 py-1.5 rounded-lg border border-[#2e2e2e]">
                <input
                  type="checkbox"
                  checked={formData.newsletter.active}
                  onChange={(e) => setFormData({ ...formData, newsletter: { ...formData.newsletter, active: e.target.checked } })}
                  className="accent-[#d2f000] w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-white">
                  {formData.newsletter.active ? 'Section Active' : 'Hidden'}
                </span>
              </label>

              <button
                onClick={() => toggleSectionExpand('newsletter')}
                className="p-1.5 hover:bg-[#262626] rounded text-[#a3a3a3] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">
                  {expandedSections['newsletter'] ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
          </div>

          {expandedSections['newsletter'] && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Headline</label>
                  <input
                    type="text"
                    value={formData.newsletter.title}
                    onChange={(e) => setFormData({
                      ...formData,
                      newsletter: { ...formData.newsletter, title: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={formData.newsletter.subtitle}
                    onChange={(e) => setFormData({
                      ...formData,
                      newsletter: { ...formData.newsletter, subtitle: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Badge</label>
                  <input
                    type="text"
                    value={formData.newsletter.badge}
                    onChange={(e) => setFormData({
                      ...formData,
                      newsletter: { ...formData.newsletter, badge: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Stats Config */}
              <div className="border-t border-[#262626] pt-4">
                <h4 className="text-xs font-mono font-bold text-[#a3a3a3] uppercase mb-3">Proof Metric Columns</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formData.newsletter.stats.map((stat, i) => (
                    <div key={i} className="bg-[#111] p-4 rounded-xl border border-[#262626] space-y-2">
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500">Metric Value</label>
                        <input
                          type="text"
                          value={stat.value}
                          onChange={(e) => {
                            const newStats = [...formData.newsletter.stats];
                            newStats[i].value = e.target.value;
                            setFormData({
                              ...formData,
                              newsletter: { ...formData.newsletter, stats: newStats }
                            });
                          }}
                          className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-zinc-500">Metric Label</label>
                        <input
                          type="text"
                          value={stat.label}
                          onChange={(e) => {
                            const newStats = [...formData.newsletter.stats];
                            newStats[i].label = e.target.value;
                            setFormData({
                              ...formData,
                              newsletter: { ...formData.newsletter, stats: newStats }
                            });
                          }}
                          className="w-full bg-[#1a1a1a] border border-[#2e2e2e] rounded px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 1: TILE & CARD BANNER CUSTOMIZER MODAL */}
      {/* ────────────────────────────────────────────────────────── */}
      {editingTile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-[#333] rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#d2f000] text-2xl">style</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingTile.isNew ? 'Create New Card Banner Tile' : 'Customize Card Banner Tile'}
                  </h3>
                  <p className="text-xs text-[#737373]">
                    Customize image, title, badge, tags, target link, and appearance for this card.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingTile(null)}
                className="p-2 text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Live Card Preview */}
              <div className="md:col-span-5 flex flex-col items-center">
                <span className="text-xs font-mono text-[#a3a3a3] mb-2 self-start uppercase">Live Card Preview</span>
                <div className="w-full relative aspect-4/5 bg-black rounded-xl overflow-hidden border border-[#333] flex flex-col justify-between p-5 shadow-2xl">
                  <img
                    src={editingTile.tile.imageUrl || '6a7fa922002c9b023447'}
                    alt="Preview"
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-transparent"></div>

                  <div className="relative z-10 flex justify-between items-start">
                    {editingTile.tile.badge ? (
                      <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded uppercase ${
                        editingTile.tile.badgeColor === 'amber' ? 'bg-amber-400 text-black' :
                        editingTile.tile.badgeColor === 'cyan' ? 'bg-cyan-400 text-black' :
                        editingTile.tile.badgeColor === 'purple' ? 'bg-purple-500 text-white' :
                        editingTile.tile.badgeColor === 'crimson' ? 'bg-rose-600 text-white' :
                        editingTile.tile.badgeColor === 'white' ? 'bg-white text-black' :
                        'bg-[#d2f000] text-black'
                      }`}>
                        {editingTile.tile.badge}
                      </span>
                    ) : <span />}

                    <span className="material-symbols-outlined text-white text-xl">arrow_outward</span>
                  </div>

                  <div className="relative z-10">
                    {editingTile.tile.tagline && (
                      <span className="text-[10px] text-[#d2f000] font-mono tracking-widest uppercase block mb-1">
                        {editingTile.tile.tagline}
                      </span>
                    )}
                    <h4 className="text-white font-bold text-xl md:text-2xl uppercase leading-tight">
                      {editingTile.tile.title || 'CARD TITLE'}
                    </h4>
                    {editingTile.tile.subtitle && (
                      <p className="text-xs text-zinc-300 mt-1 line-clamp-2">
                        {editingTile.tile.subtitle}
                      </p>
                    )}
                    {editingTile.tile.price !== undefined && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[#d2f000] font-bold text-sm font-mono">₹{editingTile.tile.price}</span>
                        {editingTile.tile.compareAtPrice && (
                          <span className="text-zinc-400 line-through text-xs font-mono">₹{editingTile.tile.compareAtPrice}</span>
                        )}
                      </div>
                    )}
                    {editingTile.tile.ctaText && (
                      <div className="mt-3 inline-block bg-white text-black font-bold text-[10px] px-3 py-1.5 uppercase tracking-wider">
                        {editingTile.tile.ctaText}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Customization Fields */}
              <div className="md:col-span-7 space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {/* 🏷️ ATTACH A PRODUCT (OPTIONAL AUTO-FILL & ROUTE) */}
                <div className="bg-linear-to-r from-[#1b2207] to-[#121212] border border-[#d2f000]/40 rounded-xl p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-[#d2f000]">shopping_bag</span>
                      <label className="text-xs font-bold font-mono text-[#d2f000] uppercase tracking-wider">
                        Attach Existing Product (Auto-Fills Details & Route)
                      </label>
                    </div>
                    {attachedProductSlug && (
                      <button
                        type="button"
                        onClick={() => setAttachedProductSlug('')}
                        className="text-[10px] text-zinc-400 hover:text-red-400 font-mono underline"
                      >
                        Clear Attachment
                      </button>
                    )}
                  </div>

                  <select
                    value={attachedProductSlug}
                    onChange={(e) => handleAttachProduct(e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#2e2e2e] focus:border-[#d2f000] text-white text-xs px-3 py-2.5 rounded-lg outline-none cursor-pointer font-mono"
                  >
                    <option value="">-- Choose a Product from Catalog --</option>
                    {dbProducts.map((prod) => {
                      const isSoldOut = prod.stock <= 0;
                      return (
                        <option key={prod.id || prod.slug} value={prod.slug}>
                          {prod.name} (₹{prod.price}) — {isSoldOut ? '🔴 SOLD OUT' : `🟢 ${prod.stock} in stock`}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-zinc-400">
                    Selecting a product automatically sets the destination route to <span className="text-[#d2f000] font-mono">/product/[slug]</span> and fills title, price, badges & photos.
                  </p>
                </div>

                {/* Title & Tagline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Headline / Star / Category Name *</label>
                    <input
                      type="text"
                      value={editingTile.tile.title}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, title: e.target.value }
                      })}
                      className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="e.g. Pawan Kalyan, Tees, Neon Cargo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Tagline / Era (Top Tag)</label>
                    <input
                      type="text"
                      value={editingTile.tile.tagline || ''}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, tagline: e.target.value }
                      })}
                      className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="e.g. SENANI & OG ERA FITS"
                    />
                  </div>
                </div>

                {/* Subtitle / Description */}
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Subtitle / Description</label>
                  <input
                    type="text"
                    value={editingTile.tile.subtitle || ''}
                    onChange={(e) => setEditingTile({
                      ...editingTile,
                      tile: { ...editingTile.tile, subtitle: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                    placeholder="e.g. Heavyweight graphic blanks, 100% bio-washed cotton"
                  />
                </div>

                {/* Badge Text & Badge Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={editingTile.tile.badge || ''}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, badge: e.target.value }
                      })}
                      className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="e.g. 12 DROPS, NEW, HOT, LIMITED"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Badge Color Theme</label>
                    <select
                      value={editingTile.tile.badgeColor || 'lime'}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, badgeColor: e.target.value as TileBanner['badgeColor'] }
                      })}
                      className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="lime">Electric Lime (Default)</option>
                      <option value="amber">Amber / Gold</option>
                      <option value="cyan">Cyber Cyan</option>
                      <option value="purple">Neon Purple</option>
                      <option value="crimson">Crimson Red</option>
                      <option value="white">Clean White</option>
                      <option value="dark">Stealth Dark</option>
                    </select>
                  </div>
                </div>

                {/* Banner Image URL + Presets */}
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Banner Image URL *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingTile.tile.imageUrl}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, imageUrl: e.target.value }
                      })}
                      className="flex-1 bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="https://... or /herobg1-desktop.png"
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditingTile({
                            ...editingTile,
                            tile: { ...editingTile.tile, imageUrl: e.target.value }
                          });
                        }
                      }}
                      className="bg-[#1f1f1f] border border-[#2e2e2e] text-[#d2f000] text-xs px-2.5 py-2 rounded-lg outline-none cursor-pointer font-mono"
                    >
                      <option value="">Quick Presets</option>
                      {IMAGE_PRESETS.map((p, i) => (
                        <option key={i} value={p.url}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Link URL + Smart Route Picker */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-mono text-[#a3a3a3]">
                      Target Link / Route *
                    </label>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {editingTile.tile.link.startsWith('/product/') ? '🛍️ Product Route' : '🌐 System / Custom Route'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={editingTile.tile.link}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, link: e.target.value }
                      })}
                      className="flex-1 bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white font-mono outline-none"
                      placeholder="e.g. /product/superstar-mahesh-babu-oversized-tee or /category/tees"
                    />
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setEditingTile({
                            ...editingTile,
                            tile: { ...editingTile.tile, link: e.target.value }
                          });
                        }
                      }}
                      className="bg-[#1f1f1f] border border-[#2e2e2e] text-[#d2f000] text-xs px-2.5 py-2 rounded-lg outline-none cursor-pointer font-mono max-w-xs"
                    >
                      <option value="">-- Choose Existing Route --</option>
                      {dbProducts.length > 0 && (
                        <optgroup label="🛍️ Products in Catalog">
                          {dbProducts.map((p) => (
                            <option key={p.id || p.slug} value={`/product/${p.slug}`}>
                              Product: {p.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {SYSTEM_ROUTE_GROUPS.map((group) => (
                        <optgroup key={group.group} label={group.group}>
                          {group.routes.map((r, i) => (
                            <option key={i} value={r.url}>{r.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Price & Compare Price (Optional) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Price (₹) (Optional)</label>
                    <input
                      type="number"
                      value={editingTile.tile.price || ''}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, price: e.target.value ? Number(e.target.value) : undefined }
                      })}
                      className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="e.g. 1499"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Compare At Price (₹)</label>
                    <input
                      type="number"
                      value={editingTile.tile.compareAtPrice || ''}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, compareAtPrice: e.target.value ? Number(e.target.value) : undefined }
                      })}
                      className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="e.g. 1999"
                    />
                  </div>
                </div>

                {/* CTA Text & Active State */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-mono text-[#a3a3a3] mb-1">CTA Button Text</label>
                    <input
                      type="text"
                      value={editingTile.tile.ctaText || ''}
                      onChange={(e) => setEditingTile({
                        ...editingTile,
                        tile: { ...editingTile.tile, ctaText: e.target.value }
                      })}
                      className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="e.g. SHOP NOW, QUICK ADD, EXPLORE"
                    />
                  </div>

                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer bg-[#1a1a1a] p-2.5 rounded-lg border border-[#2e2e2e] w-full">
                      <input
                        type="checkbox"
                        checked={editingTile.tile.active}
                        onChange={(e) => setEditingTile({
                          ...editingTile,
                          tile: { ...editingTile.tile, active: e.target.checked }
                        })}
                        className="accent-[#d2f000] w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-white">
                        {editingTile.tile.active ? 'Card Active on Storefront' : 'Hidden on Storefront'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
              <button
                onClick={() => setEditingTile(null)}
                className="px-4 py-2 text-sm text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTileModal}
                className="bg-[#d2f000] text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-[#b8d400] transition-colors"
              >
                Apply Tile Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 2: HERO SLIDE CUSTOMIZER MODAL */}
      {/* ────────────────────────────────────────────────────────── */}
      {editingSlide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-[#333] rounded-2xl max-w-3xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#d2f000] text-2xl">slideshow</span>
                <h3 className="text-lg font-bold text-white">
                  {editingSlide.isNew ? 'Add Hero Slideshow Banner' : 'Edit Hero Slideshow Banner'}
                </h3>
              </div>
              <button
                onClick={() => setEditingSlide(null)}
                className="p-2 text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Headline Line 1</label>
                  <input
                    type="text"
                    value={editingSlide.slide.titleLine1}
                    onChange={(e) => setEditingSlide({
                      ...editingSlide,
                      slide: { ...editingSlide.slide, titleLine1: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                    placeholder="e.g. BORN TO"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Headline Line 2</label>
                  <input
                    type="text"
                    value={editingSlide.slide.titleLine2}
                    onChange={(e) => setEditingSlide({
                      ...editingSlide,
                      slide: { ...editingSlide.slide, titleLine2: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                    placeholder="e.g. STAND OUT"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Brand Highlight Subtitle</label>
                  <input
                    type="text"
                    value={editingSlide.slide.subtitle}
                    onChange={(e) => setEditingSlide({
                      ...editingSlide,
                      slide: { ...editingSlide.slide, subtitle: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                    placeholder="e.g. CLAP CULTURE"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Top Badge</label>
                  <input
                    type="text"
                    value={editingSlide.slide.badge}
                    onChange={(e) => setEditingSlide({
                      ...editingSlide,
                      slide: { ...editingSlide.slide, badge: e.target.value }
                    })}
                    className="w-full bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                    placeholder="e.g. NEW DROP LIVE"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingSlide.slide.description}
                  onChange={(e) => setEditingSlide({
                    ...editingSlide,
                    slide: { ...editingSlide.slide, description: e.target.value }
                  })}
                  className="w-full bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Desktop Background Image</label>
                <input
                  type="text"
                  value={editingSlide.slide.desktopImage}
                  onChange={(e) => setEditingSlide({
                    ...editingSlide,
                    slide: { ...editingSlide.slide, desktopImage: e.target.value }
                  })}
                  className="w-full bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                  placeholder="/herobg1-desktop.png"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Primary CTA Text & Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingSlide.slide.primaryCtaText}
                      onChange={(e) => setEditingSlide({
                        ...editingSlide,
                        slide: { ...editingSlide.slide, primaryCtaText: e.target.value }
                      })}
                      className="w-1/2 bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="SHOP NOW"
                    />
                    <input
                      type="text"
                      value={editingSlide.slide.primaryCtaLink}
                      onChange={(e) => setEditingSlide({
                        ...editingSlide,
                        slide: { ...editingSlide.slide, primaryCtaLink: e.target.value }
                      })}
                      className="w-1/2 bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="/shop"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Secondary CTA Text & Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingSlide.slide.secondaryCtaText || ''}
                      onChange={(e) => setEditingSlide({
                        ...editingSlide,
                        slide: { ...editingSlide.slide, secondaryCtaText: e.target.value }
                      })}
                      className="w-1/2 bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="COLLECTIONS"
                    />
                    <input
                      type="text"
                      value={editingSlide.slide.secondaryCtaLink || ''}
                      onChange={(e) => setEditingSlide({
                        ...editingSlide,
                        slide: { ...editingSlide.slide, secondaryCtaLink: e.target.value }
                      })}
                      className="w-1/2 bg-[#111] border border-[#2e2e2e] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      placeholder="/collections"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
              <button
                onClick={() => setEditingSlide(null)}
                className="px-4 py-2 text-sm text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const { slide, isNew } = editingSlide;
                  const finalizedSlide = {
                    ...slide,
                    mobileImage: slide.desktopImage || slide.mobileImage
                  };
                  setFormData(prev => ({
                    ...prev,
                    hero: {
                      ...prev.hero,
                      slides: isNew 
                        ? [...prev.hero.slides, finalizedSlide]
                        : prev.hero.slides.map(s => s.id === slide.id ? finalizedSlide : s)
                    }
                  }));
                  setEditingSlide(null);
                  showToast('Slide updated');
                }}
                className="bg-[#d2f000] text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-[#b8d400]"
              >
                Save Slide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* MODAL 3: CREATE NEW CUSTOM SECTION MODAL */}
      {/* ────────────────────────────────────────────────────────── */}
      {isAddSectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#141414] border border-[#333] rounded-2xl max-w-xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#d2f000] text-2xl">add_box</span>
                <h3 className="text-lg font-bold text-white">Add New Homepage Section</h3>
              </div>
              <button
                onClick={() => setIsAddSectionModalOpen(false)}
                className="p-2 text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Section Type</label>
                <select
                  value={newSectionType}
                  onChange={(e) => setNewSectionType(e.target.value as SectionType)}
                  className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="custom_tiles">Custom Tiles / Cards Section</option>
                  <option value="star_collection">Star Collection (Hero Edition Cards)</option>
                  <option value="lineup">Lineup / Categories Showcase</option>
                  <option value="featured_drops">Featured Product Drops Carousel</option>
                  <option value="promo_bento">Promotional Bento Cards</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Section Heading Title *</label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                  placeholder="e.g. SUMMER FESTIVAL DROPS, CELEB PICKS"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Subtitle / Tag</label>
                  <input
                    type="text"
                    value={newSectionSubtitle}
                    onChange={(e) => setNewSectionSubtitle(e.target.value)}
                    className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                    placeholder="e.g. LIMITED EDITION"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#a3a3a3] mb-1">Grid Layout Style</label>
                  <select
                    value={newSectionLayout}
                    onChange={(e) => setNewSectionLayout(e.target.value as 'grid-4' | 'grid-3' | 'grid-2' | 'carousel' | 'bento')}
                    className="w-full bg-[#111] border border-[#2e2e2e] focus:border-[#d2f000] rounded-lg px-3 py-2 text-sm text-white outline-none"
                  >
                    <option value="grid-4">4 Columns Grid</option>
                    <option value="grid-3">3 Columns Grid</option>
                    <option value="grid-2">2 Columns Grid</option>
                    <option value="carousel">Horizontal Carousel</option>
                    <option value="bento">Bento Grid</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#262626]">
              <button
                onClick={() => setIsAddSectionModalOpen(false)}
                className="px-4 py-2 text-sm text-[#a3a3a3] hover:text-white rounded-lg hover:bg-[#262626]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSection}
                className="bg-[#d2f000] text-black font-bold px-6 py-2 rounded-lg text-sm hover:bg-[#b8d400]"
              >
                Create Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}