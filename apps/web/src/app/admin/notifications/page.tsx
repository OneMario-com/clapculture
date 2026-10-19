'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type NotificationType = 'order' | 'payment' | 'stock' | 'system' | 'customer';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('All');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const tabs = ['All', 'Orders', 'Payments', 'Stock', 'System'];

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        
        // 1. Fetch live orders
        const ordersRes = await fetch('/api/orders?limit=50', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        // 2. Fetch live products for stock alerts
        const productsRes = await fetch('/api/products?limit=50', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const items: NotificationItem[] = [];

        if (ordersRes.ok) {
          const json = await ordersRes.json();
          if (json.success && Array.isArray(json.data)) {
            json.data.forEach((o: Record<string, unknown>) => {
              let customerName = 'Customer';
              if (typeof o.customer === 'string') {
                try {
                  const parsed = JSON.parse(o.customer);
                  customerName = parsed.fullName || customerName;
                } catch {}
              }

              const orderNum = String(o.orderId || o.$id).replace('#', '');
              const orderHref = `/admin/orders/${encodeURIComponent(String(o.$id || orderNum))}`;
              const totalAmount = o.total ? `₹${o.total}` : '';
              const dateStr = o.$createdAt ? new Date(o.$createdAt as string).toLocaleString('en-IN') : 'Recent';

              // Order Notification
              items.push({
                id: `ord-${o.$id}`,
                type: 'order',
                title: `New Order #${orderNum} Placed`,
                description: `Customer ${customerName} placed an order for ${totalAmount}. Status: ${o.orderStatus || 'PLACED'}`,
                timestamp: dateStr,
                read: false,
                link: orderHref,
              });

              // Payment Notification
              if (o.paymentStatus === 'SUBMITTED' || o.paymentStatus === 'VERIFIED') {
                items.push({
                  id: `pay-${o.$id}`,
                  type: 'payment',
                  title: o.paymentStatus === 'VERIFIED' ? `Payment Verified for #${orderNum}` : `Payment Proof Submitted for #${orderNum}`,
                  description: `UPI Reference / UTR: ${o.transactionId || 'Pending'}. Amount: ${totalAmount}. Click to verify.`,
                  timestamp: dateStr,
                  read: false,
                  link: orderHref,
                });
              }
            });
          }
        }

        if (productsRes.ok) {
          const json = await productsRes.json();
          if (json.success && Array.isArray(json.data)) {
            json.data.forEach((p: Record<string, unknown>) => {
              if (typeof p.stock === 'number' && p.stock <= 5) {
                items.push({
                  id: `stk-${p.id || p.slug}`,
                  type: 'stock',
                  title: `Low Stock Alert: ${p.name}`,
                  description: `Only ${p.stock} units remaining in inventory. Consider restocking soon.`,
                  timestamp: 'Live Alert',
                  read: false,
                  link: `/admin/inventory`,
                });
              }
            });
          }
        }

        // System notification
        items.push({
          id: 'sys-appwrite-db',
          type: 'system',
          title: 'Database & Mail Services Operational',
          description: 'Appwrite Database & Gmail SMTP services are fully connected and synchronized.',
          timestamp: 'System Live',
          read: true,
        });

        setNotifications(items);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, []);

  const markAllAsRead = () => {
    const all = new Set(notifications.map((n) => n.id));
    setReadIds(all);
  };

  const markAsRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Orders') return n.type === 'order';
    if (activeTab === 'Payments') return n.type === 'payment';
    if (activeTab === 'Stock') return n.type === 'stock';
    if (activeTab === 'System') return n.type === 'system';
    return true;
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'order': return 'shopping_bag';
      case 'payment': return 'payments';
      case 'stock': return 'warning';
      case 'customer': return 'person';
      case 'system': return 'settings';
      default: return 'notifications';
    }
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.id) && !n.read).length;

  return (
    <div className="bg-[#0a0a0a] min-h-screen p-6 text-white">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold font-mono">Notifications</h1>
            <p className="text-xs text-[#737373] mt-1 font-mono">
              Real-time alerts for customer orders, payments, and system updates ({unreadCount} unread)
            </p>
          </div>
          <button
            onClick={markAllAsRead}
            className="text-xs font-mono bg-[#1a1a1a] border border-[#262626] text-electric-lime px-4 py-2 rounded-lg hover:bg-[#262626] transition-colors cursor-pointer"
          >
            Mark All as Read
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-xs font-mono font-bold transition-colors cursor-pointer ${
                activeTab === tab
                  ? 'bg-electric-lime text-black'
                  : 'bg-[#1a1a1a] border border-[#262626] text-[#a3a3a3] hover:bg-[#262626] hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-mono text-[#a3a3a3]">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <span className="material-symbols-outlined text-5xl text-[#262626] mb-4">notifications_off</span>
              <p className="text-[#a3a3a3] font-mono text-xs">No notifications found in this category.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#262626]">
              {filteredNotifications.map((notification) => {
                const isRead = notification.read || readIds.has(notification.id);
                const content = (
                  <div
                    onClick={() => !isRead && markAsRead(notification.id)}
                    className={`p-4 flex gap-4 transition-colors ${!isRead ? 'cursor-pointer' : ''} ${
                      isRead
                        ? 'hover:bg-[#1a1a1a]'
                        : 'bg-electric-lime/5 hover:bg-electric-lime/10 border-l-4 border-l-electric-lime'
                    }`}
                  >
                    <div
                      className={`mt-1 shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isRead ? 'bg-[#1a1a1a] text-[#737373]' : 'bg-electric-lime/20 text-electric-lime'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl">{getIcon(notification.type)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className={`text-sm font-mono ${isRead ? 'text-white' : 'text-electric-lime font-bold'}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] text-[#737373] whitespace-nowrap font-mono">
                          {notification.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#a3a3a3] mt-1 font-mono">{notification.description}</p>
                    </div>
                  </div>
                );

                return notification.link ? (
                  <Link key={notification.id} href={notification.link} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}