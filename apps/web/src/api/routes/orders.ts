import { Hono } from 'hono';
import { ID, Query } from 'node-appwrite';
import { getAppwriteClient } from '../lib/appwrite';
import { getDbId, getEnv, getNextSequentialOrderId } from '../lib/utils';
import { adminAuth } from '../middleware/auth';
import { verifyAdminToken } from '../lib/jwt';
import { upsertCustomerAndUser } from './customers';
import {
  sendOrderConfirmationEmail,
  sendPaymentVerifiedEmail,
  sendShippingUpdateEmail,
  sendOrderDeliveredEmail,
  sendAdminAlertEmail,
} from '../lib/email';

const orders = new Hono();

// Get the next sequential order ID (e.g. #CLAP01001)
orders.get('/next-id', async (c) => {
  try {
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);
    const orderId = await getNextSequentialOrderId(databases, dbId);
    return c.json({ success: true, data: { orderId } });
  } catch {
    return c.json({ success: true, data: { orderId: '#CLAP01001' } });
  }
});

// Create or update an order
// RULE: Customer orders are strictly created ONLY once payment details (12-digit UTR + screenshot) are submitted!
orders.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const env = getEnv(c);
    const { databases } = getAppwriteClient(env);
    const dbId = getDbId(c);
    const isAdmin = isAdminRequest(c);
    
    let customOrderId = (body.orderId || '').replace('#', '').trim();
    let existingDocId: string | null = null;

    if (customOrderId) {
      // Check if this order exists
      const existing = await databases.listDocuments(dbId, 'orders', [
        Query.equal('orderId', customOrderId),
        Query.limit(1),
      ]);
      if (existing.documents.length > 0) {
        existingDocId = existing.documents[0].$id;
      }
    }

    if (!customOrderId) {
      const nextId = await getNextSequentialOrderId(databases, dbId);
      customOrderId = nextId.replace('#', '').trim();
    }

    const customerObj = typeof body.customer === 'string' ? JSON.parse(body.customer) : (body.customer || {});
    if (body.screenshotUrl) customerObj.screenshotUrl = body.screenshotUrl;
    if (body.paymentProof) customerObj.paymentProof = body.paymentProof;
    const customerStr = JSON.stringify(customerObj);
    const itemsStr = typeof body.items === 'string' ? body.items : JSON.stringify(body.items || []);

    // ── STRICT VALIDATION: Storefront orders require valid payment details ──
    if (!isAdmin) {
      if (body.paymentStatus === 'PENDING') {
        return c.json({
          success: false,
          error: 'Orders are only registered after payment details (UTR and screenshot) are submitted.'
        }, 400);
      }

      const cleanTxn = String(body.transactionId || '').replace(/\D/g, '');
      if (!cleanTxn || cleanTxn.length < 12) {
        return c.json({
          success: false,
          error: 'A valid 12-digit UTR / Reference number is required to place an order.'
        }, 400);
      }

      if (!body.screenshotUrl && !customerObj.screenshotUrl && !customerObj.paymentProof) {
        return c.json({
          success: false,
          error: 'Payment screenshot is required to complete order placement.'
        }, 400);
      }
    }

    let transactionId = body.transactionId || 'UPI-REF-PENDING';
    if (body.paymentStatus === 'SUBMITTED') {
      const cleanTxn = String(body.transactionId || '').replace(/\D/g, '');
      if (cleanTxn && cleanTxn.length >= 12) {
        transactionId = cleanTxn;
      }
    }

    const orderData: Record<string, unknown> = {
      orderId: customOrderId,
      customer: customerStr,
      items: itemsStr,
      subtotal: Number(body.subtotal) || Number(body.total) || 0,
      shipping: Number(body.shipping) || 0,
      total: Number(body.total) || 0,
      paymentStatus: body.paymentStatus || 'SUBMITTED',
      orderStatus: body.orderStatus || 'PLACED',
      transactionId: transactionId,
      trackingNumber: body.trackingNumber || 'TRK-CLAP-PENDING',
      isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : false,
    };
    
    let response;
    if (existingDocId) {
      // Update existing order without creating duplicate!
      response = await databases.updateDocument(
        dbId,
        'orders',
        existingDocId,
        orderData
      );
    } else {
      // Create new order
      response = await databases.createDocument(
        dbId,
        'orders',
        ID.unique(),
        orderData
      );
    }

    // Auto-save/sync customer profile and Appwrite Auth user
    if (customerObj.email) {
      upsertCustomerAndUser(env, {
        email: customerObj.email,
        fullName: customerObj.fullName,
        phone: customerObj.phone,
        address: customerObj.address,
        city: customerObj.city,
        state: customerObj.state,
        pincode: customerObj.pincode,
        orderId: customOrderId,
        source: 'order_checkout',
      }).catch((e) => console.log('Customer upsert notice:', e.message));
    }
    const itemsList = typeof body.items === 'string' ? JSON.parse(body.items) : (body.items || []);
    
    if (customerObj.email && orderData.paymentStatus === 'SUBMITTED') {
      sendOrderConfirmationEmail(env, {
        toEmail: customerObj.email,
        customerName: customerObj.fullName || 'Valued Rebel',
        orderId: customOrderId.replace('#', ''),
        totalAmount: Number(body.total) || 0,
        items: itemsList,
        paymentStatus: String(orderData.paymentStatus),
        shippingAddress: `${customerObj.address || ''}, ${customerObj.city || ''}, ${customerObj.state || ''} ${customerObj.pincode || ''}`,
      }).catch((e) => console.log('Email confirmation notice:', e.message));
    }

    if (orderData.paymentStatus === 'SUBMITTED') {
      // Send Admin New Order Notification Email
      sendAdminAlertEmail(env, {
        subject: `New Order Placed #${customOrderId.replace('#', '')} (₹${body.total || 0})`,
        title: `NEW ORDER #${customOrderId.replace('#', '')}`,
        message: `A new order has been placed by ${customerObj.fullName || 'Customer'} for ₹${body.total || 0}.`,
        actionUrl: `/admin/orders/${customOrderId.replace('#', '')}`,
        actionText: 'VIEW ORDER IN ADMIN',
        metadata: {
          orderId: customOrderId,
          customer: `${customerObj.fullName} (${customerObj.email}, ${customerObj.phone})`,
          amount: `₹${body.total}`,
          itemsCount: itemsList.length,
        },
      }).catch((e) => console.log('Admin email alert notice:', e.message));
    }
    
    return c.json({ success: true, data: response }, existingDocId ? 200 : 201);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create order';
    return c.json({ success: false, error: msg }, 500);
  }
});

