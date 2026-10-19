import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { configureCors } from '@/api/middleware/cors';





import products from '@/api/routes/products';
import categories from '@/api/routes/categories';
import collections from '@/api/routes/collections';
import orders from '@/api/routes/orders';
import payments from '@/api/routes/payments';
import media from '@/api/routes/media';
import admin from '@/api/routes/admin';
import search from '@/api/routes/search';
import homepage from '@/api/routes/homepage';
import customers from '@/api/routes/customers';
import discounts from '@/api/routes/discounts';
import settings from '@/api/routes/settings';
import newsletter from '@/api/routes/newsletter';
import contact from '@/api/routes/contact';
import auth from '@/api/routes/auth';
import bootstrap from '@/api/routes/bootstrap';

const app = new Hono().basePath('/api');

// Apply CORS middleware
app.use('*', (c, next) => configureCors(process.env)(c, next));

// Global error handler
app.onError((err, c) => {
  console.error(`API Error: ${err}`);
  return c.json({ success: false, error: err.message || 'Internal Server Error' }, 500);
});

// Root endpoint for health check
app.get('/health', (c) => {
  return c.json({ 
    success: true, 
    message: 'Welcome to CLAPCULTURE API (Integrated Next.js + Hono)',
    status: 'Operational'
  });
});

// Mount routes
app.route('/products', products);
app.route('/categories', categories);
app.route('/collections', collections);
app.route('/orders', orders);
app.route('/payments', payments);
app.route('/media', media);
app.route('/admin', admin);
app.route('/search', search);
app.route('/homepage', homepage);
app.route('/customers', customers);
app.route('/discounts', discounts);
app.route('/settings', settings);
app.route('/newsletter', newsletter);
app.route('/contact', contact);
app.route('/auth', auth);
app.route('/bootstrap', bootstrap);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
export const OPTIONS = handle(app);
