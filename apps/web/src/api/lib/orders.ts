/**
 * Order helpers: collision-free order numbers, order lookups, customer
 * contact verification and server-side pricing.
 *
 * Order numbers (CLAP01005, …) used to be computed as "highest existing + 1"
 * at checkout, minutes before the order was saved. Two shoppers checking out
 * at the same time got the same number, and the second submission overwrote
 * the first customer's order. Now:
 *   - numbers come from an atomic Redis counter (or, without Redis, a database
 *     scan made safe by the next point);
 *   - new orders use the order number as their Appwrite document $id, so
 *     Appwrite itself rejects a duplicate (409) and we retry with a new number;
 *   - a storefront submission can never update an existing order.
 */
import { Context } from 'hono';
import { Databases, Models, Query } from 'node-appwrite';
import { CartItem, calculateShipping } from '@clapculture/shared';
import { getAppwriteClient } from './appwrite';
import { getDbId, getEnv } from './utils';
import { cached } from './cache';
import { redis } from './redis';
import { getAllProducts } from './catalog';

export type OrderDoc = Models.Document & Record<string, unknown>;

const ORDERS = 'orders';
const ORDER_NUMBER_FLOOR = 1000;
const ORDER_NUMBER_CEILING = 10_000_000;
const SEQUENCE_KEY = 'cc:order_seq';
const RESERVATION_TTL_SECONDS = 48 * 60 * 60;
const ADMIN_LIST_LIMIT = 250;
const MAX_LINE_QUANTITY = 50;

const errorCode = (e: unknown) => (e as { code?: number } | null)?.code;
export const isNotFoundError = (e: unknown) => errorCode(e) === 404;

// ─── Order numbers ───────────────────────────────────────────────────

export function formatOrderId(orderNumber: number): string {
  return `CLAP${String(orderNumber).padStart(5, '0')}`;
}

