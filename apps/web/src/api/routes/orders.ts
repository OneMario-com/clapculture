import { Hono, Context } from 'hono';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv, getClientIp, runInBackground } from '../lib/utils';
import { adminAuth, getAdminFromRequest } from '../middleware/auth';
import { invalidate } from '../lib/cache';
import { isRateLimited } from '../lib/redis';
import {
  OrderDoc,
  reserveOrderId,
  createOrderDocument,
  findOrderCandidates,
  findOrderCandidatesCached,
  listOrdersCached,
  contactMatchesOrder,
  parseJsonObject,
  sanitizeCustomer,
  priceOrderItems,
  isNotFoundError,
} from '../lib/orders';
import { upsertCustomerAndUser } from './customers';
import {
  sendOrderConfirmationEmail,
  sendPaymentVerifiedEmail,
  sendShippingUpdateEmail,
  sendOrderDeliveredEmail,
  sendAdminAlertEmail,
} from '../lib/email';

const orders = new Hono();

const PAYMENT_STATUSES = ['PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED'];
const ORDER_STATUSES = ['PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const UNAVAILABLE_MESSAGE = 'Our order system is temporarily unavailable. Please try again in a minute.';

// Reserve the next order number (e.g. CLAP01005) for a checkout.
orders.get('/next-id', async (c) => {
  try {
    if (await isRateLimited(`next-id:${getClientIp(c)}`, 30, 10 * 60)) {
      return c.json({ success: false, error: 'Too many checkout attempts. Please wait a few minutes.' }, 429);
    }
    const orderId = await reserveOrderId(c);
    c.header('Cache-Control', 'no-store');
    return c.json({ success: true, data: { orderId } });
  } catch (error: unknown) {
    // Never hand out a hard-coded fallback number: every shopper would get the same one.
    console.error('Order number reservation failed:', error);
    return c.json({ success: false, error: UNAVAILABLE_MESSAGE }, 503);
  }
});

// Create an order.
// RULE: Customer orders are strictly created ONLY once payment details (12-digit UTR + screenshot) are submitted!
// A storefront submission can only ever create a new order — never modify an existing one.
orders.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const env = getEnv(c);
  const { databases } = getAppwriteClient(env);
  const dbId = getDbId(c);

  if (await getAdminFromRequest(c)) {
    return createOrUpdateOrderAsAdmin(c, body);
  }

  if (await isRateLimited(`order-submit:${getClientIp(c)}`, 10, 10 * 60)) {
    return c.json({ success: false, error: 'Too many order attempts. Please wait a few minutes and try again.' }, 429);
  }

  // ── STRICT VALIDATION: Storefront orders require valid payment details ──
  const transactionId = String(body.transactionId || '').replace(/\D/g, '');
  if (transactionId.length !== 12) {
    return c.json({ success: false, error: 'A valid 12-digit UTR / Reference number is required to place an order.' }, 400);
  }

  const screenshotUrl = String(body.screenshotUrl || '').trim();
  if (!isOwnStorageReference(screenshotUrl, env.APPWRITE_ENDPOINT)) {
    return c.json({ success: false, error: 'Payment screenshot is required to complete order placement.' }, 400);
  }

  const customer = sanitizeCustomer(body.customer);
  if (!customer.fullName || !customer.email || !customer.phone || !customer.address) {
    return c.json({ success: false, error: 'Name, email, phone and address are required.' }, 400);
  }

  let priced;
  try {
    priced = await priceOrderItems(typeof body.items === 'string' ? JSON.parse(body.items) : body.items);
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message || 'Invalid cart items.' }, 400);
  }

  const itemsStr = JSON.stringify(priced.items);
  if (itemsStr.length > 10000) {
    return c.json({ success: false, error: 'Too many items for a single order. Please split it into two orders.' }, 400);
  }

  const orderData: Record<string, unknown> = {
    customer: JSON.stringify({ ...customer, screenshotUrl, paymentProof: screenshotUrl }),
    items: itemsStr,
    subtotal: priced.subtotal,
    shipping: priced.shipping,
    total: priced.total,
    paymentStatus: 'SUBMITTED',
    orderStatus: 'PLACED',
    transactionId,
    trackingNumber: 'TRK-CLAP-PENDING',
    isArchived: false,
  };

  let result: { doc: OrderDoc; duplicate: boolean };
  try {
    result = await createOrderDocument(databases, dbId, orderData, body.orderId);
  } catch (error) {
    console.error('Order creation failed:', error);
    // The customer has already paid: make sure the shop hears about it even if the database is down.
    runInBackground(
      sendAdminAlertEmail(env, {
        subject: `ACTION NEEDED: order could not be saved (₹${priced.total}, UTR ${transactionId})`,
        title: 'ORDER NOT SAVED',
        message: `A customer submitted payment details but the order could not be saved to the database: ${(error as Error).message}. Contact the customer and record the order manually.`,
        metadata: {
          customer: `${customer.fullName} (${customer.email}, ${customer.phone})`,
          address: `${customer.address}, ${customer.city || ''}, ${customer.state || ''} ${customer.pincode || ''}`,
          amount: `₹${priced.total}`,
          utr: transactionId,
          screenshot: screenshotUrl,
          items: priced.items.map((i) => `${i.name} (${i.size}) x${i.quantity}`).join('; '),
        },
      }),
      'Unsaved order alert'
    );
    return c.json({
      success: false,
      error: 'We received your payment details but could not save your order right now. Please try again in a minute. If it keeps failing, WhatsApp us your UTR number.',
    }, 503);
  }

  const { doc, duplicate } = result;
  const orderId = String(doc.orderId);

  if (!duplicate) {
    await invalidate('orders');

    // Auto-save/sync customer profile and Appwrite Auth user
    runInBackground(
      upsertCustomerAndUser(env, {
        email: customer.email,
        fullName: customer.fullName,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        pincode: customer.pincode,
        orderId,
        source: 'order_checkout',
      }),
      'Customer upsert'
    );

    runInBackground(
      sendOrderConfirmationEmail(env, {
        toEmail: customer.email,
        customerName: customer.fullName || 'Valued Rebel',
        orderId,
        totalAmount: priced.total,
        items: priced.items,
        paymentStatus: 'SUBMITTED',
        shippingAddress: `${customer.address || ''}, ${customer.city || ''}, ${customer.state || ''} ${customer.pincode || ''}`,
      }),
      'Email confirmation'
    );

    const clientTotal = Number(body.total);
    const priceWarnings: string[] = [];
    if (Number.isFinite(clientTotal) && Math.abs(clientTotal - priced.total) > 0.5) {
      priceWarnings.push(`Checkout page showed ₹${clientTotal} but current catalog prices total ₹${priced.total} — check the amount actually paid.`);
    }
    if (priced.unverifiedItems.length > 0) {
      priceWarnings.push(`Price not verified (product no longer in catalog): ${priced.unverifiedItems.join(', ')}.`);
    }

    runInBackground(
      sendAdminAlertEmail(env, {
        subject: `New Order Placed #${orderId} (₹${priced.total})`,
        title: `NEW ORDER #${orderId}`,
        message: `A new order has been placed by ${customer.fullName || 'Customer'} for ₹${priced.total}.${priceWarnings.length ? ` ⚠️ ${priceWarnings.join(' ')}` : ''}`,
        actionUrl: `/admin/orders/${doc.$id}`,
        actionText: 'VIEW ORDER IN ADMIN',
        metadata: {
          orderId,
          customer: `${customer.fullName} (${customer.email}, ${customer.phone})`,
          amount: `₹${priced.total}`,
          utr: transactionId,
          itemsCount: priced.items.length,
        },
      }),
      'Admin email alert'
    );
  }

  return c.json({ success: true, data: enrichOrderDoc(doc) }, duplicate ? 200 : 201);
});