// Update payment proof for an existing order
orders.patch('/:orderId/payment', async (c) => {
  try {
    const rawId = c.req.param('orderId') || '';
    const cleanId = rawId.replace('#', '').trim();
    const body = await c.req.json();
    const env = getEnv(c);
    const { databases } = getAppwriteClient(env);
    const dbId = getDbId(c);

    // ── MANDATORY: UTR must be a valid 12-digit number ──
    const cleanTxn = String(body.transactionId || '').replace(/\D/g, '');
    if (!cleanTxn || cleanTxn.length < 12) {
      return c.json({ success: false, error: 'A valid 12-digit UTR / Reference number is required.' }, 400);
    }

    // ── MANDATORY: Screenshot URL must be provided ──
    if (!body.screenshotUrl) {
      return c.json({ success: false, error: 'Payment screenshot is required. Please upload your payment confirmation screenshot.' }, 400);
    }

    // Find the order document
    let existingDoc: Record<string, unknown> | null = null;
    try {
      existingDoc = await databases.getDocument(dbId, 'orders', cleanId);
    } catch {}

    if (!existingDoc) {
      const variations = [cleanId, `CLAP${cleanId}`, cleanId.toUpperCase(), `#${cleanId}`];
      for (const v of variations) {
        const response = await databases.listDocuments(
          dbId,
          'orders',
          [Query.equal('orderId', v), Query.limit(1)]
        );
        if (response.documents.length > 0) {
          existingDoc = response.documents[0];
          break;
        }
      }
    }

    if (!existingDoc) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    let customerObj: Record<string, unknown> = {};
    if (typeof existingDoc.customer === 'string') {
      try { customerObj = JSON.parse(existingDoc.customer); } catch {}
    } else if (existingDoc.customer && typeof existingDoc.customer === 'object') {
      customerObj = { ...existingDoc.customer as Record<string, unknown> };
    }

    // If new customer details provided, merge them
    if (body.customer) {
      const newCustomer = typeof body.customer === 'string' ? JSON.parse(body.customer) : body.customer;
      customerObj = { ...customerObj, ...newCustomer };
    }

    if (body.screenshotUrl) {
      customerObj.screenshotUrl = body.screenshotUrl;
      customerObj.paymentProof = body.screenshotUrl;
    }

    const updateData: Record<string, unknown> = {
      paymentStatus: 'SUBMITTED',
      orderStatus: 'PLACED',
      customer: JSON.stringify(customerObj),
      transactionId: cleanTxn,
    };

    const updatedDoc = await databases.updateDocument(
      dbId,
      'orders',
      existingDoc.$id as string,
      updateData
    );

    // Send notifications
    const itemsList = typeof existingDoc.items === 'string' ? JSON.parse(existingDoc.items) : (existingDoc.items || []);
    if (customerObj.email) {
      sendOrderConfirmationEmail(env, {
        toEmail: String(customerObj.email),
        customerName: String(customerObj.fullName || 'Valued Rebel'),
        orderId: String(existingDoc.orderId).replace('#', ''),
        totalAmount: Number(existingDoc.total) || 0,
        items: itemsList,
        paymentStatus: 'SUBMITTED',
        shippingAddress: `${customerObj.address || ''}, ${customerObj.city || ''}, ${customerObj.state || ''} ${customerObj.pincode || ''}`,
      }).catch((e) => console.log('Email confirmation notice:', e.message));
    }

    sendAdminAlertEmail(env, {
      subject: `Payment Submitted #${String(existingDoc.orderId).replace('#', '')} (₹${existingDoc.total || 0})`,
      title: `PAYMENT SUBMITTED #${String(existingDoc.orderId).replace('#', '')}`,
      message: `Customer ${customerObj.fullName || 'Customer'} has submitted UPI payment proof with UTR ${updateData.transactionId}.`,
      actionUrl: `/admin/orders/${existingDoc.$id}`,
      actionText: 'REVIEW & VERIFY PAYMENT',
      metadata: {
        orderId: String(existingDoc.orderId),
        customer: `${customerObj.fullName} (${customerObj.email}, ${customerObj.phone})`,
        amount: `₹${existingDoc.total}`,
        utr: String(updateData.transactionId),
      },
    }).catch((e) => console.log('Admin email alert notice:', e.message));

    return c.json({ success: true, data: updatedDoc });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update payment proof';
    return c.json({ success: false, error: msg }, 500);
  }
});

