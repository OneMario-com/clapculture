import React from 'react';
import AdminOrderClient from './AdminOrderClient';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <AdminOrderClient key={orderId} orderId={orderId} />;
}
