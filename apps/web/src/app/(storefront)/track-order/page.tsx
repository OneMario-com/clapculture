/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useOrderStore, OrderData } from '@/lib/store';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const urlOrderId = useMemo(() => (searchParams.get('orderId') || '').replace('#', '').trim(), [searchParams]);
  const urlEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);

  const { getOrder } = useOrderStore();
  const [orderId, setOrderId] = useState(urlOrderId);
  const [email, setEmail] = useState(urlEmail);
  const [dbOrder, setDbOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Orders are only shown to someone who knows the email or phone number used
  // for them, so an order number alone can't reveal another customer's details.
  const fetchDbOrder = async (searchId: string, contact: string) => {
    if (!searchId.trim()) return;
    if (!contact.trim()) {
      setErrorMessage('Please enter the email address or mobile number used for this order.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    const cleanId = searchId.replace('#', '').trim();

    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(cleanId)}?contact=${encodeURIComponent(contact.trim())}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setErrorMessage('The email or mobile number does not match this order.');
        return;
      }
      if (res.status === 404) {
        setErrorMessage(`Order #${cleanId} not found. Please verify the order number.`);
        return;
      }
      if (res.ok) {
        if (json.success && json.data) {
          const doc = json.data;
          
          let parsedCustomer = doc.customer;
          if (typeof doc.customer === 'string') {
            try { parsedCustomer = JSON.parse(doc.customer); } catch {}
          }

          let parsedItems = doc.items;
          if (typeof doc.items === 'string') {
            try { parsedItems = JSON.parse(doc.items); } catch {}
          }

          const mappedOrder: OrderData = {
            orderId: String(doc.orderId || cleanId),
            customer: parsedCustomer || {},
            items: Array.isArray(parsedItems) ? parsedItems : [],
            subtotal: doc.subtotal || doc.total || 0,
            shipping: doc.shipping || 0,
            total: doc.total || 0,
            paymentStatus: doc.paymentStatus || 'SUBMITTED',
            orderStatus: doc.orderStatus || 'PLACED',
            transactionId: doc.transactionId,
            trackingNumber: doc.trackingNumber,
            createdAt: doc.$createdAt || new Date().toISOString(),
          };

          setDbOrder(mappedOrder);
          return;
        }
      }

      setErrorMessage(json.error || 'Unable to load this order right now. Please try again.');
    } catch {
      // Service unreachable: this device's own copy of the same order is the best we can show.
      const local = getOrder(cleanId);
      if (local && local.paymentStatus !== 'PENDING') {
        setDbOrder(local);
      } else {
        setErrorMessage('Unable to connect to order tracking service. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!urlOrderId) return;
    // Links from the confirmation page carry only the order number; the contact
    // comes from this device's own copy of that order, when it has one.
    const contact = urlEmail || getOrder(urlOrderId)?.customer?.email || '';
    const timer = setTimeout(() => {
      if (contact) {
        setEmail(contact);
        fetchDbOrder(urlOrderId, contact);
      }
    }, 0);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOrderId]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    fetchDbOrder(orderId, email);
  };

  const steps = [
    { 
      key: 'PLACED', 
      label: 'ORDER PLACED',
      completedDesc: 'Order details registered',
      activeDesc: 'Registering order details...',
      pendingDesc: 'Pending registration'
    },
    { 
      key: 'SUBMITTED', 
      label: 'PAYMENT SUBMITTED',
      completedDesc: 'UPI payment reference submitted',
      activeDesc: 'Awaiting payment reference submission',
      pendingDesc: 'Pending payment submission'
    },
    { 
      key: 'VERIFIED', 
      label: 'PAYMENT VERIFIED',
      completedDesc: 'Payment verified & approved',
      activeDesc: 'Finance team verifying UTR reference...',
      pendingDesc: 'Pending verification'
    },
    { 
      key: 'CONFIRMED', 
      label: 'ORDER CONFIRMED',
      completedDesc: 'Order confirmed by CLAPCULTURE team',
      activeDesc: 'Reviewing and confirming order...',
      pendingDesc: 'Pending order confirmation'
    },
    { 
      key: 'PROCESSING', 
      label: 'PROCESSING & PACKING',
      completedDesc: 'Quality checked & packed for dispatch',
      activeDesc: 'Currently packing & quality checking at hub',
      pendingDesc: 'Scheduled for packing'
    },
    { 
      key: 'SHIPPED', 
      label: 'SHIPPED / IN TRANSIT',
      completedDesc: 'Dispatched with express courier',
      activeDesc: 'In transit to your delivery destination',
      pendingDesc: 'Scheduled for dispatch'
    },
    { 
      key: 'DELIVERED', 
      label: 'DELIVERED',
      completedDesc: 'Package delivered to shipping address',
      activeDesc: 'Out for delivery to your doorstep',
      pendingDesc: 'Pending delivery'
    },
  ];

  // Determine current timeline step index strictly based on payment & order status
  // When a milestone is completed, the NEXT step becomes the active "In Progress" step
  const currentStepIndex = useMemo(() => {
    if (!dbOrder) return 0;
    
    const pStatus = (dbOrder.paymentStatus || '').toUpperCase();
    const oStatus = (dbOrder.orderStatus || '').toUpperCase();

    if (oStatus === 'DELIVERED') return 7; // All 7 steps complete!
    if (oStatus === 'SHIPPED') return 6; // DELIVERED is currently in progress
    if (oStatus === 'PROCESSING' || oStatus === 'PACKED') return 5; // SHIPPED is currently in progress
    if (oStatus === 'CONFIRMED' || pStatus === 'VERIFIED') return 4; // PROCESSING & PACKING is currently in progress
    if (pStatus === 'SUBMITTED') return 2; // PAYMENT VERIFICATION is in progress
    
    return 1; // PAYMENT SUBMISSION is in progress
  }, [dbOrder]);

  const isConfirmed = currentStepIndex >= 4;
  const isPaymentVerified = dbOrder?.paymentStatus === 'VERIFIED' || isConfirmed;

  return (
    <div className="min-h-screen bg-deep-black text-white pt-24 pb-12 px-4 md:px-8 max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="font-headline-xl text-5xl md:text-6xl uppercase">TRACK ORDER</h1>
        <p className="text-gray-400 mt-3 max-w-md mx-auto text-sm">
          Enter your order ID to view real-time shipment & verification status.
        </p>
      </div>

      {!dbOrder ? (
        <form onSubmit={handleTrack} className="bg-charcoal p-8 border border-gray-800 rounded-xl shadow-2xl space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-xs font-mono">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="block text-xs font-label-caps text-electric-lime mb-2 tracking-widest">
              ORDER ID *
            </label>
            <input 
              type="text" 
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g. CLAP01002"
              className="w-full bg-black border border-gray-700 p-4 text-white font-mono focus:outline-none focus:border-electric-lime text-base rounded"
            />
          </div>
          <div>
            <label className="block text-xs font-label-caps text-electric-lime mb-2 tracking-widest">
              EMAIL ADDRESS OR MOBILE USED FOR THE ORDER *
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email or mobile number"
              className="w-full bg-black border border-gray-700 p-4 text-white focus:outline-none focus:border-electric-lime text-base rounded"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-electric-lime text-black font-headline-md text-xl py-4 hover:bg-white transition-colors uppercase font-bold rounded cursor-pointer"
          >
            {loading ? 'CHECKING APPWRITE DATABASE...' : 'TRACK SHIPMENT NOW'}
          </button>
        </form>
      ) : (
        <div className="bg-charcoal p-8 border border-gray-800 rounded-xl shadow-2xl space-y-8 animate-in fade-in duration-300">
          {/* Order Header & Status Alert */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-6 gap-4">
            <div>
              <span className="text-xs text-electric-lime font-label-caps tracking-widest font-bold">
                LIVE SHIPMENT TIMELINE
              </span>
              <h2 className="font-headline-md text-3xl md:text-4xl text-white mt-1">
                ORDER #{dbOrder.orderId.replace('#', '')}
              </h2>
              {dbOrder.customer?.email && (
                <p className="text-xs text-gray-400 font-mono mt-1">Customer: {dbOrder.customer.email}</p>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {currentStepIndex === 7 ? (
                <span className="bg-[#25D366] text-black text-xs font-bold px-3 py-1.5 uppercase rounded tracking-wider font-mono">
                  🎉 ORDER DELIVERED
                </span>
              ) : currentStepIndex >= 6 ? (
                <span className="bg-electric-lime text-black text-xs font-bold px-3 py-1.5 uppercase rounded tracking-wider font-mono">
                  🚚 IN TRANSIT / DISPATCHED
                </span>
              ) : isPaymentVerified ? (
                <span className="bg-electric-lime text-black text-xs font-bold px-3 py-1.5 uppercase rounded tracking-wider font-mono">
                  ✓ ORDER CONFIRMED & VERIFIED
                </span>
              ) : (
                <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs font-bold px-3 py-1.5 uppercase rounded tracking-wider font-mono">
                  ⏳ PAYMENT VERIFICATION PENDING
                </span>
              )}
              <button 
                onClick={() => {
                  setDbOrder(null);
                  setOrderId('');
                  setErrorMessage('');
                }} 
                className="text-[11px] text-gray-400 hover:text-electric-lime underline font-label-caps cursor-pointer"
              >
                Search Another Order
              </button>
            </div>
          </div>

          {/* Tracking Timeline */}
          <div>
            <h3 className="font-headline-md text-xl text-white mb-6 uppercase tracking-wider">
              SHIPMENT PROGRESS
            </h3>
            
            {/* Perfectly Aligned Timeline: Each step has its own centered dot & connector */}
            <div className="space-y-0 pl-1">
              {steps.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isLast = idx === steps.length - 1;

                return (
                  <div key={step.key} className="flex items-start gap-4">
                    {/* Node Column: Dot + Vertical Line */}
                    <div className="flex flex-col items-center shrink-0 w-6">
                      {/* Node Circle */}
                      <div className="relative flex items-center justify-center">
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-electric-lime text-black flex items-center justify-center shadow-[0_0_8px_rgba(210,240,0,0.6)]">
                            <span className="text-[10px] font-bold">✓</span>
                          </div>
                        ) : isCurrent ? (
                          <div className="relative flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full border-2 border-electric-lime bg-black flex items-center justify-center shadow-[0_0_10px_rgba(210,240,0,0.7)]">
                              <div className="w-2 h-2 rounded-full bg-electric-lime animate-pulse" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-800 bg-[#141414] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-700" />
                          </div>
                        )}
                      </div>

                      {/* Connecting Line between steps */}
                      {!isLast && (
                        <div 
                          className={`w-0.5 min-h-[36px] my-1 transition-colors ${
                            idx < currentStepIndex ? 'bg-electric-lime' : 'bg-gray-800'
                          }`} 
                        />
                      )}
                    </div>

                    {/* Content Column */}
                    <div className={`grow pt-0 ${isLast ? 'pb-2' : 'pb-6'}`}>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-label-caps tracking-widest text-sm ${
                          isCompleted ? 'text-white font-semibold' : isCurrent ? 'text-electric-lime font-bold' : 'text-gray-500'
                        }`}>
                          {step.label}
                        </h4>
                        {isCurrent && (
                          <span className="bg-electric-lime/10 text-electric-lime border border-electric-lime/30 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${
                        isCurrent ? 'text-gray-200 font-medium' : isCompleted ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {isCompleted ? (step.completedDesc || '✓ Completed') : isCurrent ? (step.activeDesc || 'Active - Current Status') : (step.pendingDesc || 'Pending Verification')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Courier Tracking Number if available */}
            {dbOrder.trackingNumber && (
              <div className="mt-8 bg-[#141414] border border-electric-lime/40 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                    COURIER TRACKING / AWB NUMBER
                  </span>
                  <span className="text-base font-mono font-bold text-electric-lime tracking-wider">
                    {dbOrder.trackingNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-electric-lime/10 text-electric-lime border border-electric-lime/30 px-3 py-1 rounded text-xs font-mono font-bold">
                    {dbOrder.orderStatus === 'DELIVERED' ? 'DELIVERED' : 'IN TRANSIT'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Ordered Items Preview */}
          {dbOrder.items && dbOrder.items.length > 0 && (
            <div className="pt-6 border-t border-gray-800 space-y-4">
              <h3 className="font-headline-md text-lg text-white uppercase">ORDERED ITEMS</h3>
              <div className="space-y-3">
                {dbOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-black/40 p-3 rounded border border-gray-800 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-20 bg-charcoal border border-charcoal overflow-hidden shrink-0">
                        <img 
                          src={resolveImageUrl(item.image || '6a7fa922002c9b023447')} 
                          alt={item.name} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div>
                        <p className="font-bold text-white uppercase">{item.name}</p>
                        <p className="text-gray-400">Size: {item.size || 'M'} | Qty: {item.quantity || 1}</p>
                      </div>
                    </div>
                    <span className="font-mono text-electric-lime font-bold">
                      {formatCurrency(item.price * (item.quantity || 1))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 text-sm">
                <span className="text-gray-400 font-label-caps">TOTAL AMOUNT:</span>
                <span className="font-bold text-electric-lime text-xl font-mono">
                  {formatCurrency(dbOrder.total)}
                </span>
              </div>
            </div>
          )}
          
          <div className="pt-6 border-t border-gray-800 text-center">
            <Link 
              href={`/order/${dbOrder.orderId.replace('#', '')}`} 
              className="text-electric-lime underline font-label-caps text-xs tracking-widest hover:text-white transition-colors uppercase font-bold"
            >
              VIEW OFFICIAL RECEIPT & INVOICE →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-deep-black text-white flex items-center justify-center pt-24">
        <div className="w-8 h-8 border-2 border-electric-lime border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
