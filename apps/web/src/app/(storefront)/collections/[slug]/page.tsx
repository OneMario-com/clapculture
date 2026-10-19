import React from 'react';
import CollectionClient from './CollectionClient';
import { getServerCollectionBySlug } from '@/lib/server-data';

export const dynamic = 'force-dynamic';
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dbCollection = await getServerCollectionBySlug(slug);
  const name = dbCollection?.name || slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Collection';

  return {
    title: `${name} | CLAPCULTURE`,
    description: dbCollection?.description || `Explore the exclusive ${name} drop at CLAPCULTURE. Limited edition premium streetwear.`,
    keywords: [`${name.toLowerCase()} collection`, 'exclusive drop', 'premium streetwear', 'clapculture collection'],
  };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dbCollection = await getServerCollectionBySlug(slug);

  const collection = dbCollection || {
    id: `col-${slug}`,
    name: slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Collection',
    slug: slug,
    productIds: [],
  };

  return <CollectionClient collection={collection} />;
}
