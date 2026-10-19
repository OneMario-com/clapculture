import React from 'react';
import OrderClient from './OrderClient';

export const dynamic = 'force-dynamic';

export default async function OrderDetailsPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderClient orderId={orderId} />;
}
