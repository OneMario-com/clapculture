import React from 'react';
import CategoryClient from './CategoryClient';
import { getServerCategories } from '@/lib/server-data';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categories = await getServerCategories();
  const category = categories.find((c) => c.slug === slug);
  const name = category ? category.name : slug.charAt(0).toUpperCase() + slug.slice(1);

  return {
    title: `${name} | CLAPCULTURE`,
    description: `Shop our exclusive ${name} collection at CLAPCULTURE. Premium streetwear for the rebels and dreamers.`,
    keywords: [name.toLowerCase(), `clapculture ${name.toLowerCase()}`, 'premium streetwear', 'buy online india'],
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await getServerCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) {
    const name = slug.charAt(0).toUpperCase() + slug.slice(1);
    return <CategoryClient category={{ id: slug, name, slug }} />;
  }

  return <CategoryClient category={category} />;
}