// Single Order Archive Toggle
orders.patch('/:orderId/archive', adminAuth, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const isArchived = body.isArchived !== undefined ? Boolean(body.isArchived) : true;
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const target = await resolveOrderForAdmin(c, c.req.param('orderId') || '');
    if (!target) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const response = await databases.updateDocument(dbId, 'orders', target.$id, { isArchived });
    await invalidate('orders');

    return c.json({ success: true, data: enrichOrderDoc(response) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to toggle archive status';
    return c.json({ success: false, error: msg }, 500);
  }
});

// Bulk Order Archive / Unarchive (orderIds are Appwrite document $ids)
orders.post('/bulk-archive', adminAuth, async (c) => {
  try {
    const { orderIds, isArchived } = await c.req.json();
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return c.json({ success: false, error: 'No orders provided for archiving' }, 400);
    }
    const archiveFlag = isArchived !== undefined ? Boolean(isArchived) : true;
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    const results = await Promise.allSettled(
      orderIds.map(async (id: string) => {
        const docId = String(id).replace(/#/g, '').trim();
        try {
          return await databases.updateDocument(dbId, 'orders', docId, { isArchived: archiveFlag });
        } catch (e) {
          if (!isNotFoundError(e) && (e as { code?: number }).code !== 400) throw e;
          // Not a document $id: resolve it as an order number.
          const target = await resolveOrderForAdmin(c, docId);
          if (!target) throw e;
          return databases.updateDocument(dbId, 'orders', target.$id, { isArchived: archiveFlag });
        }
      })
    );
    await invalidate('orders');

    const failed = results.filter((r) => r.status === 'rejected').length;
    return c.json({
      success: failed === 0,
      message: failed === 0
        ? `Updated archive status for ${results.length} orders`
        : `Updated ${results.length - failed} of ${results.length} orders; ${failed} failed`,
      isArchived: archiveFlag,
    }, failed === 0 ? 200 : 207);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to bulk archive orders';
    return c.json({ success: false, error: msg }, 500);
  }
});

