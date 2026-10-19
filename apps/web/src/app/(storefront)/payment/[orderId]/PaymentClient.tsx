/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import { useCart } from '@/components/cart/CartProvider';
import { useOrderStore, OrderData, useIsClient } from '@/lib/store';

import { compressImageFile } from '@/lib/image-compression';

export default function PaymentClient({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { clearCart } = useCart();
  const { getOrder, completeOrder } = useOrderStore();
  const isClient = useIsClient();

  const cleanOrderId = (orderId || '').replace('#', '').trim();
  const formattedOrderId = cleanOrderId.startsWith('CLAP') ? cleanOrderId : `CLAP${cleanOrderId}`;

  // The order isn't in the database until payment is submitted, so this page
  // only ever shows this checkout's own draft — never another order's data.
  const [order] = useState<OrderData | null>(() => {
    const memoryOrder = getOrder(cleanOrderId);
    if (memoryOrder) return memoryOrder;
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`cc_order_${cleanOrderId}`);
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return null;
  });

  const total = Number(order?.total) || 0;

  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [errors, setErrors] = useState<{ utr?: string; screenshot?: string }>({});

  const upiId = '8639654299@ybl';
  const upiIntentString = `upi://pay?pa=${upiId}&pn=CLAPCULTURE&am=${total}&cu=INR&tn=Order%20${formattedOrderId}`;
  // Use the static QR code image as primary display
  const qrCodeUrl = resolveImageUrl('/qrcode.png');

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image client-side to save bandwidth and speed up upload
      const optimized = await compressImageFile(file, { maxWidth: 1400, quality: 0.82 });
      setScreenshotFile(optimized);
      setScreenshotUrl(URL.createObjectURL(optimized));
      // Clear screenshot error on upload
      setErrors((prev) => { const next = { ...prev }; delete next.screenshot; return next; });
    }
  };

  const validatePayment = (): boolean => {
    const newErrors: { utr?: string; screenshot?: string } = {};

    if (!screenshotUrl || !screenshotFile) {
      newErrors.screenshot = 'Payment screenshot is required. Please upload your payment confirmation screenshot.';
    }

    const cleanUtr = utrNumber.replace(/\D/g, '');
    if (!cleanUtr) {
      newErrors.utr = 'UTR / Reference number is required.';
    } else if (cleanUtr.length !== 12) {
      newErrors.utr = `UTR must be exactly 12 digits (you entered ${cleanUtr.length} digits).`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate both UTR and screenshot before submitting
    if (!validatePayment()) return;

    setIsSubmitting(true);

    if (!order) return;

    // 1. Upload compressed payment screenshot to Appwrite Storage media bucket
    let uploadedScreenshotUrl = '';
    try {
      const optimizedFile = await compressImageFile(screenshotFile as File, { maxWidth: 1400, quality: 0.82 });
      const formData = new FormData();
      formData.append('file', optimizedFile);
      const uploadRes = await fetch('/api/payments/upload-proof', {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success && uploadData.data?.url) {
        uploadedScreenshotUrl = uploadData.data.url;
      } else if (uploadData.success && uploadData.data?.fileId) {
        uploadedScreenshotUrl = uploadData.data.fileId;
      } else {
        setErrors((prev) => ({ ...prev, screenshot: uploadData.error || 'Screenshot upload failed. Please try again.' }));
      }
    } catch (err) {
      console.error('Error uploading payment screenshot to storage:', err);
      setErrors((prev) => ({ ...prev, screenshot: 'Screenshot upload failed. Please check your connection and try again.' }));
    }
    if (!uploadedScreenshotUrl) {
      setIsSubmitting(false);
      return;
    }

    // 2. Submit payment and register official order in database.
    // The server re-prices the items from the catalog and assigns the final order number.
    let savedOrder: Record<string, unknown>;
    try {
      const orderPayload = {
        orderId: formattedOrderId,
        customer: order.customer,
        items: order.items,
        total: order.total,
        transactionId: utrNumber.trim(),
        screenshotUrl: uploadedScreenshotUrl,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success || !resJson.data?.orderId) {
        setErrors((prev) => ({ ...prev, utr: resJson.error || 'Failed to submit payment. Please verify your UTR.' }));
        setIsSubmitting(false);
        return;
      }
      savedOrder = resJson.data;
    } catch (err) {
      console.error('Error submitting order to database:', err);
      setErrors((prev) => ({ ...prev, utr: 'Network error. Please try submitting again.' }));
      setIsSubmitting(false);
      return;
    }

    const finalOrderId = String(savedOrder.orderId).replace('#', '');
    completeOrder(cleanOrderId, {
      orderId: finalOrderId,
      transactionId: utrNumber.trim(),
      screenshotUrl: uploadedScreenshotUrl,
      paymentStatus: 'SUBMITTED',
      subtotal: Number(savedOrder.subtotal) || order.subtotal,
      shipping: Number(savedOrder.shipping) || 0,
      total: Number(savedOrder.total) || order.total,
    });
    try {
      localStorage.removeItem(`cc_order_${cleanOrderId}`);
    } catch {}

    clearCart();
    router.push(`/order-success/${finalOrderId}`);
  };

  // The draft lives in browser storage, so render nothing order-specific until
  // hydration is done (the server can't know it and the markup must match).
  if (!isClient) {
    return (
      <div className="bg-deep-black min-h-screen flex items-center justify-center pt-24">
        <div className="w-8 h-8 border-2 border-electric-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-deep-black min-h-screen text-white pt-24 pb-16 px-4 flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">receipt_long</span>
        <h1 className="text-2xl font-headline-md mb-2 uppercase">Checkout session not found</h1>
        <p className="text-gray-400 text-sm max-w-md mb-6">
          We couldn&apos;t find the details for order #{cleanOrderId} on this device. If you already paid, track your order instead; otherwise start checkout again from your cart.
        </p>
        <div className="flex gap-3">
          <Link href="/cart" className="bg-electric-lime text-black px-6 py-3 font-bold font-label-caps hover:bg-white transition-colors">BACK TO CART</Link>
          <Link href="/track-order" className="border border-white px-6 py-3 font-bold font-label-caps hover:bg-white hover:text-black transition-colors">TRACK ORDER</Link>
        </div>
      </div>
    );
  }

  if (order.paymentStatus && order.paymentStatus !== 'PENDING') {
    return (
      <div className="bg-deep-black min-h-screen text-white pt-24 pb-16 px-4 flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-6xl text-electric-lime mb-4">check_circle</span>
        <h1 className="text-2xl font-headline-md mb-2 uppercase">Payment already submitted</h1>
        <p className="text-gray-400 text-sm max-w-md mb-6">Payment details for order #{cleanOrderId} have already been submitted.</p>
        <Link href={`/order/${cleanOrderId}`} className="bg-electric-lime text-black px-6 py-3 font-bold font-label-caps hover:bg-white transition-colors">VIEW ORDER</Link>
      </div>
    );
  }

  return (
    <div className="bg-deep-black min-h-screen text-white pt-24 pb-16 px-4 md:px-8">
      <div className="max-w-2xl mx-auto border border-charcoal bg-[#141414] rounded-2xl p-6 md:p-10 shadow-2xl">
        <div className="text-center mb-8 border-b border-charcoal pb-6">
          <span className="font-label-caps text-xs text-electric-lime tracking-widest uppercase font-bold">STEP 2 OF 2</span>
          <h1 className="text-3xl md:text-5xl font-headline-md tracking-wider mt-1">SCAN & PAY VIA UPI</h1>
          <p className="text-sm text-gray-400 mt-2 font-body-sm">
            Complete your payment using any UPI App (GPay, PhonePe, Paytm, CRED).
          </p>
        </div>

        {/* Amount Card */}
        <div className="bg-[#1a1a1a] border border-charcoal rounded-xl p-4 mb-8 flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 font-label-caps">AMOUNT TO PAY</span>
            <p className="text-3xl font-headline-md text-electric-lime">{formatCurrency(total)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 font-label-caps">ORDER ID</span>
            <p className="text-sm font-mono font-bold text-white">#{orderId}</p>
          </div>
        </div>

        {/* QR Code & UPI ID Section */}
        <div className="flex flex-col items-center bg-[#1a1a1a] border border-charcoal rounded-xl p-6 mb-8 text-center">
          <div className="bg-white p-3 rounded-xl mb-4 border-2 border-electric-lime">

            <img src={qrCodeUrl} alt="UPI QR Code" className="w-56 h-56 object-contain" />
          </div>

          <div className="w-full max-w-sm flex items-center justify-between bg-deep-black border border-charcoal rounded-lg p-3 mb-3">
            <div>
              <span className="text-[10px] text-gray-500 font-label-caps uppercase block text-left">UPI ID</span>
              <span className="text-sm font-mono font-bold text-white">{upiId}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyUpi}
              className="bg-charcoal hover:bg-electric-lime hover:text-black text-white px-3 py-1.5 rounded text-xs font-label-caps uppercase font-bold transition-all cursor-pointer"
            >
              {copiedUpi ? 'COPIED!' : 'COPY'}
            </button>
          </div>

          <a
            href={upiIntentString}
            className="w-full max-w-sm bg-[#25D366]/10 hover:bg-[#25D366] text-[#25D366] hover:text-black border border-[#25D366]/40 py-2.5 px-4 rounded-lg text-xs font-bold font-mono tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            <span>📱</span> TAP TO OPEN UPI APP (GPay / PhonePe / Paytm)
          </a>
        </div>

        {/* Payment Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-label-caps uppercase text-gray-300 mb-2">
              1. UPLOAD PAYMENT SCREENSHOT *
            </label>
            <div className={`border-2 border-dashed ${errors.screenshot ? 'border-red-500' : 'border-charcoal hover:border-electric-lime'} rounded-xl p-6 text-center cursor-pointer transition-all bg-[#1a1a1a]`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="screenshot-upload"
              />
              <label htmlFor="screenshot-upload" className="cursor-pointer block">
                {screenshotUrl ? (
                  <div className="flex flex-col items-center">

                    <img src={screenshotUrl} alt="Preview" className="h-32 object-contain rounded mb-2 border border-electric-lime" />
                    <span className="text-xs text-electric-lime font-bold">Click to change screenshot</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="material-symbols-outlined text-4xl text-electric-lime mb-2">file_upload</span>
                    <span className="text-sm text-white font-bold">Click to upload payment screenshot</span>
                    <span className="text-xs text-gray-500 mt-1">Supports PNG, JPG, WebP</span>
                  </div>
                )}
              </label>
            </div>
            {errors.screenshot && <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.screenshot}</p>}
          </div>

          <div>
            <label className="block text-xs font-label-caps uppercase text-gray-300 mb-2">
              2. ENTER 12-DIGIT UTR / REFERENCE NUMBER *
            </label>
            <input
              type="text"
              placeholder="e.g. 423987123984"
              value={utrNumber}
              onChange={(e) => {
                setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12));
                if (errors.utr) setErrors((prev) => { const next = { ...prev }; delete next.utr; return next; });
              }}
              className={`w-full bg-[#1a1a1a] border ${errors.utr ? 'border-red-500' : 'border-charcoal'} rounded-lg p-3 text-white font-mono focus:border-electric-lime outline-none`}
            />
            {errors.utr && <p className="text-red-500 text-xs mt-1.5 font-semibold">{errors.utr}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !screenshotUrl || utrNumber.length < 12}
            className="w-full bg-electric-lime text-black font-label-caps font-bold text-base py-4 rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest"
          >
            {isSubmitting ? 'VERIFYING PAYMENT...' : 'CONFIRM PAYMENT & COMPLETE ORDER →'}
          </button>
        </form>

        {/* WhatsApp Payment Help Callout */}
        <div className="mt-6 p-4 bg-[#141414] border border-charcoal rounded-xl text-center">
          <p className="text-xs text-gray-400 mb-2">
            Facing payment issues or want to send screenshot directly?
          </p>
          <a
            href={`https://wa.me/917569684299?text=${encodeURIComponent(`Hi CLAPCULTURE, I need help with payment for Order #${orderId}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-xs font-bold text-[#25D366] hover:underline font-mono bg-[#25D366]/10 border border-[#25D366]/30 py-2 px-4 rounded-lg transition-all hover:bg-[#25D366]/20"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            <span>WhatsApp Support: +91 7569684299</span>
          </a>
        </div>
      </div>
    </div>
  );
}
