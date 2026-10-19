'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';
import { adminFetch } from '@/lib/admin-fetch';

interface OrderDoc {
  $id: string;
  orderId: string;
  customer: string | Record<string, string>;
  items: string | unknown[];
  total: number;
  paymentStatus: string;
  orderStatus: string;
  $createdAt?: string;
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const res = await adminFetch('/api/orders?limit=100');

        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setOrders(json.data);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard orders:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const totalOrders = orders.length;
  const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingPayments = orders.filter(
    (o) => o.paymentStatus === 'SUBMITTED'
  ).length;
  const confirmedOrders = orders.filter(
    (o) => o.orderStatus === 'CONFIRMED' || o.paymentStatus === 'VERIFIED'
  ).length;
  const shippedOrders = orders.filter((o) => o.orderStatus === 'SHIPPED').length;
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'DELIVERED').length;

  const stats = [
    { label: 'Total Orders', value: String(totalOrders), icon: 'shopping_bag', color: 'text-blue-400' },
    { label: 'Total Revenue', value: formatCurrency(totalSales), icon: 'payments', color: 'text-green-400' },
    { label: 'Pending Payments', value: String(pendingPayments), icon: 'pending', color: 'text-yellow-400' },
    { label: 'Confirmed Orders', value: String(confirmedOrders), icon: 'check_circle', color: 'text-electric-lime' },
    { label: 'In Transit / Shipped', value: String(shippedOrders), icon: 'local_shipping', color: 'text-purple-400' },
    { label: 'Delivered', value: String(deliveredOrders), icon: 'inventory', color: 'text-gray-300' },
  ];

  const recentOrders = orders.slice(0, 5).map((doc) => {
    let customerName = 'Customer';
    if (typeof doc.customer === 'string') {
      try {
        const parsed = JSON.parse(doc.customer);
        customerName = parsed.fullName || customerName;
      } catch {}
    } else if (doc.customer && typeof doc.customer === 'object') {
      customerName = (doc.customer as Record<string, string>).fullName || customerName;
    }

    return {
      id: String(doc.orderId || doc.$id).replace('#', ''),
      docId: doc.$id,
      customer: customerName,
      status: doc.orderStatus || 'PLACED',
      payment: doc.paymentStatus || 'SUBMITTED',
      amount: formatCurrency(doc.total || 0),
      date: doc.$createdAt ? new Date(doc.$createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today',
    };
  });

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/orders"
          className="bg-[#141414] border border-[#262626] hover:border-electric-lime text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors font-mono"
        >
          <span className="material-symbols-outlined text-[18px] text-yellow-400">warning</span>
          Verify Payments ({pendingPayments})
        </Link>
        <Link
          href="/admin/products/new"
          className="bg-[#141414] border border-[#262626] hover:border-electric-lime text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors font-mono"
        >
          <span className="material-symbols-outlined text-[18px] text-electric-lime">add_circle</span>
          Add New Product
        </Link>
        <Link
          href="/admin/orders"
          className="bg-electric-lime text-black font-bold px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-white transition-colors font-mono"
        >
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          View All Orders ({totalOrders})
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#141414] border border-[#262626] rounded-xl p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[#a3a3a3] text-xs font-mono font-medium">{stat.label}</span>
              <span className={`material-symbols-outlined text-[20px] ${stat.color}`}>{stat.icon}</span>
            </div>
            <p className="text-xl font-bold text-white font-mono">{loading ? '...' : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Fulfillment Summary */}
        <div className="lg:col-span-2 bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold font-mono">REVENUE & FULFILLMENT METRICS</h3>
            <span className="text-xs text-electric-lime font-mono">LIVE APPWRITE DATABASE</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#262626]">
              <span className="text-xs text-[#a3a3a3] font-mono block mb-1">TOTAL ORDERS PLACED</span>
              <p className="text-2xl font-bold text-white font-mono">{totalOrders}</p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#262626]">
              <span className="text-xs text-[#a3a3a3] font-mono block mb-1">CONFIRMED & VERIFIED</span>
              <p className="text-2xl font-bold text-electric-lime font-mono">{confirmedOrders}</p>
            </div>
            <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#262626]">
              <span className="text-xs text-[#a3a3a3] font-mono block mb-1">DELIVERED TO FANS</span>
              <p className="text-2xl font-bold text-green-400 font-mono">{deliveredOrders}</p>
            </div>
          </div>

          <div className="h-44 w-full bg-[#1a1a1a] rounded-lg flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#262626]">
            <span className="material-symbols-outlined text-3xl text-electric-lime mb-1">monitoring</span>
            <p className="text-white text-sm font-medium font-mono">
              Total Recorded Revenue: {formatCurrency(totalSales)}
            </p>
            <p className="text-xs text-[#737373] mt-1 font-mono">
              Orders and customer profiles are synchronized directly with Appwrite database.
            </p>
          </div>
        </div>

        {/* Recent Orders List */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold font-mono">Recent Orders</h3>
            <Link href="/admin/orders" className="text-xs text-electric-lime font-mono hover:underline">
              View All ({totalOrders})
            </Link>
          </div>
          {recentOrders.length > 0 ? (
            <div className="space-y-3">
              {recentOrders.map((order, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-3 hover:bg-[#1a1a1a] rounded-lg transition-colors border border-[#262626]"
                >
                  <div>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(order.docId || order.id)}`}
                      className="text-white font-bold font-mono text-sm hover:text-electric-lime block"
                    >
                      #{order.id}
                    </Link>
                    <p className="text-xs text-[#a3a3a3] mt-0.5">{order.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-mono font-bold text-sm">{order.amount}</p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#262626] text-electric-lime font-bold">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-[#737373]">
              <span className="material-symbols-outlined text-3xl mb-2 text-[#737373]">inbox</span>
              <p className="text-white text-sm font-medium font-mono">No orders placed yet</p>
              <p className="text-xs text-[#737373] mt-1 font-mono">When customers checkout, orders appear here live.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