export function parseOrderNumber(raw: unknown): number | null {
  const match = String(raw ?? '').replace(/#/g, '').trim().match(/^CLAP(\d{1,9})$/i);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n > ORDER_NUMBER_FLOOR && n < ORDER_NUMBER_CEILING ? n : null;
}

/** Highest order number in the database (reads only the orderId field of the newest orders). */
async function highestOrderNumberInDb(databases: Databases, dbId: string): Promise<number> {
  const list = await databases.listDocuments(dbId, ORDERS, [
    Query.orderDesc('$createdAt'),
    Query.limit(100),
    Query.select(['orderId']),
  ]);
  let highest = ORDER_NUMBER_FLOOR;
  for (const doc of list.documents) {
    const n = parseOrderNumber(doc.orderId);
    if (n && n > highest) highest = n;
  }
  // Safety net carried over from the original implementation.
  return Math.max(highest, ORDER_NUMBER_FLOOR + list.total);
}

// Atomically: raise the counter to at least ARGV[1], then increment it.
const NEXT_SEQUENCE_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local floor = tonumber(ARGV[1])
if current < floor then redis.call('SET', KEYS[1], floor) end
return redis.call('INCR', KEYS[1])`;

async function nextFromRedis(floor: number): Promise<number | null> {
  const result = await redis(['EVAL', NEXT_SEQUENCE_SCRIPT, 1, SEQUENCE_KEY, floor]);
  return typeof result === 'number' ? result : null;
}

/**
 * Allocate an order number no other checkout receives (when Redis is available).
 * `resync` re-reads the database first, used after a collision.
 */
async function allocateOrderNumber(
  databases: Databases,
  dbId: string,
  { resync = false }: { resync?: boolean } = {}
): Promise<{ orderNumber: number; viaRedis: boolean }> {
  if (!resync) {
    const n = await nextFromRedis(0);
    if (n !== null && n > ORDER_NUMBER_FLOOR) return { orderNumber: n, viaRedis: true };
    // null: Redis unavailable. <= floor: counter not seeded from the database yet.
  }
  const highest = await highestOrderNumberInDb(databases, dbId);
  const n = await nextFromRedis(highest);
  if (n !== null) return { orderNumber: n, viaRedis: true };
  return { orderNumber: highest + 1, viaRedis: false };
}

/**
 * Reserve an order number at checkout, so the payment page and UPI note can
 * show it. With Redis the reservation is recorded and honoured on submit.
 */
export async function reserveOrderId(c: Context): Promise<string> {
  const { databases } = getAppwriteClient(getEnv(c));
  const { orderNumber, viaRedis } = await allocateOrderNumber(databases, getDbId(c));
  const orderId = formatOrderId(orderNumber);
  if (viaRedis) await redis(['SET', `cc:resv:${orderId}`, 1, 'EX', RESERVATION_TTL_SECONDS]);
  return orderId;
}

async function consumeReservation(orderId: string): Promise<'consumed' | 'missing' | 'unavailable'> {
  const result = await redis(['DEL', `cc:resv:${orderId}`]);
  if (result === null) return 'unavailable';
  return result === 1 ? 'consumed' : 'missing';
}

// The same customer re-submitting the same payment (double click, retry after a
// network error) must get their existing order back, not a second order.
function isSameSubmission(existing: OrderDoc, data: Record<string, unknown>): boolean {
  const existingEmail = String(parseJsonObject(existing.customer).email || '').toLowerCase();
  const newEmail = String(parseJsonObject(data.customer).email || '').toLowerCase();
  return (
    !!existing.transactionId &&
    String(existing.transactionId) === String(data.transactionId) &&
    existingEmail === newEmail
  );
}

/**
 * Create a new order document with a unique order number.
 * `proposedOrderId` is the number reserved at checkout; it is used when it was
 * genuinely reserved for this checkout, otherwise a fresh number is allocated.
 */
export async function createOrderDocument(
  databases: Databases,
  dbId: string,
  data: Record<string, unknown>,
  proposedOrderId: unknown
): Promise<{ doc: OrderDoc; duplicate: boolean }> {
  let orderNumber: number | null = null;
  const proposed = parseOrderNumber(proposedOrderId);

  if (proposed) {
    const reservation = await consumeReservation(formatOrderId(proposed));
    if (reservation === 'consumed') {
      orderNumber = proposed;
    } else {
      const existing = await getOrderByDocId(databases, dbId, formatOrderId(proposed));
      if (existing && isSameSubmission(existing, data)) return { doc: existing, duplicate: true };
      if (!existing && reservation === 'unavailable') {
        // Without Redis reservations can't be checked; only accept a number above every stored order.
        const highest = await highestOrderNumberInDb(databases, dbId);
        orderNumber = proposed > highest ? proposed : highest + 1;
      }
    }
  }
  if (orderNumber === null) {
    orderNumber = (await allocateOrderNumber(databases, dbId)).orderNumber;
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const orderId = formatOrderId(orderNumber);
    try {
      const doc = (await databases.createDocument(dbId, ORDERS, orderId, { ...data, orderId })) as OrderDoc;
      return { doc, duplicate: false };
    } catch (e) {
      if (errorCode(e) !== 409) throw e;
      const existing = await getOrderByDocId(databases, dbId, orderId);
      if (existing && isSameSubmission(existing, data)) return { doc: existing, duplicate: true };
      const next = await allocateOrderNumber(databases, dbId, { resync: true });
      // Redis numbers are already unique. Without Redis, simultaneous submissions
      // all rescan to the same "highest + 1", so spread their retries apart.
      orderNumber = next.viaRedis
        ? next.orderNumber
        : Math.max(next.orderNumber, orderNumber + 1) + Math.floor(Math.random() * (attempt + 2));
    }
  }
  throw new Error('Could not allocate a unique order number. Please try again.');
}

// ─── Lookups ─────────────────────────────────────────────────────────

export async function getOrderByDocId(databases: Databases, dbId: string, docId: string): Promise<OrderDoc | null> {
  try {
    return (await databases.getDocument(dbId, ORDERS, docId)) as OrderDoc;
  } catch (e) {
    // 400: not a valid document id (e.g. contains '#'), so it can't exist either.
    if (isNotFoundError(e) || errorCode(e) === 400) return null;
    throw e;
  }
}

/**
 * Every order matching a reference, which may be an Appwrite $id or a human
 * order number in any of its historic spellings. New orders are found with a
 * single getDocument; older ones (random $id) with one query. Older data can
 * contain several orders with the same number, so callers must choose — by
 * $id for admins, by matching contact details for customers.
 */
export async function findOrderCandidates(databases: Databases, dbId: string, ref: string): Promise<OrderDoc[]> {
  const clean = String(ref || '').replace(/#/g, '').trim();
  if (!clean) return [];

  const orderNumber = parseOrderNumber(clean);
  const direct = await getOrderByDocId(databases, dbId, orderNumber ? formatOrderId(orderNumber) : clean);
  if (direct) return [direct];

  const upper = clean.toUpperCase();
  const variants = new Set([clean, upper, `#${clean}`, `#${upper}`]);
  if (/^\d+$/.test(clean)) {
    variants.add(`CLAP${clean}`);
    variants.add(`#CLAP${clean}`);
  }
  if (orderNumber) {
    variants.add(formatOrderId(orderNumber));
    variants.add(`#${formatOrderId(orderNumber)}`);
  }

  const list = await databases.listDocuments(dbId, ORDERS, [
    Query.equal('orderId', [...variants]),
    Query.orderDesc('$createdAt'),
    Query.limit(25),
  ]);
  return list.documents as OrderDoc[];
}

