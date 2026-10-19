'use client';

import React from 'react';
import { useCart } from './CartProvider';
import { CartItem } from './CartItem';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export function CartDrawer() {
  const { items, isDrawerOpen, setIsDrawerOpen, getCartTotal, getShippingFee } = useCart();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    if (mounted) {
      setTimeout(() => setMounted(true), 0);
    }
    return () => { mounted = false; };
  }, []);

  if (!mounted) {
    return null;
  }

  const total = getCartTotal();
  const shippingInfo = getShippingFee();
  const freeShippingThreshold = 999;
  const progress = Math.min((total / freeShippingThreshold) * 100, 100);
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - total);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-100 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsDrawerOpen(false)}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-100 bg-deep-black border-l border-charcoal z-101 transform transition-transform duration-300 ease-in-out flex flex-col ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-charcoal">
          <h2 className="font-headline-md text-2xl uppercase">YOUR CART ({items.length})</h2>
          <button 
            onClick={() => setIsDrawerOpen(false)}
            className="text-white hover:text-electric-lime transition-colors"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Free Shipping Bar */}
        <div className="p-4 bg-charcoal/50 border-b border-charcoal">
          {shippingInfo.isFree ? (
            <p className="text-xs text-center mb-2 font-bold uppercase text-electric-lime flex items-center justify-center gap-1">
              <span>🚚</span> {shippingInfo.reason === 'all_free' ? 'Free Delivery on all items in your cart!' : 'You unlocked free shipping!'}
            </p>
          ) : (
            <>
              <p className="text-xs text-center mb-2 font-bold uppercase">
                {shippingInfo.reason === 'custom' ? (
                  <span>Standard Delivery: <strong className="text-electric-lime">{formatCurrency(shippingInfo.fee)}</strong></span>
                ) : (
                  <>Add <span className="text-electric-lime">{formatCurrency(remainingForFreeShipping)}</span> more for free shipping!</>
                )}
              </p>
              {shippingInfo.reason !== 'custom' && (
                <div className="h-1.5 w-full bg-deep-black rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-electric-lime transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          {items.length > 0 ? (
            <div className="flex flex-col">
              {items.map(item => (
                <CartItem key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="material-symbols-outlined text-6xl mb-4 opacity-20">shopping_bag</span>
              <p className="font-bold uppercase tracking-wider text-sm mb-6">Your cart is empty</p>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="bg-white text-black font-label-caps px-6 py-3 uppercase text-xs hover:bg-electric-lime transition-colors"
              >
                Start Shopping
              </button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-charcoal bg-deep-black mt-auto">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold uppercase text-sm text-gray-400">Subtotal</span>
              <span className="font-headline-md text-xl">{formatCurrency(total)}</span>
            </div>
            <p className="text-[10px] text-gray-500 text-center mb-4 uppercase tracking-wider">
              Taxes and shipping calculated at checkout
            </p>
            <div className="flex flex-col gap-2">
              <Link href="/checkout" onClick={() => setIsDrawerOpen(false)}>
                <button className="w-full bg-electric-lime text-black font-label-caps px-4 py-4 uppercase font-bold text-sm hover:bg-white transition-colors">
                  PROCEED TO CHECKOUT
                </button>
              </Link>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="w-full border border-charcoal text-white font-label-caps px-4 py-3 uppercase text-xs hover:border-white transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
