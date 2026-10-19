'use client';

import React, { createContext, useContext, useState, useEffect, useSyncExternalStore, ReactNode } from 'react';
import { CartItem, OrderStatus, PaymentStatus } from '@clapculture/shared';

// ─── Types ───────────────────────────────────────────────────────────
export interface CheckoutInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  pincode: string;
}

export interface OrderData {
  orderId: string;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  customer: CheckoutInfo;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
  transactionId?: string;
  screenshotUrl?: string;
  discountCode?: string;
  discountAmount?: number;
  trackingNumber?: string;
}

// ─── Context ─────────────────────────────────────────────────────────
interface OrderStoreContextType {
  // Checkout info
  checkoutInfo: CheckoutInfo;
  setCheckoutInfo: (info: CheckoutInfo) => void;

  // Current order
  currentOrder: OrderData | null;
  createOrder: (
    orderId: string,
    items: CartItem[],
    subtotal: number,
    shipping: number,
    customer: CheckoutInfo,
    discount?: { code: string; amount: number } | null
  ) => void;
  completeOrder: (draftOrderId: string, saved: Partial<OrderData> & { orderId: string }) => void;
  getOrder: (orderId: string) => OrderData | null;

  // Order history (session-based)
  orders: OrderData[];
}

const emptyCheckoutInfo: CheckoutInfo = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  apartment: '',
  city: '',
  state: '',
  pincode: '',
};

const normalizeOrderId = (orderId: string) => String(orderId || '').replace('#', '').trim().toUpperCase();
const isSameOrderId = (a: string, b: string) => normalizeOrderId(a) === normalizeOrderId(b);

const OrderStoreContext = createContext<OrderStoreContextType | undefined>(undefined);

export function OrderStoreProvider({ children }: { children: ReactNode }) {
  const [checkoutInfo, setCheckoutInfoState] = useState<CheckoutInfo>(() => {
    if (typeof window === 'undefined') return emptyCheckoutInfo;
    try {
      const stored = sessionStorage.getItem('cc_checkout');
      return stored ? JSON.parse(stored) : emptyCheckoutInfo;
    } catch {
      return emptyCheckoutInfo;
    }
  });

  const [orders, setOrders] = useState<OrderData[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = sessionStorage.getItem('cc_orders');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [currentOrder, setCurrentOrder] = useState<OrderData | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = sessionStorage.getItem('cc_current_order');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Persist to sessionStorage on changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cc_checkout', JSON.stringify(checkoutInfo));
      } catch (e) {
        console.error('Failed to save checkoutInfo:', e);
      }
    }
  }, [checkoutInfo]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('cc_orders', JSON.stringify(orders));
      } catch (e) {
        console.error('Failed to save orders:', e);
      }
    }
  }, [orders]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (currentOrder) {
          sessionStorage.setItem('cc_current_order', JSON.stringify(currentOrder));
        } else {
          sessionStorage.removeItem('cc_current_order');
        }
      } catch (e) {
        console.error('Failed to save currentOrder:', e);
      }
    }
  }, [currentOrder]);

  const setCheckoutInfo = (info: CheckoutInfo) => {
    setCheckoutInfoState(info);
  };

  const createOrder = (
    orderId: string,
    items: CartItem[],
    subtotal: number,
    shipping: number,
    customer: CheckoutInfo,
    discount?: { code: string; amount: number } | null
  ) => {
    const order: OrderData = {
      orderId,
      items,
      subtotal,
      shipping,
      total: subtotal + shipping - (discount?.amount || 0),
      discountCode: discount?.code,
      discountAmount: discount?.amount,
      customer,
      paymentStatus: 'PENDING',
      orderStatus: 'PLACED',
      createdAt: new Date().toISOString(),
    };
    setCurrentOrder(order);
    // Replace (never duplicate) an entry with the same id: a second checkout that
    // reused an id used to leave the old cart first in the list, so the payment
    // page showed — and submitted — the previous cart's items.
    setOrders((prev) => [...prev.filter((o) => !isSameOrderId(o.orderId, orderId)), order]);
  };

  // Called once the server has saved the order. The saved order number can
  // differ from the one reserved at checkout (if that number was taken).
  const completeOrder = (draftOrderId: string, saved: Partial<OrderData> & { orderId: string }) => {
    const draft = orders.find((o) => isSameOrderId(o.orderId, draftOrderId)) || null;
    const base = draft || (currentOrder && isSameOrderId(currentOrder.orderId, draftOrderId) ? currentOrder : null);
    const completed: OrderData = {
      ...(base || ({} as OrderData)),
      ...saved,
      orderId: saved.orderId.replace('#', '').trim(),
      paymentStatus: saved.paymentStatus || 'SUBMITTED',
    };
    setCurrentOrder(completed);
    setOrders((prev) => [
      ...prev.filter((o) => !isSameOrderId(o.orderId, draftOrderId) && !isSameOrderId(o.orderId, completed.orderId)),
      completed,
    ]);
  };

  const getOrder = (orderId: string): OrderData | null => {
    // Newest first, in case older sessions stored duplicates.
    const found = [...orders].reverse().find((o) => isSameOrderId(o.orderId, orderId));
    if (found) return found;
    if (currentOrder && isSameOrderId(currentOrder.orderId, orderId)) {
      return currentOrder;
    }
    return null;
  };

  return React.createElement(
    OrderStoreContext.Provider,
    {
      value: {
        checkoutInfo,
        setCheckoutInfo,
        currentOrder,
        createOrder,
        completeOrder,
        getOrder,
        orders,
      },
    },
    children
  );
}

const noopSubscribe = () => () => {};

/**
 * False during server rendering and hydration, true afterwards. Pages that
 * render from browser-only order data use it to avoid hydration mismatches.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function useOrderStore() {
  const context = useContext(OrderStoreContext);
  if (context === undefined) {
    throw new Error('useOrderStore must be used within an OrderStoreProvider');
  }
  return context;
}
