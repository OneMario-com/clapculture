'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useCollections, useProducts } from '@/lib/use-api-data';
import { useHomepageCMS } from '@/lib/cms-store';
import { resolveImageUrl } from '@/lib/utils';

export default function CollectionsPage() {
  const { data: collections, loading } = useCollections();
  const { data: products } = useProducts();
  const { data: homepage } = useHomepageCMS();

  // Cover image per collection slug: the image set in admin, else the homepage star
  // tile that links to the collection (/shop?star=<slug>), else its first product's photo.
  const coverImages = useMemo(() => {
    const starImages = new Map<string, string>();
    for (const section of homepage?.sections || []) {
      if (section.type !== 'star_collection') continue;
      for (const tile of section.tiles || []) {
        const star = tile.link?.match(/[?&]star=([^&#]+)/)?.[1];
        if (star && tile.imageUrl) starImages.set(decodeURIComponent(star), tile.imageUrl);
      }
    }

    const productImages = new Map<string, string>();
    for (const product of products) {
      const raw = product as unknown as Record<string, unknown>;
      if (!product.images[0]) continue;
      productImages.set(product.id, product.images[0]);
      if (typeof raw.$id === 'string') productImages.set(raw.$id, product.images[0]);
    }

    const covers = new Map<string, string>();
    for (const collection of collections) {
      const firstProductImage = collection.productIds.map((id) => productImages.get(id)).find(Boolean);
      const source = collection.image || starImages.get(collection.slug) || firstProductImage;
      if (source) covers.set(collection.slug, resolveImageUrl(source));
    }
    return covers;
  }, [collections, products, homepage]);

  return (
    <div className="min-h-screen bg-deep-black text-white pt-24 pb-16 px-4 md:px-8 max-w-[1920px] mx-auto">
      <div className="mb-12 text-center">
        <h1 className="font-headline-xl text-6xl md:text-8xl tracking-wider text-white">COLLECTIONS</h1>
        <p className="mt-4 text-gray-400 font-body-sm max-w-xl mx-auto">Discover our curated drops. From Tollywood-inspired graphics to essential oversized blanks.</p>
      </div>

      {loading && collections.length === 0 ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-2 border-electric-lime border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-75">
          {collections.map((collection, index) => {
            let spanClass = '';
            if (index === 0) spanClass = 'md:col-span-2 lg:col-span-2 row-span-2';
            else if (index === 3) spanClass = 'md:col-span-2 lg:col-span-1 row-span-2';
            else if (index === 5) spanClass = 'lg:col-span-2';

            const colId = collection.id || (collection as unknown as Record<string, string>).$id || `col-${index}`;
            const productCount = collection.productIds?.length || 0;
            const cover = coverImages.get(collection.slug);

            return (
              <Link 
                key={colId} 
                href={`/collections/${collection.slug}`}
                className={`group relative overflow-hidden bg-charcoal border border-gray-800 hover:border-electric-lime transition-colors ${spanClass}`}
              >
                {/* Abstract Gradient Background */}
                <div className="absolute inset-0 bg-linear-to-br from-charcoal via-black to-gray-900 group-hover:scale-105 transition-transform duration-700">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-electric-lime/20 via-transparent to-transparent"></div>
                </div>

                {cover && (
                  <img
                    src={cover}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                  />
                )}

                <div className="absolute inset-0 p-8 flex flex-col justify-end bg-linear-to-t from-black/80 to-transparent">
                  <h2 className="font-headline-md text-3xl md:text-5xl uppercase group-hover:text-electric-lime transition-colors">{collection.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-gray-300 font-label-caps text-sm">{productCount} ITEMS</span>
                    <span className="material-symbols-outlined text-electric-lime text-sm opacity-0 group-hover:opacity-100 transform -translate-x-2.5 group-hover:translate-x-0 transition-all">arrow_forward</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