/** Order lookup for customer-facing pages, cached until the next order write. */
export function findOrderCandidatesCached(c: Context, ref: string): Promise<OrderDoc[]> {
  const env = getEnv(c);
  const dbId = getDbId(c);
  const key = String(ref || '').replace(/#/g, '').trim().toUpperCase();
  return cached('orders', `ref:${key}`, 300, () => findOrderCandidates(getAppwriteClient(env).databases, dbId, ref), {
    memorySeconds: 10,
  });
}

/** Newest orders for the admin views (dashboard, orders, customers, activity, notifications). */
export function listOrdersCached(c: Context): Promise<OrderDoc[]> {
  const env = getEnv(c);
  const dbId = getDbId(c);
  return cached(
    'orders',
    'admin-list',
    600,
    async () => {
      const { databases } = getAppwriteClient(env);
      const res = await databases.listDocuments(dbId, ORDERS, [
        Query.limit(ADMIN_LIST_LIMIT),
        Query.orderDesc('$createdAt'),
      ]);
      return res.documents as OrderDoc[];
    },
    // Admins act on what they see, so other isolates may only lag a few seconds behind a change.
    { memorySeconds: 10 }
  );
}

// ─── Customer data ───────────────────────────────────────────────────

export function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * True when `contact` (an email address, or a phone number) belongs to the
 * order's customer. Phone numbers must match in full — a partial number is
 * not proof of ownership.
 */
export function contactMatchesOrder(order: Record<string, unknown>, contact: string): boolean {
  const customer = parseJsonObject(order.customer);
  const entered = String(contact || '').trim().toLowerCase();
  if (!entered) return false;

  if (entered.includes('@')) {
    return String(customer.email || '').trim().toLowerCase() === entered;
  }

  const enteredDigits = entered.replace(/\D/g, '');
  const storedPhone = String(customer.phone || '');
  const storedDigits = storedPhone.replace(/\D/g, '');
  // Stored as "<dial code> <number>"; the part after the last space is the local number.
  const localDigits = storedPhone.trim().split(/\s+/).pop()?.replace(/\D/g, '') || storedDigits;
  if (!storedDigits || enteredDigits.length < Math.max(8, localDigits.length)) return false;
  return storedDigits.endsWith(enteredDigits);
}

const CUSTOMER_FIELDS = ['fullName', 'email', 'phone', 'address', 'apartment', 'city', 'state', 'pincode'] as const;

/** Keep only known customer fields, trimmed to sane lengths (the column holds 5000 chars). */
export function sanitizeCustomer(raw: unknown): Record<string, string> {
  const source = parseJsonObject(raw);
  const customer: Record<string, string> = {};
  for (const field of CUSTOMER_FIELDS) {
    if (source[field] !== undefined && source[field] !== null) {
      customer[field] = String(source[field]).trim().slice(0, 400);
    }
  }
  if (customer.email) customer.email = customer.email.toLowerCase();
  return customer;
}

// ─── Pricing ─────────────────────────────────────────────────────────

export interface PricedOrder {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
  /** Names of items whose price could not be checked against the catalog. */
  unverifiedItems: string[];
}

/**
 * Price an order from the catalog instead of trusting amounts sent by the
 * browser, using the same shipping rule as the cart.
 */
export async function priceOrderItems(rawItems: unknown): Promise<PricedOrder> {
  const list = Array.isArray(rawItems) ? rawItems : [];
  let catalog: Record<string, unknown>[] | null = null;
  try {
    catalog = await getAllProducts();
  } catch (e) {
    console.log('Order pricing: catalog unavailable —', (e as Error).message);
  }

  const unverifiedItems: string[] = [];
  const items: CartItem[] = [];

  for (const raw of list.slice(0, 50)) {
    const line = parseJsonObject(raw);
    const productId = String(line.productId || '').slice(0, 64);
    const quantity = Math.floor(Number(line.quantity));
    if (!productId || !Number.isFinite(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      throw new Error('Your cart contains an invalid item. Please review your cart and try again.');
    }

    const product = catalog?.find((p) => p.$id === productId || p.id === productId || p.slug === productId);
    const clientPrice = Number(line.price) || 0;
    if (!product) unverifiedItems.push(String(line.name || productId));

    items.push({
      id: String(line.id || productId).slice(0, 128),
      productId,
      name: String(product?.name ?? line.name ?? '').slice(0, 200),
      image: String(line.image || (Array.isArray(product?.images) ? product.images[0] : '') || '').slice(0, 500),
      size: String(line.size || '').slice(0, 10) as CartItem['size'],
      price: product ? Number(product.price) || 0 : clientPrice,
      quantity,
      freeShipping: Boolean(product ? product.freeShipping : line.freeShipping),
      deliveryChargeEnabled: Boolean(product ? product.deliveryChargeEnabled : line.deliveryChargeEnabled),
      deliveryFee: Number(product ? product.deliveryFee : line.deliveryFee) || undefined,
    });
  }

  if (items.length === 0) {
    throw new Error('Your cart is empty.');
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = calculateShipping(items).fee;
  return { items, subtotal, shipping, total: subtotal + shipping, unverifiedItems };
}