// Single Order Archive Toggle
orders.patch('/:orderId/archive', adminAuth, async (c) => {
  try {
    const rawId = c.req.param('orderId') || '';
    const cleanId = rawId.replace('#', '').trim();
    const body = await c.req.json().catch(() => ({}));
    const isArchived = body.isArchived !== undefined ? Boolean(body.isArchived) : true;
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);

    let targetDocId = cleanId;
    try {
      await databases.getDocument(dbId, 'orders', targetDocId);
    } catch {
      const list = await databases.listDocuments(dbId, 'orders', [
        Query.equal('orderId', cleanId),
        Query.limit(1)
      ]);
      if (list.documents.length > 0) {
        targetDocId = list.documents[0].$id;
      }
    }

    const response = await databases.updateDocument(
      dbId,
      'orders',
      targetDocId,
      { isArchived }
    );

    return c.json({ success: true, data: enrichOrderDoc(response) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to toggle archive status';
    return c.json({ success: false, error: msg }, 500);
  }
});

// Bulk Order Archive / Unarchive
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
        const cleanId = id.replace('#', '').trim();
        let targetDocId = cleanId;
        try {
          await databases.getDocument(dbId, 'orders', targetDocId);
        } catch {
          const list = await databases.listDocuments(dbId, 'orders', [
            Query.equal('orderId', cleanId),
            Query.limit(1)
          ]);
          if (list.documents.length > 0) {
            targetDocId = list.documents[0].$id;
          }
        }
        return databases.updateDocument(dbId, 'orders', targetDocId, { isArchived: archiveFlag });
      })
    );

    return c.json({
      success: true,
      message: `Updated archive status for ${results.length} orders`,
      isArchived: archiveFlag,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to bulk archive orders';
    return c.json({ success: false, error: msg }, 500);
  }
});

