/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PromoBar } from '@/components/layout/PromoBar';
import { useCart } from '@/components/cart/CartProvider';
import { useHomepageCMS } from '@/lib/cms-store';
import { useBootstrap } from '@/lib/use-api-data';
import { resolveImageUrl } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  useBootstrap(); // Trigger data fetch on mount to update CMS seamlessly
  const { data: cmsData } = useHomepageCMS();
  const [currentHeroSlideIndex, setCurrentHeroSlideIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const { addToCart } = useCart();

  // Newsletter Subscription state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [newsletterMsg, setNewsletterMsg] = useState('');

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) return;
    setNewsletterStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (data.success) {
        setNewsletterStatus('success');
        setNewsletterMsg(data.message || 'Subscribed! Check your inbox for your 10% discount code.');
        setNewsletterEmail('');
      } else {
        setNewsletterStatus('error');
        setNewsletterMsg(data.error || 'Failed to subscribe');
      }
    } catch {
      setNewsletterStatus('error');
      setNewsletterMsg('Network error. Please try again.');
    }
  };

  // Reference map for section horizontal carousels
  const carouselRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // Simulate page load progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setTimeout(() => setIsLoading(false), 400);
      }
      setProgress(Math.min(currentProgress, 100));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const activeHeroSlides = cmsData.hero.active
    ? cmsData.hero.slides.filter((slide) => slide.active)
    : [];

  useEffect(() => {
    if (activeHeroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentHeroSlideIndex((prev) => (prev + 1) % activeHeroSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [activeHeroSlides.length]);

  const currentSlide = activeHeroSlides[currentHeroSlideIndex] || activeHeroSlides[0];

  const scrollCarousel = (sectionId: string, direction: 'left' | 'right') => {
    const el = carouselRefs.current[sectionId];
    if (el) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'amber':
        return 'bg-amber-400 text-black';
      case 'cyan':
        return 'bg-cyan-400 text-black';
      case 'purple':
        return 'bg-purple-500 text-white';
      case 'crimson':
        return 'bg-rose-600 text-white';
      case 'white':
        return 'bg-white text-black';
      case 'dark':
        return 'bg-charcoal text-white border border-white/20';
      case 'lime':
      default:
        return 'bg-electric-lime text-deep-black';
    }
  };

  const activeSections = cmsData.sections
    .filter((sec) => sec.active && sec.tiles.some((tile) => tile.active))
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {/* PRELOADER */}
      <div
        className={`fixed inset-0 z-99999 bg-deep-black flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
          isLoading ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
      >
        <div className="relative text-4xl sm:text-5xl md:text-8xl lg:text-[120px] font-headline-xl uppercase tracking-widest text-center px-4 select-none">
          {/* Base Text (Outline) */}
          <div className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.1)' }}>
            CLAPCULTURE
          </div>

          {/* Liquid Fill Text */}
          <div
            className="absolute top-0 left-0 w-full text-center text-electric-lime transition-all duration-300 ease-out overflow-hidden"
            style={{ clipPath: `inset(calc(100% - ${progress}%) 0 0 0)` }}
          >
            CLAPCULTURE
          </div>
        </div>

        <div className="mt-8 text-electric-lime font-headline-md text-2xl tracking-widest">
          {Math.round(progress)}%
        </div>

        <div className="absolute bottom-8 text-[10px] md:text-xs font-label-caps tracking-[0.3em] text-gray-500 uppercase text-center w-full">
          Design and developed by{' '}
          <a
            href="https://onemario.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-electric-lime hover:underline font-bold"
          >
            One Mario
          </a>
        </div>
      </div>

      {/* MAIN DYNAMIC STOREFRONT CONTENT */}
      <div
        className={`min-h-screen bg-deep-black text-white font-body-sm flex flex-col w-full max-w-[100vw] overflow-x-hidden transition-opacity duration-1000 delay-200 ${
          isLoading ? 'opacity-0 h-screen overflow-hidden' : 'opacity-100'
        }`}
      >
        {/* 1. TOP PROMO BAR */}
        <PromoBar />

        {/* 2. TOP NAVBAR */}
        <Header />

        {/* 3. DYNAMIC HERO SECTION */}
        {cmsData.hero.active && activeHeroSlides.length > 0 && (
          <section className="grid grid-cols-1 lg:grid-cols-12 min-h-[85vh] border-b border-charcoal">
            {/* Left main hero slide (8 cols or 12 cols if side banner disabled) */}
            <div
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('a') || target.closest('.hero-thumb')) return;
                router.push(currentSlide?.primaryCtaLink || '/shop');
              }}
              className={`${
                cmsData.hero.sideBanner.active ? 'lg:col-span-8' : 'lg:col-span-12'
              } relative flex flex-col justify-center p-6 md:p-12 xl:p-16 2xl:p-24 overflow-hidden min-h-[60vh] lg:min-h-0 bg-charcoal cursor-pointer group`}
            >
              {/* Slideshow background layers */}
              {activeHeroSlides.map((slide, sIdx) => (
                <React.Fragment key={slide.id}>
                  {/* Mobile Image */}
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out lg:hidden ${
                      currentHeroSlideIndex === sIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    style={{ backgroundImage: `url('${resolveImageUrl(slide.mobileImage || slide.desktopImage)}')` }}
                  />
                  {/* Desktop Image */}
                  <div
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out hidden lg:block ${
                      currentHeroSlideIndex === sIdx ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                    style={{ backgroundImage: `url('${resolveImageUrl(slide.desktopImage)}')` }}
                  />
                </React.Fragment>
              ))}

              <div className="absolute inset-0 bg-linear-to-r from-deep-black/90 md:from-deep-black/80 to-transparent"></div>

              {/* Slide Content */}
              {currentSlide && (
                <div className="relative z-10 max-w-2xl 2xl:max-w-4xl mt-12 md:mt-0 animate-in fade-in duration-500">
                  {currentSlide.badge && (
                    <div className="inline-block bg-electric-lime text-deep-black font-label-caps text-[10px] md:text-xs px-2.5 py-1 mb-4 md:mb-6 rounded-sm uppercase font-bold tracking-wider">
                      {currentSlide.badge}
                    </div>
                  )}

                  <h1 className="text-4xl sm:text-5xl md:text-8xl lg:text-[120px] 2xl:text-[160px] font-hero-lg leading-none uppercase mb-2 overflow-hidden text-ellipsis group-hover:text-white">
                    {currentSlide.titleLine1} <br />
                    {currentSlide.titleLine2}
                  </h1>

                  {currentSlide.subtitle && (
                    <div
                      className="text-4xl sm:text-5xl md:text-6xl lg:text-[80px] 2xl:text-[100px] font-headline-xl text-transparent mb-4 md:mb-6 tracking-wide"
                      style={{ WebkitTextStroke: '1.5px #b0ff00' }}
                    >
                      {currentSlide.subtitle}
                    </div>
                  )}

                  {currentSlide.description && (
                    <p className="text-sm md:text-base 2xl:text-xl text-gray-300 mb-6 md:mb-8 max-w-70 md:max-w-md 2xl:max-w-xl">
                      {currentSlide.description}
                    </p>
                  )}

                  <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                    <Link
                      href={currentSlide.primaryCtaLink || '/shop'}
                      prefetch={false}
                      className="bg-electric-lime text-deep-black font-label-caps text-xs md:text-sm px-6 md:px-8 py-3 md:py-4 uppercase font-bold tracking-wider hover:bg-white transition-colors cursor-pointer"
                    >
                      {currentSlide.primaryCtaText || 'SHOP NOW'}
                    </Link>

                    {currentSlide.secondaryCtaText && (
                      <Link
                        href={currentSlide.secondaryCtaLink || '/collections'}
                        prefetch={false}
                        className="border border-white text-white font-label-caps text-xs md:text-sm px-6 md:px-8 py-3 md:py-4 uppercase tracking-wider hover:border-electric-lime hover:text-electric-lime transition-colors cursor-pointer"
                      >
                        {currentSlide.secondaryCtaText}
                      </Link>
                    )}
                  </div>

                  {/* Social proof stat badge */}
                  <div className="flex items-center gap-4 mt-10 p-3 bg-black/40 backdrop-blur-md rounded-xl border border-gray-800 w-fit">
                    <div className="flex -space-x-3">
                      <img
                        src="/happyfan1.webp"
                        alt="Happy Fan 1"
                        className="w-10 h-10 rounded-full border-2 border-deep-black object-cover"
                      />
                      <img
                        src="/happyfan2.webp"
                        alt="Happy Fan 2"
                        className="w-10 h-10 rounded-full border-2 border-deep-black object-cover"
                      />
                      <img
                        src="/happyfan3.webp"
                        alt="Happy Fan 3"
                        className="w-10 h-10 rounded-full border-2 border-deep-black object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm flex items-center gap-1.5 font-label-caps">
                        <span className="text-electric-lime text-base font-extrabold">2,000+</span> HAPPY FANS
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400">
                        <span className="text-electric-lime font-bold">★★★★★</span> 4.9/5 RATING
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Thumbnails Navigator */}
              {activeHeroSlides.length > 1 && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-4 z-10 hero-thumb">
                  {activeHeroSlides.map((slide, sIdx) => (
                    <img
                      key={slide.id}
                      src={resolveImageUrl(slide.desktopImage)}
                      alt={`Slide ${sIdx + 1}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentHeroSlideIndex(sIdx);
                      }}
                      className={`w-20 h-24 object-cover border-2 transition-all cursor-pointer hover:opacity-100 hover:border-electric-lime hero-thumb ${
                        currentHeroSlideIndex === sIdx
                          ? 'border-electric-lime opacity-100 scale-105'
                          : 'border-transparent opacity-60'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Hero Side Banner Tile - Fully Clickable */}
            {cmsData.hero.sideBanner.active && (
              <Link
                href={cmsData.hero.sideBanner.link || '/category/tees'}
                prefetch={false}
                className="lg:col-span-4 relative bg-charcoal flex flex-col justify-between p-6 md:p-12 xl:p-16 border-t lg:border-t-0 lg:border-l border-charcoal overflow-hidden min-h-[40vh] lg:min-h-0 cursor-pointer group"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${resolveImageUrl(cmsData.hero.sideBanner.imageUrl || '/herobg1-desktop.png')}')` }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-deep-black via-deep-black/60 to-transparent"></div>

                <div className="relative z-10">
                  <span className="bg-electric-lime text-deep-black font-label-caps text-[10px] px-2 py-1 uppercase font-bold tracking-wider">
                    {cmsData.hero.sideBanner.badge || 'TRENDING NOW'}
                  </span>
                </div>

                <div className="relative z-10 mt-auto">
                  <h2 className="text-3xl md:text-5xl font-headline-xl uppercase text-white mb-2 leading-tight group-hover:text-electric-lime transition-colors">
                    {cmsData.hero.sideBanner.title}
                  </h2>
                  <p className="text-xs md:text-sm text-gray-300 mb-4 max-w-xs">
                    {cmsData.hero.sideBanner.description}
                  </p>
                  <div
                    className="font-label-caps text-xs text-electric-lime uppercase font-bold flex items-center gap-1 group-hover:underline"
                  >
                    {cmsData.hero.sideBanner.ctaText || 'SHOP OVERSIZED'}
                    <span className="material-symbols-outlined text-xs group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </Link>
            )}
          </section>
        )}

        {/* ────────────────────────────────────────────────────────── */}
        {/* 4. DYNAMIC HOMEPAGE SECTIONS (Whatever is created in Admin) */}
        {/* ────────────────────────────────────────────────────────── */}
        {activeSections.map((section) => {
          const activeTiles = section.tiles.filter((t) => t.active).sort((a, b) => a.order - b.order);
          if (activeTiles.length === 0) return null;

          // ── A. LINEUP / CATEGORY TILES SECTION ──
          if (section.type === 'lineup') {
            return (
              <section key={section.id} className="py-16 md:py-24 px-4 md:px-8 lg:px-12 2xl:px-16 bg-deep-black border-b border-charcoal">
                <div className="max-w-[3840px] mx-auto">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-4">
                    <div>
                      {section.subtitle && (
                        <span className="font-label-caps text-xs md:text-sm text-electric-lime tracking-widest uppercase">
                          {section.subtitle}
                        </span>
                      )}
                      <h2 className="text-3xl sm:text-4xl md:text-6xl 2xl:text-8xl font-headline-xl uppercase tracking-wider text-white mt-1">
                        {section.title}
                      </h2>
                    </div>
                    {section.viewAllText && (
                      <Link
                        href={section.viewAllLink || '/shop'}
                        prefetch={false}
                        className="font-label-caps text-xs md:text-sm text-gray-400 hover:text-electric-lime flex items-center gap-1 transition-colors group"
                      >
                        {section.viewAllText}{' '}
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                          arrow_forward
                        </span>
                      </Link>
                    )}
                  </div>

                  <div className={`grid ${
                    section.layoutStyle === 'grid-2' ? 'grid-cols-1 sm:grid-cols-2' :
                    section.layoutStyle === 'grid-3' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                    'grid-cols-2 lg:grid-cols-4'
                  } gap-4 md:gap-6`}>
                    {activeTiles.map((tile) => (
                      <Link
                        key={tile.id}
                        href={tile.link || '/shop'}
                        prefetch={false}
                        className="group relative aspect-3/4 bg-charcoal overflow-hidden border border-charcoal flex flex-col justify-between p-4 md:p-6"
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-700"
                          style={{ backgroundImage: `url('${resolveImageUrl(tile.imageUrl)}')` }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-deep-black via-deep-black/30 to-transparent"></div>

                        {/* Top badge if configured */}
                        <div className="relative z-10 flex justify-between items-start">
                          {tile.badge ? (
                            <span className={`font-label-caps text-[9px] md:text-[10px] px-2 py-0.5 font-bold uppercase rounded-sm ${getBadgeClass(tile.badgeColor)}`}>
                              {tile.badge}
                            </span>
                          ) : <span />}
                          <span className="material-symbols-outlined text-white text-lg opacity-0 group-hover:opacity-100 group-hover:text-electric-lime transition-all">
                            arrow_outward
                          </span>
                        </div>

                        <div className="relative z-10">
                          {tile.tagline && (
                            <span className="text-[10px] md:text-xs text-electric-lime font-label-caps tracking-widest block mb-1">
                              {tile.tagline}
                            </span>
                          )}
                          <h3 className="font-headline-md text-2xl md:text-3xl uppercase text-white group-hover:text-electric-lime transition-colors">
                            {tile.title}
                          </h3>
                          {tile.subtitle && (
                            <p className="text-xs text-gray-300 mt-1 line-clamp-1">{tile.subtitle}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // ── B. STAR COLLECTION HERO CARDS SECTION (Sliding Horizontal Carousel) ──
          if (section.type === 'star_collection') {
            return (
              <section key={section.id} className="py-16 md:py-24 px-4 md:px-8 lg:px-12 2xl:px-16 bg-charcoal/20 border-b border-charcoal">
                <div className="max-w-[3840px] mx-auto">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-4">
                    <div>
                      {section.subtitle && (
                        <span className="font-label-caps text-xs md:text-sm text-electric-lime tracking-widest uppercase">
                          {section.subtitle}
                        </span>
                      )}
                      <h2 className="text-4xl md:text-6xl 2xl:text-8xl font-headline-xl uppercase tracking-wider text-white mt-1">
                        {section.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-3">
                      {section.viewAllText && (
                        <Link
                          href={section.viewAllLink || '/shop'}
                          prefetch={false}
                          className="font-label-caps text-xs md:text-sm text-gray-400 hover:text-electric-lime flex items-center gap-1 transition-colors mr-2 group"
                        >
                          {section.viewAllText}{' '}
                          <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                            arrow_forward
                          </span>
                        </Link>
                      )}

                      {/* Carousel Arrow Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => scrollCarousel(section.id, 'left')}
                          className="w-10 h-10 md:w-12 md:h-12 border border-charcoal flex items-center justify-center hover:bg-electric-lime hover:text-black hover:border-electric-lime transition-colors"
                          aria-label="Scroll left"
                        >
                          <span className="material-symbols-outlined text-lg md:text-xl">arrow_back</span>
                        </button>
                        <button
                          onClick={() => scrollCarousel(section.id, 'right')}
                          className="w-10 h-10 md:w-12 md:h-12 border border-charcoal flex items-center justify-center hover:bg-electric-lime hover:text-black hover:border-electric-lime transition-colors"
                          aria-label="Scroll right"
                        >
                          <span className="material-symbols-outlined text-lg md:text-xl">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Row for all Heroes */}
                  <div
                    ref={(el) => {
                      carouselRefs.current[section.id] = el;
                    }}
                    className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-6 scroll-smooth"
                  >
                    {activeTiles.map((hero) => (
                      <Link
                        key={hero.id}
                        href={hero.link || '/shop'}
                        prefetch={false}
                        className="w-70 sm:w-80 lg:w-90 2xl:w-100 shrink-0 group relative aspect-4/5 bg-charcoal overflow-hidden border border-charcoal flex flex-col justify-between p-6 md:p-8 hover:border-electric-lime/50 hover:shadow-2xl hover:shadow-electric-lime/10 transition-all rounded-sm"
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-65 group-hover:scale-105 transition-transform duration-700"
                          style={{ backgroundImage: `url('${resolveImageUrl(hero.imageUrl)}')` }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-deep-black via-deep-black/40 to-transparent"></div>

                        <div className="relative z-10 flex justify-between items-start">
                          {hero.badge ? (
                            <span className={`font-label-caps text-[9px] md:text-[10px] px-2.5 py-0.5 font-bold uppercase rounded-sm ${getBadgeClass(hero.badgeColor)}`}>
                              {hero.badge}
                            </span>
                          ) : <span />}
                          <span className="material-symbols-outlined text-white text-2xl group-hover:text-electric-lime group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                            arrow_outward
                          </span>
                        </div>

                        <div className="relative z-10">
                          {hero.tagline && (
                            <span className="text-[10px] md:text-xs text-electric-lime font-label-caps tracking-widest block mb-1">
                              {hero.tagline}
                            </span>
                          )}
                          <h3 className="font-headline-xl text-3xl md:text-5xl uppercase text-white group-hover:text-electric-lime transition-colors leading-tight">
                            {hero.title}
                          </h3>
                          {hero.subtitle && (
                            <p className="text-xs text-gray-300 mt-1 line-clamp-1">{hero.subtitle}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // ── C. FEATURED DROPS CAROUSEL SECTION ──
          if (section.type === 'featured_drops') {
            return (
              <section key={section.id} className="py-16 md:py-24 px-4 md:px-8 lg:px-12 2xl:px-16 bg-charcoal/30 border-b border-charcoal">
                <div className="max-w-[3840px] mx-auto">
                  <div className="flex justify-between items-end mb-10 md:mb-16">
                    <div>
                      {section.subtitle && (
                        <span className="font-label-caps text-xs md:text-sm text-electric-lime tracking-widest uppercase">
                          {section.subtitle}
                        </span>
                      )}
                      <h2 className="text-4xl md:text-6xl 2xl:text-8xl font-headline-xl uppercase tracking-wider text-white mt-1">
                        {section.title}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                      <button
                        onClick={() => scrollCarousel(section.id, 'left')}
                        className="w-10 h-10 md:w-12 md:h-12 border border-charcoal flex items-center justify-center hover:bg-electric-lime hover:text-black hover:border-electric-lime transition-colors"
                        aria-label="Scroll left"
                      >
                        <span className="material-symbols-outlined text-lg md:text-xl">arrow_back</span>
                      </button>
                      <button
                        onClick={() => scrollCarousel(section.id, 'right')}
                        className="w-10 h-10 md:w-12 md:h-12 border border-charcoal flex items-center justify-center hover:bg-electric-lime hover:text-black hover:border-electric-lime transition-colors"
                        aria-label="Scroll right"
                      >
                        <span className="material-symbols-outlined text-lg md:text-xl">arrow_forward</span>
                      </button>
                    </div>
                  </div>

                  <div
                    ref={(el) => {
                      carouselRefs.current[section.id] = el;
                    }}
                    className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-6 scroll-smooth"
                  >
                    {activeTiles.map((product) => (
                      <div key={product.id} className="w-65 md:w-80 shrink-0 group">
                        <Link href={product.link || '/shop'} prefetch={false} className="block cursor-pointer">
                          <div className="relative aspect-3/4 bg-charcoal overflow-hidden border border-charcoal mb-4">
                            <img
                              src={resolveImageUrl(product.imageUrl)}
                              alt={product.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            {product.badge && (
                              <span className={`absolute top-3 left-3 font-label-caps text-[9px] md:text-[10px] px-2 py-0.5 font-bold uppercase rounded-sm ${getBadgeClass(product.badgeColor)}`}>
                                {product.badge}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart(
                                  {
                                    id: product.id,
                                    name: product.title,
                                    slug: product.link.replace('/product/', '') || 'drop-item',
                                    price: product.price || 1299,
                                    description: product.subtitle || '',
                                    images: [product.imageUrl],
                                    sizes: ['M'],
                                    stock: 10,
                                    categoryId: 'drops',
                                  },
                                  'M',
                                  1
                                );
                              }}
                              className="absolute bottom-3 left-3 right-3 bg-white text-black font-label-caps text-xs py-3 uppercase font-bold hover:bg-electric-lime transition-colors opacity-0 group-hover:opacity-100 cursor-pointer text-center z-10"
                            >
                              {product.ctaText || 'QUICK ADD'}
                            </button>
                          </div>
                          <div>
                            <h3 className="font-bold text-sm md:text-base text-white group-hover:text-electric-lime transition-colors truncate">
                              {product.title}
                            </h3>
                            {product.price !== undefined && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-electric-lime font-bold text-sm md:text-base">
                                  ₹{product.price}
                                </span>
                                {product.compareAtPrice && (
                                  <span className="text-gray-500 line-through text-xs md:text-sm">
                                    ₹{product.compareAtPrice}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          }

          // ── D. PROMO BENTO OR CUSTOM TILES SECTION ──
          return (
            <section key={section.id} className="py-16 md:py-24 px-4 md:px-8 lg:px-12 2xl:px-16 bg-deep-black border-b border-charcoal">
              <div className="max-w-[3840px] mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 md:mb-16 gap-4">
                  <div>
                    {section.subtitle && (
                      <span className="font-label-caps text-xs md:text-sm text-electric-lime tracking-widest uppercase">
                        {section.subtitle}
                      </span>
                    )}
                    <h2 className="text-4xl md:text-6xl 2xl:text-8xl font-headline-xl uppercase tracking-wider text-white mt-1">
                      {section.title}
                    </h2>
                  </div>
                  {section.viewAllText && (
                    <Link
                      href={section.viewAllLink || '/shop'}
                      prefetch={false}
                      className="font-label-caps text-xs md:text-sm text-gray-400 hover:text-electric-lime flex items-center gap-1 transition-colors group"
                    >
                      {section.viewAllText}{' '}
                      <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </Link>
                  )}
                </div>

                <div className={`grid ${
                  section.layoutStyle === 'bento' ? 'grid-cols-1 md:grid-cols-3' :
                  section.layoutStyle === 'grid-2' ? 'grid-cols-1 sm:grid-cols-2' :
                  section.layoutStyle === 'grid-3' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                } gap-6`}>
                  {activeTiles.map((tile, tIdx) => {
                    const isBentoWide = section.layoutStyle === 'bento' && tIdx === 0;
                    return (
                      <Link
                        key={tile.id}
                        href={tile.link || '/shop'}
                        prefetch={false}
                        className={`group relative ${
                          isBentoWide ? 'md:col-span-2 aspect-video md:aspect-auto min-h-80' : 'aspect-4/5 min-h-70'
                        } bg-charcoal overflow-hidden border border-charcoal flex flex-col justify-between p-6 md:p-8 hover:border-electric-lime/40 transition-all`}
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-700"
                          style={{ backgroundImage: `url('${resolveImageUrl(tile.imageUrl)}')` }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-deep-black via-deep-black/40 to-transparent"></div>

                        <div className="relative z-10 flex justify-between items-start">
                          {tile.badge ? (
                            <span className={`font-label-caps text-[9px] md:text-[10px] px-2.5 py-0.5 font-bold uppercase rounded-sm ${getBadgeClass(tile.badgeColor)}`}>
                              {tile.badge}
                            </span>
                          ) : <span />}
                          <span className="material-symbols-outlined text-white text-xl group-hover:text-electric-lime transition-colors">
                            arrow_outward
                          </span>
                        </div>

                        <div className="relative z-10">
                          {tile.tagline && (
                            <span className="text-[10px] md:text-xs text-electric-lime font-label-caps tracking-widest block mb-1">
                              {tile.tagline}
                            </span>
                          )}
                          <h3 className="font-headline-xl text-2xl md:text-4xl uppercase text-white group-hover:text-electric-lime transition-colors leading-tight">
                            {tile.title}
                          </h3>
                          {tile.subtitle && (
                            <p className="text-xs md:text-sm text-gray-300 mt-1 line-clamp-2 max-w-lg">
                              {tile.subtitle}
                            </p>
                          )}
                          {tile.ctaText && (
                            <div className="mt-4 font-label-caps text-xs text-electric-lime uppercase font-bold flex items-center gap-1 group-hover:underline">
                              {tile.ctaText}
                              <span className="material-symbols-outlined text-xs">arrow_forward</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}

        {/* ────────────────────────────────────────────────────────── */}
        {/* 5. DYNAMIC NEWSLETTER & SOCIAL PROOF SECTION */}
        {/* ────────────────────────────────────────────────────────── */}
        {cmsData.newsletter.active && (
          <section className="py-16 md:py-24 px-4 md:px-8 lg:px-12 2xl:px-16 bg-deep-black border-t border-charcoal flex flex-col items-center text-center w-full">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-2 md:mb-4">
              <h2 className="text-4xl sm:text-5xl md:text-7xl 2xl:text-[100px] font-headline-xl uppercase italic leading-none">
                {cmsData.newsletter.title || 'JOIN THE CULTURE'}
              </h2>
              <span className="material-symbols-outlined text-electric-lime text-3xl sm:text-4xl md:text-5xl 2xl:text-[80px]">
                energy_program_time
              </span>
            </div>
            <p className="text-xs sm:text-sm md:text-base 2xl:text-xl text-gray-400 mb-8 md:mb-10 max-w-sm md:max-w-md 2xl:max-w-2xl px-4">
              {cmsData.newsletter.subtitle}
            </p>

            <form onSubmit={handleSubscribe} className="w-full max-w-sm md:max-w-lg 2xl:max-w-2xl flex flex-col sm:flex-row gap-3 md:gap-4 mb-4">
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="ENTER YOUR EMAIL"
                disabled={newsletterStatus === 'loading'}
                className="flex-1 bg-transparent border border-charcoal text-white text-sm 2xl:text-lg px-4 md:px-6 py-3 md:py-4 focus:outline-none focus:border-electric-lime placeholder:text-gray-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={newsletterStatus === 'loading'}
                className="bg-electric-lime text-deep-black text-sm 2xl:text-lg font-bold uppercase tracking-wider px-6 md:px-8 py-3 md:py-4 hover:bg-white transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {newsletterStatus === 'loading' ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    JOINING...
                  </>
                ) : (
                  'SUBSCRIBE'
                )}
              </button>
            </form>

            {/* Newsletter Status Message */}
            {newsletterStatus === 'success' && (
              <div className="mb-8 p-4 bg-emerald-950/80 border border-emerald-500 rounded-lg max-w-md text-center animate-in fade-in duration-300">
                <span className="text-emerald-400 font-bold text-sm block mb-1">&check; {newsletterMsg}</span>
                <span className="text-xs text-gray-300">Your coupon code: <strong className="text-electric-lime font-mono text-sm">REBEL10</strong> (10% OFF)</span>
              </div>
            )}
            {newsletterStatus === 'error' && (
              <div className="mb-8 p-3 bg-red-950/80 border border-red-500 rounded-lg max-w-md text-center text-red-300 text-xs animate-in fade-in duration-300">
                {newsletterMsg}
              </div>
            )}
            {newsletterStatus === 'idle' && <div className="mb-8" />}

            {/* Dynamic Social Proof Metric Columns */}
            {cmsData.newsletter.stats && cmsData.newsletter.stats.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 md:gap-16 w-full max-w-4xl 2xl:max-w-6xl mx-auto divide-y sm:divide-y-0 sm:divide-x divide-charcoal">
                {cmsData.newsletter.stats.map((stat, sIdx) => (
                  <div key={sIdx} className={`pt-4 sm:pt-0 ${sIdx > 0 ? 'sm:pl-8 md:pl-16' : ''} w-full sm:w-auto`}>
                    <div className="font-bold uppercase tracking-wider text-xs md:text-sm 2xl:text-xl flex items-center justify-center gap-1">
                      {stat.value}{' '}
                      {stat.highlight && (
                        <span className="text-electric-lime text-[10px] md:text-xs 2xl:text-sm">{stat.highlight}</span>
                      )}
                    </div>
                    <div className="text-gray-400 text-[10px] md:text-xs 2xl:text-sm mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 6. FOOTER */}
        <Footer />
      </div>
    </>
  );
}
