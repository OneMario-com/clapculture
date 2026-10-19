'use client';

import React from 'react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { useOrderStore, OrderData, CheckoutInfo, useIsClient } from '@/lib/store';

type LoadState = 'idle' | 'loading' | 'loaded' | 'denied' | 'not-found' | 'error';

function parseOrderDoc(doc: Record<string, unknown>): OrderData {
  const parse = (value: unknown) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  };
  return {
    ...(doc as unknown as OrderData),
    customer: parse(doc.customer) as CheckoutInfo,
    items: (parse(doc.items) || []) as OrderData['items'],
    createdAt: String(doc.$createdAt || doc.createdAt || ''),
  };
}

export default function OrderClient({ orderId }: { orderId: string }) {
  const { getOrder } = useOrderStore();
  const isClient = useIsClient();
  const cleanId = orderId.replace('#', '');
  // Only this exact order from this device's own history — never "the current order".
  const localOrder = isClient ? getOrder(cleanId) : null;
  const knownContact = localOrder?.customer?.email || '';

  const [contactInput, setContactInput] = React.useState('');
  const [submittedContact, setSubmittedContact] = React.useState('');
  const contact = submittedContact || knownContact;

  const [dbOrder, setDbOrder] = React.useState<OrderData | null>(null);
  const [loadState, setLoadState] = React.useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    if (!contact) return;
    let cancelled = false;
    async function loadDbOrder() {
      setLoadState('loading');
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(cleanId)}?contact=${encodeURIComponent(contact)}`, { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && json.success && json.data) {
          setDbOrder(parseOrderDoc(json.data));
          setLoadState('loaded');
        } else if (res.status === 403) {
          setLoadState('denied');
        } else if (res.status === 404) {
          setLoadState('not-found');
        } else {
          setErrorMessage(json.error || 'Unable to load this order right now.');
          setLoadState('error');
        }
      } catch {
        if (!cancelled) {
          setErrorMessage('Unable to connect. Please check your connection and try again.');
          setLoadState('error');
        }
      }
    }
    loadDbOrder();
    return () => { cancelled = true; };
  }, [cleanId, contact]);

  // The server's copy is authoritative. This device's own copy is only shown
  // while the order service is unreachable.
  const activeOrder = dbOrder || (loadState === 'error' ? localOrder : null);
  const items = activeOrder?.items || [];
  const customer: Partial<CheckoutInfo> = activeOrder?.customer || {};

  const total = Number(activeOrder?.total) || 0;
  // Saved orders keep the discount inside the customer JSON; a local draft has it on the order.
  const savedDiscount = customer as { discountCode?: string; discountAmount?: number };
  const discountCode = activeOrder?.discountCode || savedDiscount.discountCode || '';
  const discountAmount = Number(activeOrder?.discountAmount ?? savedDiscount.discountAmount) || 0;
  const paymentStatus = activeOrder?.paymentStatus || 'SUBMITTED';
  const orderDate = activeOrder?.createdAt ? new Date(activeOrder.createdAt) : null;

  if (!isClient || (contact && (loadState === 'idle' || loadState === 'loading'))) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center pt-24">
        <div className="w-8 h-8 border-2 border-electric-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeOrder && loadState !== 'denied') {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-white pt-24 pb-16 px-4 md:px-8 flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-6xl text-electric-lime mb-4">receipt_long</span>
        <h1 className="text-2xl font-headline-md mb-2">VIEW ORDER #{cleanId}</h1>
        <p className="text-gray-400 text-sm text-center max-w-md mb-6">
          {loadState === 'not-found'
            ? 'We could not find this order. Please check the order number.'
            : loadState === 'error'
              ? errorMessage
              : 'Enter the email address or mobile number used for this order to view the receipt.'}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (contactInput.trim()) setSubmittedContact(contactInput.trim());
          }}
          className="w-full max-w-md flex flex-col gap-3"
        >
          <input
            type="text"
            value={contactInput}
            onChange={(e) => setContactInput(e.target.value)}
            placeholder="Email or mobile number"
            className="w-full bg-black border border-gray-700 p-4 text-white focus:outline-none focus:border-electric-lime rounded"
          />
          <button type="submit" className="bg-electric-lime text-black px-6 py-3 font-bold font-label-caps rounded-lg hover:bg-white transition-colors">
            VIEW RECEIPT
          </button>
        </form>
      </div>
    );
  }

  if (loadState === 'denied') {
    return (
      <div className="bg-[#0a0a0a] min-h-screen text-white pt-24 pb-16 px-4 md:px-8 flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">lock</span>
        <h1 className="text-2xl font-headline-md mb-2">ACCESS DENIED</h1>
        <p className="text-gray-400 text-sm text-center max-w-md mb-6">
          You do not have permission to view this order. Orders can only be viewed by the person who placed them.
        </p>
        <Link href="/track-order" className="bg-electric-lime text-black px-6 py-3 font-bold font-label-caps rounded-lg hover:bg-white transition-colors">
          TRACK YOUR ORDER
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto border border-[#262626] bg-[#141414] rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Printable CSS Optimization */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: white !important; color: black !important; }
            .no-print { display: none !important; }
            .print-only-border { border: 1px solid #ddd !important; background: white !important; color: black !important; }
            .print-black-text { color: black !important; }
          }
        ` }} />

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-[#262626] no-print">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-headline-md tracking-wider">OFFICIAL RECEIPT</h1>
              {paymentStatus === 'VERIFIED' ? (
                <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold font-mono">
                  ✓ ORDER CONFIRMED & VERIFIED
                </span>
              ) : (
                <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-bold font-mono">
                  PAYMENT VERIFICATION PENDING
                </span>
              )}
            </div>
            <p className="text-xs text-[#a3a3a3] font-mono mt-1">ORDER ID: #{cleanId}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="bg-[#262626] hover:bg-[#333333] text-white font-label-caps px-4 py-2 rounded-lg text-xs uppercase font-bold transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              PRINT / DOWNLOAD RECEIPT (PDF)
            </button>
            <Link
              href={`/track-order?orderId=${cleanId}`}
              className="bg-electric-lime text-black hover:bg-white font-label-caps px-4 py-2 rounded-lg text-xs uppercase font-bold transition-all flex items-center gap-1.5"
            >
              TRACK ORDER
            </Link>
          </div>
        </div>

        {/* Receipt Body */}
        <div className="space-y-8">
          <div className="flex justify-between items-start border-b border-[#262626] pb-6">
            <div>
              <h2 className="text-3xl font-headline-md text-electric-lime tracking-widest print-black-text">CLAPCULTURE</h2>
              <p className="text-xs text-[#737373] mt-1 font-mono">STREETWEAR FOR THE CULTURE</p>
            </div>
            <div className="text-right text-xs font-mono text-[#a3a3a3]">
              <p className="text-white font-bold print-black-text">CLAPCULTURE INC.</p>
              <p>TAX INVOICE / ORDER RECEIPT</p>
              <p>Date: {orderDate && !Number.isNaN(orderDate.getTime()) ? orderDate.toLocaleDateString() : '—'}</p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#1a1a1a] p-4 rounded-xl border border-[#262626] print-only-border">
            <div>
              <span className="text-[10px] text-electric-lime font-mono uppercase font-bold tracking-wider">BILLED TO:</span>
              <p className="font-bold text-sm text-white mt-1 print-black-text">{customer.fullName || 'Customer'}</p>
              <p className="text-xs text-[#a3a3a3]">{customer.address ? `${customer.address}, ${customer.city || ''}, ${customer.state || ''} - ${customer.pincode || ''}` : 'Address on file'}</p>
            </div>
            <div className="md:text-right">
              <span className="text-[10px] text-electric-lime font-mono uppercase font-bold tracking-wider">CONTACT:</span>
              <p className="text-xs text-white mt-1 print-black-text">{customer.email || '—'}</p>
              <p className="text-xs text-[#a3a3a3]">{customer.phone || '—'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-[#262626] rounded-xl overflow-hidden print-only-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#1a1a1a] text-[#737373] uppercase font-mono border-b border-[#262626]">
                <tr>
                  <th className="p-3">Item</th>
                  <th className="p-3">Size</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {items.map((item: { name: string; size?: string; quantity?: number; price: number }, idx: number) => (
                  <tr key={idx} className="hover:bg-[#1a1a1a]/50">
                    <td className="p-3 font-bold text-white print-black-text">{item.name}</td>
                    <td className="p-3 font-mono text-[#a3a3a3]">{item.size || 'M'}</td>
                    <td className="p-3 text-center font-mono">{item.quantity || 1}</td>
                    <td className="p-3 text-right font-mono font-bold text-white print-black-text">{formatCurrency(item.price * (item.quantity || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="flex justify-between items-center pt-4 border-t border-[#262626]">
            <div className="text-xs text-[#737373] font-mono">
              <p>ALL TAXES INCLUDED</p>
              {discountAmount > 0 && (
                <p className="text-electric-lime print-black-text mt-1">DISCOUNT {discountCode}: -{formatCurrency(discountAmount)}</p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs text-[#a3a3a3] font-mono">TOTAL PAID:</span>
              <p className="text-3xl font-headline-md text-electric-lime print-black-text">{formatCurrency(total)}</p>
            </div>
          </div>

          {/* Developer Credit Footer */}
          <div className="text-center pt-6 border-t border-[#262626] text-[11px] font-label-caps text-[#737373]">
            Design and developed by <a href="https://vcard.stemlen.com/u/surendra" target="_blank" rel="noopener noreferrer" className="text-electric-lime font-bold hover:underline">surendra.codes</a>
          </div>
        </div>
      </div>
    </div>
  );
}
