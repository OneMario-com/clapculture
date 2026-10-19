export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
export type PaymentStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  description: string;
  sizes: Size[];
  stock: number;
  badges?: string[];
  categoryId: string;
  sizeStock?: string | Record<string, number>;
  isActive?: boolean;
  freeShipping?: boolean;
  deliveryChargeEnabled?: boolean;
  deliveryFee?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productIds: string[];
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  size: Size;
  price: number;
  quantity: number;
  freeShipping?: boolean;
  deliveryChargeEnabled?: boolean;
  deliveryFee?: number;
}

export interface ShippingCalculation {
  fee: number;
  isFree: boolean;
  reason: 'all_free' | 'threshold' | 'custom' | 'standard';
}

type ShippableItem = Pick<CartItem, 'price' | 'quantity' | 'freeShipping' | 'deliveryChargeEnabled' | 'deliveryFee'>;

/**
 * Shipping fee rule shared by the cart (what the customer is shown and pays)
 * and the order API (what gets recorded), so the two can never disagree.
 */
export function calculateShipping(items: ShippableItem[], threshold = 999, defaultFee = 49): ShippingCalculation {
  if (items.length === 0) {
    return { fee: 0, isFree: true, reason: 'all_free' };
  }

  // 1. If ALL items in cart have freeShipping: true
  if (items.every((item) => item.freeShipping === true)) {
    return { fee: 0, isFree: true, reason: 'all_free' };
  }

  // 2. If any items have custom delivery charge enabled
  const itemsWithCustomFee = items.filter(
    (item) => item.deliveryChargeEnabled && typeof item.deliveryFee === 'number' && item.deliveryFee > 0
  );
  if (itemsWithCustomFee.length > 0) {
    const maxCustomFee = Math.max(...itemsWithCustomFee.map((i) => i.deliveryFee || 0));
    return { fee: maxCustomFee, isFree: false, reason: 'custom' };
  }

  // 3. Store threshold policy (Free above threshold, otherwise default shipping fee)
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  if (subtotal >= threshold) {
    return { fee: 0, isFree: true, reason: 'threshold' };
  }

  return { fee: defaultFee, isFree: false, reason: 'standard' };
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  size: Size;
  price: number;
  quantity: number;
  freeShipping?: boolean;
  deliveryChargeEnabled?: boolean;
  deliveryFee?: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  shipping?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  isArchived?: boolean;
}

export interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  orders: string[];
}

export interface Discount {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  active: boolean;
}

export interface Settings {
  storeName: string;
  currency: string;
  freeShippingThreshold: number;
  shippingFee?: number;
}

export interface HomepageSection {
  id: string;
  type: 'HERO' | 'PROMO' | 'COLLECTION' | 'FEATURED_PRODUCTS';
  title?: string;
  subtitle?: string;
  content: any;
}
export type Env = { APPWRITE_ENDPOINT: string; APPWRITE_PROJECT_ID: string; APPWRITE_API_KEY: string; APPWRITE_DATABASE_ID: string; JWT_SECRET: string; FRONTEND_URL: string; };