orders.get('/track', async (c) => {
  try {
    const orderId = c.req.query('orderId');
    const contact = c.req.query('contact');
    
    if (!orderId || !contact) {
      return c.json({ success: false, error: 'Order ID and contact details required' }, 400);
    }
    
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);
    
    const response = await databases.listDocuments(
      dbId,
      'orders',
      [Query.equal('orderId', orderId.toUpperCase())]
    );
    
    if (response.documents.length === 0) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }
    
    const order = response.documents[0] as Record<string, unknown>;
    let customer: Record<string, string | undefined> = {};
    if (typeof order.customer === 'string') {
      try { customer = JSON.parse(order.customer); } catch {}
    } else {
      customer = (order.customer || {}) as Record<string, string | undefined>;
    }
    
    if (customer.email !== contact && customer.phone !== contact) {
      return c.json({ success: false, error: 'Contact details do not match order' }, 403);
    }
    
    return c.json({ success: true, data: enrichOrderDoc(order) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to track order';
    return c.json({ success: false, error: msg }, 500);
  }
});

function enrichOrderDoc(doc: Record<string, unknown>) {
  let customerObj: Record<string, unknown> = {};
  if (typeof doc.customer === 'string') {
    try {
      customerObj = JSON.parse(doc.customer);
    } catch {}
  } else if (doc.customer && typeof doc.customer === 'object') {
    customerObj = doc.customer as Record<string, unknown>;
  }

  const screenshot = (customerObj.screenshotUrl || customerObj.paymentProof || doc.screenshotUrl || doc.paymentProof || '') as string;
  return {
    ...doc,
    isArchived: Boolean(doc.isArchived),
    screenshotUrl: screenshot,
    paymentProof: screenshot,
  };
}

/**
 * Helper to check if the request has a valid admin JWT token.
 */
function isAdminRequest(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.split(' ')[1];
  const payload = verifyAdminToken(token);
  return payload !== null;
}

