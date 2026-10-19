import React from 'react';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';
import { getServerProductBySlug, getServerProducts } from '@/lib/server-data';
import { Metadata } from 'next';
import { resolveImageUrl } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getServerProductBySlug(slug);
  if (!product) return { title: 'Product Not Found | CLAPCULTURE' };
  
  // Image URLs go through the site's media proxy (relative URLs resolve against metadataBase).
  const ogImage = product.images?.[0] ? resolveImageUrl(product.images[0]) : '/herobg1-desktop.png';
  
  return {
    title: `${product.name} | CLAPCULTURE`,
    description: product.description || `Buy ${product.name} exclusively at CLAPCULTURE. Premium streetwear.`,
    keywords: [product.name.toLowerCase(), 'streetwear', 'buy online', product.categoryId],
    openGraph: {
      title: `${product.name} | CLAPCULTURE`,
      description: product.description,
      url: `https://clapculture.com/product/${slug}`,
      images: [{ url: ogImage, width: 800, height: 1000, alt: product.name }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} | CLAPCULTURE`,
      description: product.description,
      images: [ogImage],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getServerProductBySlug(slug);
  
  if (!product) {
    notFound();
  }

  // Get related products from DB
  const allProducts = await getServerProducts(20);
  const relatedProducts = allProducts
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 4);
  
  if (relatedProducts.length < 4) {
    const extras = allProducts
      .filter((p) => p.id !== product.id && !relatedProducts.find((r) => r.id === p.id))
      .slice(0, 4 - relatedProducts.length);
    relatedProducts.push(...extras);
  }

  // Structured Data (JSON-LD) for rich Google search results
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: (product.images || []).map((img) => {
      const url = resolveImageUrl(img);
      return url.startsWith('/') ? `https://clapculture.com${url}` : url;
    }),
    description: product.description,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
      url: `https://clapculture.com/product/${slug}`,
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}
