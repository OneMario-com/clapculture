'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Product, Collection } from '@clapculture/shared';
import { useProducts, useCategories } from '@/lib/use-api-data';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductFilters, FilterState } from '@/components/product/ProductFilters';

interface CollectionWithProducts extends Collection {
  products?: Product[];
  description?: string;
}

export default function CollectionClient({ collection }: { collection: CollectionWithProducts }) {
  const { data: allProducts } = useProducts();
  const { data: categories } = useCategories();
  
  // Use products from the collection API response if available, otherwise match from all products
  const productsList = useMemo<Product[]>(
    () => (collection.products && collection.products.length > 0 ? collection.products : allProducts),
    [allProducts, collection.products]
  );
  
  const [filters, setFilters] = useState<FilterState>({
    selectedCategories: [],
    selectedSizes: [],
    sortBy: 'NEWEST',
  });

  const baseProducts = useMemo(() => {
    const slug = (collection.slug || '').toLowerCase();
    const name = (collection.name || '').toLowerCase();

    // If products were passed from the API response (with resolved products), use them directly
    if (collection.products && collection.products.length > 0) {
      return collection.products.map(p => ({ ...p, id: p.id || (p as unknown as Record<string, string>).$id }));
    }

    const matches = productsList.filter((p) => {
      const pId = p.id || (p as unknown as Record<string, string>).$id;
      if (collection.productIds && (collection.productIds.includes(pId) || collection.productIds.includes(p.slug))) {
        return true;
      }

      const badges = (p.badges || []).map((b) => b.toLowerCase());
      const pName = p.name.toLowerCase();
      const combined = `${pName} ${badges.join(' ')}`;

      if (slug === 'new-drop' || slug === 'best-sellers' || slug === 't-shirts' || slug === 'all') {
        return true;
      }
      if (slug.includes('pawan') || name.includes('pawan')) {
        return (
          badges.includes('pawan kalyan') ||
          badges.includes('power star') ||
          badges.includes('senani') ||
          badges.includes('og') ||
          badges.includes('pspk') ||
          /\b(pawan|kalyan|senani|power star|pspk|hungry cheetah|they call him og)\b/i.test(combined) ||
          /\bog\b/i.test(pName)
        );
      }
      if (slug.includes('mahesh') || name.includes('mahesh')) {
        return (
          badges.includes('mahesh babu') ||
          badges.includes('superstar') ||
          badges.includes('pokiri') ||
          badges.includes('ssmb') ||
          /\b(mahesh|babu|ssmb|superstar|pokiri|guntur kaaram|murari|khaleja|okkadhu)\b/i.test(combined)
        );
      }
      if (slug.includes('prabhas') || name.includes('prabhas')) {
        return (
          badges.includes('prabhas') ||
          badges.includes('rebel star') ||
          badges.includes('darling') ||
          badges.includes('salaar') ||
          badges.includes('raja saab') ||
          /\b(prabhas|salaar|rebel star|darling|raja saab|kalki|bahubali|mirchi)\b/i.test(combined)
        );
      }
      if (slug.includes('allu') || name.includes('allu')) {
        return (
          badges.includes('allu arjun') ||
          badges.includes('icon star') ||
          badges.includes('pushpa') ||
          badges.includes('aa rule') ||
          /\b(allu arjun|pushpa|icon star|aa rule|bunny|aryaa|dj|sarrainodu)\b/i.test(combined)
        );
      }
      if (slug.includes('charan') || name.includes('charan')) {
        return (
          badges.includes('ram charan') ||
          badges.includes('global star') ||
          badges.includes('game changer') ||
          /\b(ram charan|global star|mega power star|game changer|magadheera|dhruva|rc15)\b/i.test(combined)
        );
      }
      if (slug.includes('ntr') || name.includes('ntr')) {
        return (
          badges.includes('jr ntr') ||
          badges.includes('ntr') ||
          badges.includes('man of masses') ||
          badges.includes('devara') ||
          /\b(ntr|jr ntr|devara|man of masses|tarak|young tiger|janatha garage|simhadri)\b/i.test(combined)
        );
      }
      if (slug === 'hoodies' || name.includes('hoodie')) {
        return p.categoryId === 'outerwear' || p.categoryId === 'c2' || combined.includes('hoodie');
      }

      return badges.some((b) => b.includes(name) || name.includes(b)) || pName.includes(name);
    });

    return matches;
  }, [collection, productsList]);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  const filteredProducts = useMemo(() => {
    let result = [...baseProducts];

    if (filters.selectedCategories.length > 0) {
      const categoryMap = new Map(categories.map((c) => [c.name, c.id || (c as unknown as Record<string, string>).$id]));
      const allowedCatIds = filters.selectedCategories.map((catName) => categoryMap.get(catName)).filter(Boolean);
      result = result.filter((p) => allowedCatIds.includes(p.categoryId));
    }

    if (filters.selectedSizes.length > 0) {
      result = result.filter((p) =>
        p.sizes.some((s) => filters.selectedSizes.includes(s))
      );
    }

    switch (filters.sortBy) {
      case 'LOW_HIGH':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'HIGH_LOW':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'POPULAR':
        result.sort((a, b) => (b.stock > a.stock ? -1 : 1));
        break;
      case 'NEWEST':
      default:
        break;
    }

    return result;
  }, [baseProducts, filters, categories]);

  return (
    <div className="min-h-screen bg-deep-black text-white pt-24 pb-12 px-4 md:px-8 max-w-[1920px] mx-auto">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-6 flex items-center gap-2 font-label-caps tracking-widest">
        <Link href="/" className="hover:text-electric-lime transition-colors">HOME</Link>
        <span>/</span>
        <Link href="/collections" className="hover:text-electric-lime transition-colors">COLLECTIONS</Link>
        <span>/</span>
        <span className="text-white">{collection.name.toUpperCase()}</span>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full h-[30vh] md:h-[40vh] bg-charcoal mb-12 flex items-center justify-center overflow-hidden border border-gray-800">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-electric-lime/20 via-black to-black"></div>
        
        <div className="relative z-10 text-center px-4">
          <h1 className="font-headline-xl text-5xl md:text-7xl lg:text-8xl tracking-widest uppercase">{collection.name}</h1>
          <p className="mt-4 text-gray-400 font-body-sm max-w-2xl mx-auto">
            {collection.description || 'Exclusive pieces curated for the culture. Dive into the aesthetic.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters */}
        <div className="w-full md:w-64 shrink-0">
          <ProductFilters 
            categories={categoryNames} 
            selectedCategories={filters.selectedCategories}
            selectedSizes={filters.selectedSizes}
            sortBy={filters.sortBy}
            onFilterChange={setFilters} 
          />
        </div>

        {/* Product Grid */}
        <div className="grow">
          <div className="mb-6 flex justify-between items-center text-sm font-label-caps text-gray-400 border-b border-charcoal pb-4">
            <span>{filteredProducts.length} RESULTS</span>
            <select 
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value }))}
              className="hidden md:block bg-transparent border-none text-white focus:outline-none cursor-pointer"
            >
              <option value="NEWEST" className="bg-black">NEWEST</option>
              <option value="LOW_HIGH" className="bg-black">PRICE: LOW TO HIGH</option>
              <option value="HIGH_LOW" className="bg-black">PRICE: HIGH TO LOW</option>
              <option value="POPULAR" className="bg-black">POPULAR</option>
            </select>
          </div>

          <ProductGrid products={filteredProducts} />
        </div>
      </div>
    </div>
  );
}
