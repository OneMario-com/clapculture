/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product, Size } from '@clapculture/shared';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import { useCart } from '../cart/CartProvider';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<Size>(product.sizes[0] || 'M');

  const primaryImage = resolveImageUrl(product.images[0] || '6a7fa922002c9b023447');
  const secondaryImage = resolveImageUrl(product.images[1]) || primaryImage;
  const isOutOfStock = product.stock <= 0;

  const handleConfirmAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, selectedSize, 1);
    setIsSizeModalOpen(false);
  };

  return (
    <>
      <div 
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative bg-charcoal aspect-4/5 mb-4 overflow-hidden">
          <Link href={`/product/${product.slug}`} prefetch={false}>
            <img 
              src={isHovered ? secondaryImage : primaryImage} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
          </Link>
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10">
            {isOutOfStock ? (
              <span className="bg-rose-600 text-white text-[10px] md:text-xs font-black tracking-wider px-2.5 py-1 uppercase shadow-md">
                SOLD OUT
              </span>
            ) : (
              <>
                {product.freeShipping && (
                  <span className="bg-electric-lime text-black text-[10px] md:text-xs font-black tracking-wider px-2 py-0.5 uppercase shadow-md flex items-center gap-1 font-mono">
                    <span>🚚</span> FREE DELIVERY
                  </span>
                )}
                {product.deliveryChargeEnabled && typeof product.deliveryFee === 'number' && product.deliveryFee > 0 && (
                  <span className="bg-black/90 text-purple-300 border border-purple-500/50 text-[10px] md:text-xs font-mono font-bold tracking-wider px-2 py-0.5 uppercase shadow-md">
                    Delivery: ₹{product.deliveryFee}
                  </span>
                )}
                {product.badges?.map((badge, idx) => {
                  let bgColor = 'bg-white';
                  let textColor = 'text-black';
                  if (badge.toUpperCase() === 'NEW' || badge.toUpperCase() === 'IN STOCK') { bgColor = 'bg-electric-lime'; textColor = 'text-black'; }
                  if (badge.toUpperCase() === 'LIMITED' || badge.toUpperCase() === 'SOLD OUT') { bgColor = 'bg-rose-600'; textColor = 'text-white'; }
                  if (badge.toUpperCase() === '320 GSM') { bgColor = 'bg-black/80 text-electric-lime border border-electric-lime/50'; textColor = 'text-electric-lime'; }
                  
                  return (
                    <span key={idx} className={`${bgColor} ${textColor} text-[10px] md:text-xs font-black tracking-wider px-2.5 py-1 uppercase shadow-md`}>
                      {badge}
                    </span>
                  );
                })}
              </>
            )}
          </div>

          {/* Sold Out Dark Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 pointer-events-none z-5" />
          )}

          <button 
            type="button"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-electric-lime hover:text-black transition-colors text-white z-10 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">favorite</span>
          </button>

          {/* Quick Add Button */}
          <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0 z-10">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isOutOfStock) {
                  setIsSizeModalOpen(true);
                }
              }}
              disabled={isOutOfStock}
              className={`w-full font-black py-3 uppercase text-xs tracking-wider transition-all cursor-pointer ${
                isOutOfStock 
                  ? 'bg-neutral-900/90 text-neutral-400 border border-neutral-700 cursor-not-allowed opacity-90' 
                  : 'bg-electric-lime text-black hover:bg-white hover:text-black shadow-xl font-bold'
              }`}
            >
              {isOutOfStock ? 'SOLD OUT' : 'SELECT SIZE & ADD'}
            </button>
          </div>
        </div>
        
        <div>
          <Link href={`/product/${product.slug}`} prefetch={false}>
            <h3 className="font-bold text-lg mb-1 hover:text-electric-lime transition-colors line-clamp-1">{product.name}</h3>
          </Link>
          <div className="flex items-center gap-2 mb-3" suppressHydrationWarning>
            <span className="text-white font-bold" suppressHydrationWarning>{formatCurrency(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-gray-500 line-through text-sm" suppressHydrationWarning>{formatCurrency(product.compareAtPrice)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Size Selection Modal */}
      {isSizeModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsSizeModalOpen(false)}
        >
          <div 
            className="bg-[#141414] border border-charcoal rounded-xl max-w-md w-full p-6 text-white shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsSizeModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex gap-4 mb-6 pb-4 border-b border-charcoal">
              <img src={primaryImage} alt={product.name} className="w-16 h-20 object-cover rounded border border-gray-800" />
              <div>
                <h4 className="font-bold text-base line-clamp-1">{product.name}</h4>
                <p className="text-electric-lime font-bold mt-1">{formatCurrency(product.price)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Stock: <span className="text-white font-mono">{product.stock} items available</span>
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-label-caps text-gray-400 mb-3 tracking-widest">
                SELECT YOUR SIZE:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((sz) => {
                  const isAvailable = product.sizes.includes(sz as Size);
                  const isSelected = selectedSize === sz;

                  return (
                    <button
                      key={sz}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setSelectedSize(sz as Size)}
                      className={`py-3 text-xs font-bold rounded transition-all border ${
                        !isAvailable
                          ? 'bg-charcoal/40 border-gray-800 text-gray-600 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-electric-lime text-black border-electric-lime shadow-lg'
                          : 'bg-charcoal border-gray-700 text-white hover:border-electric-lime'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleConfirmAddToCart}
              className="w-full bg-electric-lime text-black font-headline-md text-lg py-4 uppercase font-bold hover:bg-white transition-colors"
            >
              ADD SIZE ({selectedSize}) TO CART
            </button>
          </div>
        </div>
      )}
    </>
  );
}
