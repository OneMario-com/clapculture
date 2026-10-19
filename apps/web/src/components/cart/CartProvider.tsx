'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product, Size, ShippingCalculation, calculateShipping } from '@clapculture/shared';

export type { ShippingCalculation };

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, size: Size, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  getShippingFee: (threshold?: number, defaultFee?: number) => ShippingCalculation;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// A cart holds at most one line per product + size, so that pair is a stable unique line id.
const cartLineId = (productId: string, size: string) => `${productId}-${size}`;

// Carts saved by older builds gave every line the same id ("#CLAP01001"), which made
// remove/update act on every line at once. Re-key them and merge duplicate lines.
function normalizeStoredCart(stored: CartItem[]): CartItem[] {
  const lines = new Map<string, CartItem>();
  for (const item of Array.isArray(stored) ? stored : []) {
    if (!item || !item.productId) continue;
    const id = cartLineId(item.productId, item.size);
    const existing = lines.get(id);
    lines.set(id, existing ? { ...existing, quantity: existing.quantity + item.quantity } : { ...item, id });
  }
  return [...lines.values()];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage only after component mounts on client (deferred a
  // tick, so the first client render matches the server-rendered empty cart)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem('clapculture_cart');
        if (stored) {
          setItems(normalizeStoredCart(JSON.parse(stored)));
        }
      } catch (e) {
        console.error('Failed to load cart from localStorage', e);
      }
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save to localStorage only after initial client hydration
  useEffect(() => {
    if (isHydrated) {
      try {
        localStorage.setItem('clapculture_cart', JSON.stringify(items));
      } catch (err) {
        console.error('Failed to save cart to localStorage', err);
      }
    }
  }, [items, isHydrated]);

  const addToCart = (product: Product, size: Size, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id && item.size === size);
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                freeShipping: product.freeShipping,
                deliveryChargeEnabled: product.deliveryChargeEnabled,
                deliveryFee: product.deliveryFee,
              }
            : item
        );
      }
      const newItem: CartItem = {
        id: cartLineId(product.id, size),
        productId: product.id,
        name: product.name,
        image: product.images[0] || '',
        size,
        price: product.price,
        quantity,
        freeShipping: product.freeShipping || false,
        deliveryChargeEnabled: product.deliveryChargeEnabled || false,
        deliveryFee: typeof product.deliveryFee === 'number' ? product.deliveryFee : undefined,
      };
      return [...prev, newItem];
    });
    setIsDrawerOpen(true);
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setItems([]);

  const getCartTotal = () => items.reduce((total, item) => total + item.price * item.quantity, 0);

  const getCartCount = () => items.reduce((count, item) => count + item.quantity, 0);

  const getShippingFee = (threshold = 999, defaultFee = 49): ShippingCalculation =>
    calculateShipping(items, threshold, defaultFee);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        getShippingFee,
        isDrawerOpen,
        setIsDrawerOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