orders.get('/:orderId', async (c) => {
  try {
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');

    const rawId = c.req.param('orderId') || '';
    const cleanId = rawId.replace('#', '').trim();
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);
    
    // Find the order document
    let orderDoc: Record<string, unknown> | null = null;

    // 1. Try finding by document ID
    try {
      const doc = await databases.getDocument(dbId, 'orders', cleanId);
      if (doc) orderDoc = doc;
    } catch {}

    // 2. Try querying by orderId (case-insensitive variations)
    if (!orderDoc) {
      const variations = [cleanId, `CLAP${cleanId}`, cleanId.toUpperCase(), `#${cleanId}`];
      for (const v of variations) {
        const response = await databases.listDocuments(
          dbId,
          'orders',
          [Query.equal('orderId', v), Query.limit(1)]
        );
        if (response.documents.length > 0) {
          orderDoc = response.documents[0];
          break;
        }
      }
    }

    if (!orderDoc) {
      return c.json({ success: false, error: 'Order not found' }, 404);
    }

    // ── CONTACT VERIFICATION: Prevent cross-user data leakage ──
    // Admin requests (with valid JWT) bypass this check
    if (!isAdminRequest(c)) {
      const contact = c.req.query('contact');
      if (contact) {
        // Verify the contact matches the order's customer
        let customerObj: Record<string, string | undefined> = {};
        if (typeof orderDoc.customer === 'string') {
          try { customerObj = JSON.parse(orderDoc.customer); } catch {}
        } else if (orderDoc.customer && typeof orderDoc.customer === 'object') {
          customerObj = orderDoc.customer as Record<string, string | undefined>;
        }

        const contactLower = contact.toLowerCase().trim();
        const emailMatch = customerObj.email && customerObj.email.toLowerCase().trim() === contactLower;
        const phoneMatch = customerObj.phone && customerObj.phone.replace(/\s/g, '').includes(contactLower.replace(/\s/g, ''));

        if (!emailMatch && !phoneMatch) {
          return c.json({ success: false, error: 'You do not have permission to view this order.' }, 403);
        }
      }
    }
    
    return c.json({ success: true, data: enrichOrderDoc(orderDoc) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to get order';
    return c.json({ success: false, error: msg }, 500);
  }
});

orders.put('/:id/status', adminAuth, async (c) => {
  try {
    const idOrOrderId = (c.req.param('id') || '').replace('#', '').trim();
    const { orderStatus, paymentStatus, trackingNumber, isArchived } = await c.req.json();
    const env = getEnv(c);
    const { databases } = getAppwriteClient(env);
    const dbId = getDbId(c);
    
    let targetDocId = idOrOrderId;

    // Resolve real document ID if orderId was passed
    try {
      await databases.getDocument(dbId, 'orders', targetDocId);
    } catch {
      const variations = [idOrOrderId, `CLAP${idOrOrderId}`, idOrOrderId.toUpperCase(), `#${idOrOrderId}`];
      for (const v of variations) {
        const list = await databases.listDocuments(dbId, 'orders', [
          Query.equal('orderId', v),
          Query.limit(1)
        ]);
        if (list.documents.length > 0) {
          targetDocId = list.documents[0].$id;
          break;
        }
      }
    }
    
    const updateData: Record<string, unknown> = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (isArchived !== undefined) updateData.isArchived = Boolean(isArchived);
    
    const response = await databases.updateDocument(
      dbId,
      'orders',
      targetDocId,
      updateData
    );

    // Send emails based on status change
    let customerObj: Record<string, unknown> = {};
    if (typeof response.customer === 'string') {
      try { customerObj = JSON.parse(response.customer); } catch {}
    } else if (response.customer && typeof response.customer === 'object') {
      customerObj = response.customer as Record<string, unknown>;
    }
    const customerEmail = customerObj.email as string;
    const customerName = (customerObj.fullName || 'Valued Rebel') as string;
    const itemsList = typeof response.items === 'string' ? JSON.parse(response.items) : (response.items || []);

    if (customerEmail && paymentStatus === 'VERIFIED') {
      sendPaymentVerifiedEmail(env, {
        toEmail: customerEmail,
        customerName,
        orderId: String(response.orderId).replace('#', ''),
        amount: Number(response.total) || 0,
        transactionId: (response.transactionId || '') as string,
      }).catch((e) => console.log('Payment verified email notice:', e.message));
    }

    if (customerEmail && orderStatus === 'SHIPPED') {
      sendShippingUpdateEmail(env, {
        toEmail: customerEmail,
        customerName,
        orderId: String(response.orderId).replace('#', ''),
        trackingNumber: (response.trackingNumber || 'TRK-CLAP-PENDING') as string,
        courierName: 'BlueDart / Delhivery Express',
      }).catch((e) => console.log('Shipping update email notice:', e.message));
    }

    if (customerEmail && orderStatus === 'DELIVERED') {
      sendOrderDeliveredEmail(env, {
        toEmail: customerEmail,
        customerName,
        orderId: String(response.orderId).replace('#', ''),
      }).catch((e) => console.log('Delivered email notice:', e.message));
    }
    
    return c.json({ success: true, data: enrichOrderDoc(response) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update order status';
    return c.json({ success: false, error: msg }, 500);
  }
});

orders.get('/', adminAuth, async (c) => {
  try {
    const { databases } = getAppwriteClient(getEnv(c));
    const dbId = getDbId(c);
    const status = c.req.query('status');
    const paymentStatus = c.req.query('paymentStatus');
    const archived = c.req.query('archived'); // 'true', 'false', 'all'
    const includePending = c.req.query('includePending') === 'true';
    const limit = parseInt(c.req.query('limit') || '250');
    
    const queries = [Query.limit(limit), Query.orderDesc('$createdAt')];
    if (status) queries.push(Query.equal('orderStatus', status));
    if (paymentStatus) queries.push(Query.equal('paymentStatus', paymentStatus));
    
    const response = await databases.listDocuments(
      dbId,
      'orders',
      queries
    );

    let filteredDocs = response.documents;

    // Archive Filtering
    if (archived === 'true') {
      filteredDocs = filteredDocs.filter((d) => Boolean(d.isArchived) === true);
    } else if (archived === 'false' || !archived) {
      if (archived !== 'all') {
        filteredDocs = filteredDocs.filter((d) => Boolean(d.isArchived) !== true);
      }
    }

    // By default, exclude PENDING (unpaid) orders from admin views
    if (!includePending && !paymentStatus) {
      filteredDocs = filteredDocs.filter(
        (d) => (d as Record<string, unknown>).paymentStatus !== 'PENDING'
      );
    }
    
    return c.json({ success: true, data: filteredDocs.map((d) => enrichOrderDoc(d)) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to list orders';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default orders;
