import { Hono } from 'hono';
import { adminAuth } from '../middleware/auth';
import { getEnv, getClientIp } from '../lib/utils';
import { isJwtConfigured, signAdminToken, timingSafeEqual } from '../lib/jwt';
import { isRateLimited, clearRateLimit } from '../lib/redis';
import { listOrdersCached } from '../lib/orders';

const admin = new Hono();

const LOGIN_ATTEMPTS_PER_WINDOW = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

// Admin credentials come from server environment variables, not the database:
// login keeps working while Appwrite is paused, costs zero database reads, and
// a customer record can never be mistaken for an admin account.
admin.post('/login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!username || !password) {
      return c.json({ success: false, error: 'Username and password required' }, 400);
    }

    const env = getEnv(c);
    const adminEmail = (env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@clapculture.com').trim().toLowerCase();
    const adminPassword = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '';

    if (!adminPassword || !isJwtConfigured()) {
      console.error('Admin login is not configured: set ADMIN_PASSWORD and a new random JWT_SECRET (32+ chars).');
      return c.json({
        success: false,
        error: 'Admin login is not configured on the server. Set ADMIN_PASSWORD and a new JWT_SECRET in the environment.',
      }, 503);
    }

    const limiterKey = `admin-login:${getClientIp(c)}`;
    if (await isRateLimited(limiterKey, LOGIN_ATTEMPTS_PER_WINDOW, LOGIN_WINDOW_SECONDS)) {
      return c.json({ success: false, error: 'Too many login attempts. Please wait 15 minutes and try again.' }, 429);
    }

    const [emailMatches, passwordMatches] = await Promise.all([
      timingSafeEqual(username, adminEmail),
      timingSafeEqual(password, adminPassword),
    ]);
    if (!emailMatches || !passwordMatches) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }

    await clearRateLimit(limiterKey);

    const adminUser = {
      id: 'admin',
      username: adminEmail,
      role: 'admin',
    };

    // Sign JWT session token
    const token = await signAdminToken(adminUser);
    
    return c.json({
      success: true,
      data: {
        token,
        user: adminUser,
        expiresIn: '24h',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

admin.get('/dashboard', adminAuth, async (c) => {
  try {
    const allOrders = await listOrdersCached(c);

    const totalOrders = allOrders.length;
    const totalSales = allOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const pendingPayments = allOrders.filter((o) => o.paymentStatus === 'SUBMITTED').length;
    
    return c.json({ 
      success: true, 
      data: {
        totalOrders,
        totalSales,
        pendingPayments
      } 
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ success: false, error: msg }, 500);
  }
});

admin.get('/me', adminAuth, async (c) => {
  const adminData = (c.get('admin' as never) || {}) as Record<string, unknown>;
  return c.json({ success: true, data: adminData });
});

// Verify Gmail SMTP Connectivity
admin.get('/email/verify', adminAuth, async (c) => {
  const { verifySmtpConnection } = await import('../lib/mailer');
  const env = getEnv(c);
  const result = await verifySmtpConnection(env);
  return c.json(result);
});

// Send Test Email via Gmail SMTP / Appwrite Messaging
// Admin-only: otherwise anyone could use the store's Gmail account to email arbitrary addresses.
admin.post('/email/test', adminAuth, async (c) => {
  try {
    const {
      sendTestEmail,
      sendOtpEmail,
      sendNewsletterWelcomeEmail,
      sendOrderConfirmationEmail,
      sendPaymentVerifiedEmail,
      sendPaymentFailedEmail,
      sendShippingUpdateEmail,
      sendOutForDeliveryEmail,
      sendOrderDeliveredEmail,
      sendOrderCancelledEmail,
      sendRefundProcessedEmail,
      sendAbandonedCartEmail,
    } = await import('../lib/email');

    const body = await c.req.json().catch(() => ({}));
    const env = getEnv(c);
    const targetEmail = body.to || env?.SMTP_USER || process.env.SMTP_USER || 'clapcultureofficial@gmail.com';
    const type = (body.type || 'test').toLowerCase();

    let result;
    if (type === 'otp') {
      result = await sendOtpEmail(env, {
        toEmail: targetEmail,
        customerName: 'Test Rebel',
        otp: body.otp || '849201',
        purpose: body.purpose || 'LOGIN',
        expiryMinutes: 10,
      });
    } else if (type === 'order' || type === 'order_confirmation') {
      result = await sendOrderConfirmationEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra (Test Rebel)',
        orderId: 'CLAP-TEST-99001',
        totalAmount: 2798,
        subtotal: 2998,
        discountAmount: 200,
        shippingFee: 0,
        customerPhone: '+91 98765 43210',
        paymentStatus: 'VERIFIED',
        shippingAddress: 'Plot 42, Road No 36, Jubilee Hills, Hyderabad, Telangana 500033',
        items: [
          { name: 'OG Senani Heavyweight Oversized Tee', size: 'XL', quantity: 1, price: 1499 },
          { name: 'Rebel Star Washed Drop Tee', size: 'L', quantity: 1, price: 1299 },
        ],
      });
    } else if (type === 'payment_verified') {
      result = await sendPaymentVerifiedEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        orderId: 'CLAP-TEST-99001',
        transactionId: 'UPI-REF-99882211',
        amount: 2798,
      });
    } else if (type === 'payment_failed') {
      result = await sendPaymentFailedEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        orderId: 'CLAP-TEST-99001',
        reason: 'Payment reference UTR could not be matched. Please retry payment.',
        amount: 2798,
      });
    } else if (type === 'shipping') {
      result = await sendShippingUpdateEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        orderId: 'CLAP-TEST-99001',
        trackingNumber: 'TRK-CLAP-987654321IN',
        courierName: 'BlueDart Express',
        estimatedDelivery: '2 Business Days',
      });
    } else if (type === 'out_for_delivery') {
      result = await sendOutForDeliveryEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        orderId: 'CLAP-TEST-99001',
        trackingNumber: 'TRK-CLAP-987654321IN',
        deliveryAgent: 'Ramesh Kumar (BlueDart)',
        deliveryPhone: '+91 91234 56789',
      });
    } else if (type === 'delivered') {
      result = await sendOrderDeliveredEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        orderId: 'CLAP-TEST-99001',
        discountCode: 'REBEL10',
      });
    } else if (type === 'cancelled') {
      result = await sendOrderCancelledEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        orderId: 'CLAP-TEST-99001',
        reason: 'Customer requested size change / reorder.',
        refundAmount: 2798,
      });
    } else if (type === 'refund') {
      result = await sendRefundProcessedEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        orderId: 'CLAP-TEST-99001',
        refundAmount: 2798,
        refundReference: 'RFND-UPI-8822001',
      });
    } else if (type === 'welcome') {
      result = await sendNewsletterWelcomeEmail(env, {
        toEmail: targetEmail,
        discountCode: 'REBEL10',
        discountPercentage: 10,
      });
    } else if (type === 'abandoned_cart') {
      result = await sendAbandonedCartEmail(env, {
        toEmail: targetEmail,
        customerName: 'Surendra',
        totalAmount: 1499,
        checkoutUrl: 'http://localhost:3000/checkout',
        discountCode: 'REBEL5',
        items: [
          { name: 'OG Senani Heavyweight Oversized Tee', size: 'XL', quantity: 1, price: 1499 },
        ],
      });
    } else {
      result = await sendTestEmail(env, targetEmail);
    }

    return c.json({ success: true, type, targetEmail, result });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to send test email';
    return c.json({ success: false, error: msg }, 500);
  }
});

export default admin;