// Customer order tracking (kept for compatibility; same rules as GET /:orderId)
orders.get('/track', async (c) => {
  return getOrderForCustomer(c, c.req.query('orderId') || '', c.req.query('contact') || '');
});

orders.get('/:orderId', async (c) => {
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', '0');

  const ref = c.req.param('orderId') || '';
  if (await getAdminFromRequest(c)) {
    try {
      const order = await resolveOrderForAdmin(c, ref);
      if (!order) return c.json({ success: false, error: 'Order not found' }, 404);
      return c.json({ success: true, data: enrichOrderDoc(order) });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to get order';
      return c.json({ success: false, error: msg }, 500);
    }
  }

  return getOrderForCustomer(c, ref, c.req.query('contact') || '');
});

orders.put('/:id/status', adminAuth, async (c) => {
  try {
    const { orderStatus, paymentStatus, trackingNumber, isArchived } = await c.req.json();
    const env = getEnv(c);
    const { databases } = getAppwriteClient(env);
    const dbId = getDbId(c);

    if (paymentStatus !== undefined && !PAYMENT_STATUSES.includes(paymentStatus)) {
      return c.json({ success: false, error: `Invalid payment status: ${paymentStatus}` }, 400);
    }
    if (orderStatus !== undefined && !ORDER_STATUSES.includes(orderStatus)) {
      return c.json({ success: false, error: `Invalid order status: ${orderStatus}` }, 400);
    }

    const previous = await resolveOrderForAdmin(c, c.req.param('id') || '');
    if (!previous) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const updateData: Record<string, unknown> = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (trackingNumber !== undefined) updateData.trackingNumber = String(trackingNumber).slice(0, 255);
    if (isArchived !== undefined) updateData.isArchived = Boolean(isArchived);

    const response = await databases.updateDocument(dbId, 'orders', previous.$id, updateData);
    await invalidate('orders');

    // Email the customer only when a status actually changes, so re-saving an
    // order (e.g. to edit the tracking number) doesn't re-send old notifications.
    const customerObj = parseJsonObject(response.customer);
    const customerEmail = customerObj.email as string;
    const customerName = (customerObj.fullName || 'Valued Rebel') as string;
    const orderLabel = String(response.orderId).replace('#', '');
    const becamePaymentStatus = (s: string) => response.paymentStatus === s && previous.paymentStatus !== s;
    const becameOrderStatus = (s: string) => response.orderStatus === s && previous.orderStatus !== s;

    if (customerEmail && becamePaymentStatus('VERIFIED')) {
      runInBackground(sendPaymentVerifiedEmail(env, {
        toEmail: customerEmail,
        customerName,
        orderId: orderLabel,
        amount: Number(response.total) || 0,
        transactionId: (response.transactionId || '') as string,
      }), 'Payment verified email');
    }

    if (customerEmail && becameOrderStatus('SHIPPED')) {
      runInBackground(sendShippingUpdateEmail(env, {
        toEmail: customerEmail,
        customerName,
        orderId: orderLabel,
        trackingNumber: (response.trackingNumber || 'TRK-CLAP-PENDING') as string,
        courierName: 'BlueDart / Delhivery Express',
      }), 'Shipping update email');
    }

    if (customerEmail && becameOrderStatus('DELIVERED')) {
      runInBackground(sendOrderDeliveredEmail(env, {
        toEmail: customerEmail,
        customerName,
        orderId: orderLabel,
      }), 'Delivered email');
    }

    return c.json({ success: true, data: enrichOrderDoc(response) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update order status';
    return c.json({ success: false, error: msg }, 500);
  }
});

orders.get('/', adminAuth, async (c) => {
  try {
    const status = c.req.query('status');
    const paymentStatus = c.req.query('paymentStatus');
    const archived = c.req.query('archived'); // 'true', 'false', 'all'
    const includePending = c.req.query('includePending') === 'true';
    const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '250', 10) || 250, 1), 250);

    // All admin pages share one cached list (cleared on every order write).
    let filteredDocs = await listOrdersCached(c);
    if (status) filteredDocs = filteredDocs.filter((d) => d.orderStatus === status);
    if (paymentStatus) filteredDocs = filteredDocs.filter((d) => d.paymentStatus === paymentStatus);

    // Archive Filtering
    if (archived === 'true') {
      filteredDocs = filteredDocs.filter((d) => Boolean(d.isArchived) === true);
    } else if (archived !== 'all') {
      filteredDocs = filteredDocs.filter((d) => Boolean(d.isArchived) !== true);
    }

    // By default, exclude PENDING (unpaid) orders from admin views
    if (!includePending && !paymentStatus) {
      filteredDocs = filteredDocs.filter((d) => d.paymentStatus !== 'PENDING');
    }

    c.header('Cache-Control', 'private, no-store');
    return c.json({ success: true, data: filteredDocs.slice(0, limit).map((d) => enrichOrderDoc(d)) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list orders';
    return c.json({ success: false, error: msg }, 500);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────

function enrichOrderDoc(doc: Record<string, unknown>) {
  const customerObj = parseJsonObject(doc.customer);
  const screenshot = (customerObj.screenshotUrl || customerObj.paymentProof || doc.screenshotUrl || doc.paymentProof || '') as string;
  return {
    ...doc,
    isArchived: Boolean(doc.isArchived),
    screenshotUrl: screenshot,
    paymentProof: screenshot,
  };
}

/**
 * Resolve an admin reference ($id or order number) to one order, read fresh
 * from the database. Old data may hold several orders with the same number;
 * the newest is returned, which is why admin pages should link by $id.
 */
async function resolveOrderForAdmin(c: Context, ref: string): Promise<OrderDoc | null> {
  const { databases } = getAppwriteClient(getEnv(c));
  const candidates = await findOrderCandidates(databases, getDbId(c), ref);
  return candidates[0] || null;
}

/**
 * Customer view of an order: requires the email or phone number used for the
 * order, so knowing (or guessing) an order number is not enough to see someone
 * else's name, address and items.
 */
async function getOrderForCustomer(c: Context, ref: string, contact: string) {
  try {
    if (!ref || !contact.trim()) {
      return c.json({ success: false, error: 'Enter the order number and the email or phone number used for the order.' }, 400);
    }
    if (await isRateLimited(`order-lookup:${getClientIp(c)}`, 30, 10 * 60)) {
      return c.json({ success: false, error: 'Too many lookups. Please wait a few minutes and try again.' }, 429);
    }

    const candidates = await findOrderCandidatesCached(c, ref);
    if (candidates.length === 0) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    const order = candidates.find((doc) => contactMatchesOrder(doc, contact));
    if (!order) {
      return c.json({ success: false, error: 'The email or phone number does not match this order.' }, 403);
    }

    return c.json({ success: true, data: enrichOrderDoc(order) });
  } catch (error: unknown) {
    console.error('Order lookup failed:', error);
    return c.json({ success: false, error: UNAVAILABLE_MESSAGE }, 503);
  }
}

/** Admin-only manual order creation/update (not used by the storefront). */
async function createOrUpdateOrderAsAdmin(c: Context, body: Record<string, unknown>) {
  try {
    const env = getEnv(c);
    const { databases } = getAppwriteClient(env);
    const dbId = getDbId(c);

    const orderData: Record<string, unknown> = {
      customer: typeof body.customer === 'string' ? body.customer : JSON.stringify(body.customer || {}),
      items: typeof body.items === 'string' ? body.items : JSON.stringify(body.items || []),
      subtotal: Number(body.subtotal) || Number(body.total) || 0,
      shipping: Number(body.shipping) || 0,
      total: Number(body.total) || 0,
      paymentStatus: PAYMENT_STATUSES.includes(String(body.paymentStatus)) ? body.paymentStatus : 'SUBMITTED',
      orderStatus: ORDER_STATUSES.includes(String(body.orderStatus)) ? body.orderStatus : 'PLACED',
      transactionId: String(body.transactionId || 'UPI-REF-PENDING'),
      trackingNumber: String(body.trackingNumber || 'TRK-CLAP-PENDING'),
      isArchived: Boolean(body.isArchived),
    };

    const existing = body.orderId ? await resolveOrderForAdmin(c, String(body.orderId)) : null;
    const doc = existing
      ? await databases.updateDocument(dbId, 'orders', existing.$id, orderData)
      : (await createOrderDocument(databases, dbId, orderData, body.orderId)).doc;
    await invalidate('orders');

    return c.json({ success: true, data: enrichOrderDoc(doc) }, existing ? 200 : 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to save order';
    return c.json({ success: false, error: msg }, 500);
  }
}

/** Only accept screenshot references to files in our own Appwrite storage. */
function isOwnStorageReference(value: string, endpoint?: string): boolean {
  if (!value || value.length > 2000) return false;
  if (/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(value)) return true; // bare file id
  const base = (endpoint || process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1').replace(/\/+$/, '');
  return value.startsWith(`${base}/storage/buckets/`);
}

export default orders;
