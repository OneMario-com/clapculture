/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';

interface OrderItem {
  id?: string;
  name: string;
  image?: string;
  size?: string;
  price: number;
  quantity: number;
}

interface OrderCustomer {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  apartment?: string;
  city?: string;
  state?: string;
  pincode?: string;
  screenshotUrl?: string;
  paymentProof?: string;
  discountCode?: string;
  discountAmount?: number;
}

interface OrderDoc {
  $id: string;
  orderId: string;
  customer: string | OrderCustomer;
  items: string | OrderItem[];
  subtotal?: number;
  shipping?: number;
  total: number;
  paymentStatus: string;
  orderStatus: string;
  transactionId?: string;
  trackingNumber?: string;
  screenshotUrl?: string;
  paymentProof?: string;
  $createdAt?: string;
  isArchived?: boolean;
}

export default function AdminOrderClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [paymentStatus, setPaymentStatus] = useState('SUBMITTED');
  const [orderStatus, setOrderStatus] = useState('PLACED');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [toast, setToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({ show: false, msg: '' });

  const loadRequestRef = useRef(0);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = (msg: string, isError = false) => {
    setToast({ show: true, msg, isError });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast({ show: false, msg: '' }), 3500);
  };

  const applyOrderDoc = (doc: OrderDoc) => {
    setOrder(doc);
    setPaymentStatus(doc.paymentStatus || 'SUBMITTED');
    setOrderStatus(doc.orderStatus || 'PLACED');
    setTrackingNumber(doc.trackingNumber || '');
  };

  const loadOrder = async () => {
    const requestId = ++loadRequestRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => null);
      if (requestId !== loadRequestRef.current) return;

      if (res.ok && json?.success && json.data) {
        applyOrderDoc(json.data as OrderDoc);
      } else {
        setOrder(null);
        setLoadError(
          json?.error || (res.status === 404 ? 'Order not found.' : `Failed to load order (HTTP ${res.status}).`)
        );
      }
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      console.error('Failed to load order:', err);
      setOrder(null);
      setLoadError('Network error while loading this order.');
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    // Each loadOrder() call bumps the request counter, so responses for an older request are ignored
    const timer = setTimeout(() => loadOrder(), 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // PUT a partial status update for the loaded order and sync local state from the returned document
  const putOrderStatus = async (updates: Record<string, unknown>) => {
    if (!order) return { ok: false as const, error: 'Order not loaded' };
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
    const res = await fetch(`/api/orders/${encodeURIComponent(order.$id)}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.success) {
      if (json.data && typeof json.data === 'object') {
        applyOrderDoc({ ...order, ...(json.data as OrderDoc) });
      } else {
        applyOrderDoc({ ...order, ...(updates as Partial<OrderDoc>) });
      }
      return { ok: true as const };
    }
    return { ok: false as const, error: (json?.error as string) || `HTTP ${res.status}` };
  };

  const handleToggleArchive = async () => {
    if (!order || isUpdating) return;
    setIsUpdating(true);
    const targetState = !order.isArchived;
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`/api/orders/${encodeURIComponent(order.$id)}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isArchived: targetState }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setOrder((prev) => (prev ? { ...prev, isArchived: targetState } : null));
        showToast(targetState ? '📦 Order archived successfully!' : '📂 Order restored to active list!');
      } else {
        showToast(json?.error || 'Failed to update archive status', true);
      }
    } catch {
      showToast('Network error while toggling archive status', true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleVerifyPayment = async (status: 'VERIFIED' | 'REJECTED') => {
    if (!order || isUpdating) return;
    setIsUpdating(true);
    try {
      const updates: Record<string, unknown> = {};
      if (order.paymentStatus !== status) updates.paymentStatus = status;
      // Verifying confirms a freshly placed order; never roll back an order that is further along
      if (status === 'VERIFIED' && (order.orderStatus || 'PLACED') === 'PLACED') {
        updates.orderStatus = 'CONFIRMED';
      }
      if (Object.keys(updates).length === 0) {
        showToast(status === 'VERIFIED' ? 'Payment is already verified.' : 'Payment is already rejected.');
        return;
      }

      const result = await putOrderStatus(updates);
      if (result.ok) {
        showToast(
          status === 'VERIFIED'
            ? '✨ Payment verified & order confirmed! Customer notified via email.'
            : '⚠️ Payment rejected.'
        );
      } else {
        showToast(result.error || 'Failed to update payment status', true);
      }
    } catch {
      showToast('Network error while updating status', true);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!order || isUpdating) return;
    setIsUpdating(true);
    try {
      // Only send fields that differ from the loaded order
      const updates: Record<string, unknown> = {};
      if (orderStatus !== (order.orderStatus || 'PLACED')) updates.orderStatus = orderStatus;
      if (paymentStatus !== (order.paymentStatus || 'SUBMITTED')) updates.paymentStatus = paymentStatus;
      const trimmedTracking = trackingNumber.trim();
      if (trimmedTracking !== (order.trackingNumber || '')) updates.trackingNumber = trimmedTracking;

      if (Object.keys(updates).length === 0) {
        showToast('No changes to save.');
        return;
      }

      const result = await putOrderStatus(updates);
      if (result.ok) {
        showToast(`✨ Fulfillment status updated to ${orderStatus}!`);
      } else {
        showToast(result.error || 'Failed to update order status', true);
      }
    } catch {
      showToast('Network error while updating status', true);
    } finally {
      setIsUpdating(false);
    }
  };

  // Parsed helpers
  const customer: OrderCustomer = React.useMemo(() => {
    if (!order) return {};
    if (typeof order.customer === 'string') {
      try {
        return JSON.parse(order.customer);
      } catch {
        return {};
      }
    }
    return order.customer || {};
  }, [order]);

  const items: OrderItem[] = React.useMemo(() => {
    if (!order) return [];
    if (typeof order.items === 'string') {
      try {
        return JSON.parse(order.items);
      } catch {
        return [];
      }
    }
    return order.items || [];
  }, [order]);

  const cleanId = (order?.orderId || orderId).replace('#', '');
  const orderDate = order?.$createdAt
    ? new Date(order.$createdAt).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent Order';

  // ─── WhatsApp Automated Updates ─────────────────────────────────────────
  type WhatsAppTemplateType = 'AUTO' | 'CONFIRMED' | 'SHIPPED' | 'PROCESSING' | 'DELIVERED' | 'PAYMENT_QUERY';
  const [waTemplate, setWaTemplate] = useState<WhatsAppTemplateType>('AUTO');
  const [customWaMsg, setCustomWaMsg] = useState<string | null>(null);

  const cleanPhone = React.useMemo(() => {
    const raw = (customer.phone || '').replace(/\D/g, '');
    if (!raw) return '';
    if (raw.length === 10) return `91${raw}`;
    if (raw.startsWith('0') && raw.length === 11) return `91${raw.slice(1)}`;
    return raw;
  }, [customer.phone]);

  const itemsSummary = React.useMemo(() => {
    if (!items || items.length === 0) return '• CLAPCULTURE Streetwear Item';
    return items.map(it => `• *${it.name}* (Size: ${it.size || 'M'}, Qty: ${it.quantity || 1})`).join('\n');
  }, [items]);

  const generatedWhatsAppMessage = React.useMemo(() => {
    const custName = customer.fullName ? customer.fullName.trim().split(' ')[0] : 'there';
    const totalAmount = formatCurrency(order?.total || 0);
    const tracking = trackingNumber || order?.trackingNumber || 'TRK-CLAP-PENDING';
    const effectiveStatus = waTemplate === 'AUTO' 
      ? (orderStatus === 'PLACED' && paymentStatus === 'VERIFIED' ? 'CONFIRMED' : orderStatus)
      : waTemplate;

    if (effectiveStatus === 'SHIPPED') {
      return `🚚 *Hey ${custName}!*

Great news! Your *CLAPCULTURE* Order *#${cleanId}* has been *DISPATCHED & SHIPPED*! 🚀

📦 *Courier Tracking Number:* ${tracking}
🛍️ *Items in this package:*
${itemsSummary}

💰 *Total Paid:* ${totalAmount}

📍 Track your order live anytime here:
https://clapculture.com/track-order?orderId=${cleanId}

Thank you for rocking with the culture! ⚡
_Team CLAPCULTURE_`;
    }

    if (effectiveStatus === 'PROCESSING') {
      return `⚡ *Hey ${custName}!*

Your *CLAPCULTURE* Order *#${cleanId}* is currently being *PACKED & QUALITY CHECKED* at our hub! 📦✨

🛍️ *Order Items:*
${itemsSummary}
💰 *Total Amount:* ${totalAmount}

We will notify you with your courier tracking link the moment it is handed over for dispatch.

Stay tuned,
_Team CLAPCULTURE_ 🔥`;
    }

    if (effectiveStatus === 'DELIVERED') {
      return `🎉 *Hey ${custName}!*

Your *CLAPCULTURE* Order *#${cleanId}* has been marked as *DELIVERED*! 📦✨

We hope you love your new fit! Tag us on Instagram *@clapculture* with your drip to get featured on our page.

Thank you for choosing *CLAPCULTURE* ⚡`;
    }

    if (effectiveStatus === 'PAYMENT_QUERY' || paymentStatus === 'REJECTED' || (paymentStatus === 'SUBMITTED' && orderStatus === 'PLACED')) {
      return `⚠️ *Hey ${custName},*

This is *CLAPCULTURE* regarding your Order *#${cleanId}*.

We are reviewing your UPI payment (UTR: *${order?.transactionId || 'Pending'}*). Please reply directly to this message with your payment confirmation screenshot or UTR reference so we can verify and process your order immediately! ⚡

_Team CLAPCULTURE_`;
    }

    // Default: CONFIRMED
    return `🔥 *Hey ${custName}!*

Your order with *CLAPCULTURE* (*#${cleanId}*) is *CONFIRMED*! 🎉

🛍️ *Order Summary:*
${itemsSummary}

💰 *Total Amount:* ${totalAmount}
💳 *Payment Status:* VERIFIED ✅

We are now preparing your package for shipping. You will receive live tracking updates right here on WhatsApp!

📍 Track your order anytime:
https://clapculture.com/track-order?orderId=${cleanId}

Stay rebel,
_Team CLAPCULTURE_ ⚡`;
  }, [customer.fullName, cleanId, itemsSummary, order?.total, order?.transactionId, order?.trackingNumber, trackingNumber, waTemplate, paymentStatus, orderStatus]);

  const activeWhatsAppMessage = customWaMsg !== null ? customWaMsg : generatedWhatsAppMessage;

  const handleOpenWhatsApp = () => {
    if (!cleanPhone) {
      showToast('No valid customer phone number found', true);
      return;
    }
    const textToSend = (activeWhatsAppMessage || '').trim();
    // Direct API URL without 302 redirect preserves all Unicode emojis and text formatting
    const url = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(textToSend)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen p-6 text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs text-gray-400">Loading order #{cleanId}...</p>
      </div>
    );
  }

  // Never render the editable form without a loaded order (saving defaults would roll back real statuses)
  if (!order) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen p-6 text-white flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-5xl text-red-400 mb-3">error</span>
        <p className="font-mono text-sm font-bold text-white mb-1">Could not load order #{cleanId}</p>
        <p className="font-mono text-xs text-gray-400 mb-6">{loadError || 'Order not found.'}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadOrder()}
            className="bg-electric-lime hover:bg-white text-black font-bold px-4 py-2 rounded-lg text-xs transition-colors uppercase font-mono cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Retry
          </button>
          <Link
            href="/admin/orders"
            className="bg-[#262626] hover:bg-[#333] text-gray-300 px-4 py-2 rounded-lg text-xs font-mono border border-[#333] transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen p-6 text-white">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom ${
          toast.isError ? 'bg-red-600 text-white' : 'bg-electric-lime text-black'
        }`}>
          <span className="material-symbols-outlined text-xl">
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <Link href="/admin/orders" className="text-sm text-[#737373] hover:text-electric-lime flex items-center gap-1">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back to Orders
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#737373]">Live Status:</span>
            <span className="bg-electric-lime/10 text-electric-lime border border-electric-lime/20 px-3 py-1 rounded-full text-xs font-bold font-mono">
              {order?.orderStatus || orderStatus}
            </span>
          </div>
        </div>

        {/* Main Order Card */}
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-[#262626]">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold font-mono text-white">ORDER #{cleanId}</h1>
                {order?.isArchived && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded text-xs font-bold font-mono">
                    📦 ARCHIVED
                  </span>
                )}
              </div>
              <p className="text-xs text-[#737373] mt-1 font-mono">
                Placed on {orderDate} via UPI Payment
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-green-900/20"
                title={`Open WhatsApp chat with ${customer.fullName || 'Customer'}`}
              >
                <span className="material-symbols-outlined text-base">chat</span>
                WHATSAPP CUSTOMER
              </button>
              <button
                type="button"
                disabled={isUpdating || paymentStatus === 'VERIFIED'}
                onClick={() => handleVerifyPayment('VERIFIED')}
                className={`font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                  paymentStatus === 'VERIFIED'
                    ? 'bg-green-700/50 text-green-300 cursor-default'
                    : 'bg-green-600 hover:bg-green-500 text-white cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined text-base">verified</span>
                {paymentStatus === 'VERIFIED' ? '✓ PAYMENT VERIFIED' : 'CONFIRM & VERIFY PAYMENT'}
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleToggleArchive}
                className={`font-bold px-4 py-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                  order?.isArchived
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black'
                    : 'bg-[#262626] text-gray-300 hover:bg-amber-500 hover:text-black border border-[#333]'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {order?.isArchived ? 'unarchive' : 'archive'}
                </span>
                {order?.isArchived ? 'RESTORE FROM ARCHIVE' : 'ARCHIVE ORDER'}
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleVerifyPayment('REJECTED')}
                className="bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                REJECT PAYMENT
              </button>
            </div>
          </div>

          {/* WhatsApp Quick Customer Notification Card */}
          <div className="my-6 bg-[#161c16] border border-[#25D366]/30 rounded-xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#25D366] animate-pulse" />
                <h3 className="text-xs font-bold uppercase text-[#25D366] font-mono tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">chat</span>
                  WHATSAPP CUSTOMER NOTIFICATION
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-gray-400">Recipient:</span>
                <span className="bg-[#1f2d1f] text-[#25D366] px-2 py-0.5 rounded border border-[#25D366]/30 font-bold">
                  +{cleanPhone || 'No Phone'}
                </span>
              </div>
            </div>

            {/* Template Selector Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-[11px] font-mono text-gray-400 self-center mr-1">Templates:</span>
              {([
                { id: 'AUTO', label: '⚡ Auto (Current Status)' },
                { id: 'CONFIRMED', label: '✅ Order Confirmed' },
                { id: 'PROCESSING', label: '📦 Packing / Hub' },
                { id: 'SHIPPED', label: '🚚 Dispatched & Tracking' },
                { id: 'DELIVERED', label: '🎉 Delivered' },
                { id: 'PAYMENT_QUERY', label: '⚠️ Payment Help / UTR' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setWaTemplate(t.id);
                    setCustomWaMsg(null);
                  }}
                  className={`text-xs font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    waTemplate === t.id
                      ? 'bg-[#25D366] text-black border-[#25D366] font-bold shadow-md'
                      : 'bg-[#141414] text-gray-300 border-[#333] hover:border-gray-500'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Editable Message Box */}
            <div className="space-y-3">
              <label className="block text-[11px] font-mono text-gray-400">
                Message Preview (Pre-filled automatically, editable):
              </label>
              <textarea
                rows={7}
                value={activeWhatsAppMessage}
                onChange={(e) => setCustomWaMsg(e.target.value)}
                className="w-full bg-[#0d120d] border border-[#25D366]/20 rounded-lg p-3 text-xs md:text-sm font-mono text-gray-200 focus:border-[#25D366] outline-none resize-y leading-relaxed"
                placeholder="Type your WhatsApp message..."
              />
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1">
                  <span className="text-[#25D366]">💡</span>
                  Clicking below will open WhatsApp with this customer&apos;s chat and pre-fill the text automatically.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(activeWhatsAppMessage);
                      showToast('📋 WhatsApp message copied to clipboard!');
                    }}
                    className="bg-[#222] hover:bg-[#333] text-gray-300 px-3 py-2 rounded-lg text-xs font-mono border border-[#444] transition-colors cursor-pointer"
                  >
                    Copy Text
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWhatsApp}
                    className="bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold px-5 py-2 rounded-lg text-xs font-mono uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-green-900/30"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    SEND VIA WHATSAPP
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Verification Section */}
          <div className="my-6 bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase text-electric-lime tracking-wider font-mono">
                💳 PAYMENT PROOF & VERIFICATION
              </span>
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded font-bold ${
                paymentStatus === 'VERIFIED' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                STATUS: {paymentStatus}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-[#737373] block mb-2 font-mono">Payment Proof Screenshot:</span>
                <div className="border border-[#262626] rounded-lg p-3 bg-[#0d0d0d] overflow-hidden flex flex-col items-center justify-center min-h-48">
                  {(() => {
                    const screenshot = order?.screenshotUrl || order?.paymentProof || customer?.screenshotUrl || customer?.paymentProof || '';
                    if (screenshot && !screenshot.includes('placehold')) {
                      const fullUrl = resolveImageUrl(screenshot);
                      return (
                        <div className="w-full flex flex-col items-center gap-2">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block relative w-full text-center"
                          >
                            <img
                              src={fullUrl}
                              alt="Payment Screenshot"
                              className="max-h-72 max-w-full mx-auto object-contain rounded border border-[#262626] group-hover:border-electric-lime transition-all"
                            />
                            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-electric-lime font-mono group-hover:underline">
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              <span>Click to view full resolution image</span>
                            </div>
                          </a>
                        </div>
                      );
                    }
                    return (
                      <div className="text-center text-gray-500 py-8">
                        <span className="material-symbols-outlined text-4xl block mb-1 text-gray-600">receipt_long</span>
                        <p className="text-xs font-mono">No Screenshot Uploaded</p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div>
                  <span className="text-xs text-[#737373] block">UTR / Reference Number:</span>
                  <p className="text-base font-bold text-electric-lime mt-0.5">
                    {order?.transactionId || 'UPI-REF-PENDING'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-[#737373] block">Total Amount:</span>
                  <p className="text-2xl font-bold text-white mt-0.5">
                    {formatCurrency(order?.total || 0)}
                  </p>
                  {Number(customer.discountAmount) > 0 && (
                    <p className="text-xs text-electric-lime mt-1">
                      Includes discount {customer.discountCode}: -{formatCurrency(Number(customer.discountAmount))}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-xs text-[#737373] block">Payment Channel:</span>
                  <p className="text-xs text-gray-300 mt-0.5">Direct UPI (8639654299@ybl)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Delivery Details */}
          <div className="my-6 bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase text-white font-mono tracking-wider">
                📍 CUSTOMER & SHIPPING ADDRESS
              </h3>
              {cleanPhone && (
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 text-xs px-2.5 py-1 rounded font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">chat</span>
                  Chat on WhatsApp
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
              <div>
                <span className="text-[#737373] block mb-1">Customer Name:</span>
                <p className="text-sm font-bold text-white">{customer.fullName || 'Customer'}</p>
                <p className="text-[#a3a3a3] mt-1">{customer.email || '—'}</p>
                <p className="text-[#25D366] font-bold mt-0.5 flex items-center gap-1">
                  <span>{customer.phone || '—'}</span>
                </p>
              </div>
              <div>
                <span className="text-[#737373] block mb-1">Delivery Address:</span>
                <p className="text-white font-medium">{customer.address}</p>
                {customer.apartment && <p className="text-gray-400">{customer.apartment}</p>}
                <p className="text-gray-400">
                  {customer.city}, {customer.state} — {customer.pincode}
                </p>
              </div>
            </div>
          </div>

          {/* Purchased Items List */}
          <div className="my-6 bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
            <h3 className="text-xs font-bold uppercase text-white font-mono tracking-wider mb-4">
              🛍️ ORDER ITEMS ({items.length})
            </h3>
            <div className="divide-y divide-[#262626]">
              {items.map((item, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 bg-[#111] border border-[#2e2e2e] rounded overflow-hidden shrink-0">
                      <img
                        src={resolveImageUrl(item.image || '6a7fa922002c9b023447')}
                        alt={item.name}
                        className="w-16 h-20 object-cover rounded border border-[#333]"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{item.name}</p>
                      <div className="flex gap-2 text-xs font-mono text-gray-400 mt-0.5">
                        <span className="bg-[#262626] px-1.5 py-0.5 rounded text-electric-lime">
                          Size: {item.size || 'M'}
                        </span>
                        <span>Qty: {item.quantity || 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-mono font-bold text-sm text-white">
                    {formatCurrency(item.price * (item.quantity || 1))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status & Tracking Update Form */}
          <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-6">
            <h3 className="text-sm font-bold uppercase text-white mb-4 font-mono">
              🚚 FULFILLMENT & LIVE TRACKING UPDATE
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs text-[#737373] mb-1 font-mono">Order Fulfillment Status</label>
                <select
                  value={orderStatus}
                  onChange={(e) => setOrderStatus(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2.5 text-white focus:border-electric-lime outline-none text-xs font-mono"
                >
                  <option value="PLACED">ORDER PLACED</option>
                  <option value="CONFIRMED">ORDER CONFIRMED</option>
                  <option value="PROCESSING">PROCESSING / PACKING</option>
                  <option value="SHIPPED">SHIPPED / IN TRANSIT</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-[#737373] mb-1 font-mono">Courier Tracking Number</label>
                <input
                  type="text"
                  placeholder="e.g. BLUEDART-9874213 or DTDC-4422"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full bg-[#141414] border border-[#262626] rounded-lg px-3 py-2.5 text-white font-mono focus:border-electric-lime outline-none text-xs"
                />
              </div>

              <button
                type="button"
                disabled={isUpdating}
                onClick={handleUpdateStatus}
                className="bg-electric-lime hover:bg-white text-black font-bold px-4 py-2.5 rounded-lg text-xs transition-colors uppercase font-mono cursor-pointer"
              >
                {isUpdating ? 'SAVING...' : 'SAVE FULFILLMENT STATUS'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
