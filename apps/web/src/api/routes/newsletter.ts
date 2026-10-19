import { Hono } from 'hono';
import { getEnv, getClientIp, isValidEmail, runInBackground } from '../lib/utils';
import { isRateLimited, redis, redisPipeline } from '../lib/redis';
import { sendNewsletterWelcomeEmail } from '../lib/email';
import { upsertCustomerAndUser } from './customers';

const newsletter = new Hono();

const NEWSLETTER_LIMIT_PER_HOUR = 5;
const SUBSCRIBED_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const SUCCESS_MESSAGE = 'Welcome to CLAPCULTURE! An exclusive 10% discount code has been sent to your inbox.';

newsletter.post('/', async (c) => {
  try {
    const { email } = await c.req.json();
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!cleanEmail || cleanEmail.length > 254 || !isValidEmail(cleanEmail)) {
      return c.json({ success: false, error: 'Please provide a valid email address.' }, 400);
    }

    if (await isRateLimited(`newsletter:ip:${getClientIp(c)}`, NEWSLETTER_LIMIT_PER_HOUR, 60 * 60)) {
      return c.json({ success: false, error: 'Too many requests. Please try again later.' }, 429);
    }

    // De-duplicate: an address that already subscribed gets the same answer
    // without another welcome email or Appwrite write. (null = Redis unavailable.)
    const subscribedKey = `cc:nl:${cleanEmail}`;
    const claim = await redisPipeline([['SET', subscribedKey, 1, 'EX', SUBSCRIBED_TTL_SECONDS, 'NX']]);
    if (claim && claim[0] !== 'OK') {
      return c.json({ success: true, message: SUCCESS_MESSAGE, discountCode: 'REBEL10' });
    }

    const env = getEnv(c);

    // Save lead/customer to Appwrite
    runInBackground(
      upsertCustomerAndUser(env, {
        email: cleanEmail,
        source: 'newsletter_subscription',
      }),
      'Newsletter lead capture'
    );

    // Send Welcome Email with Discount Code
    const mailResult = await sendNewsletterWelcomeEmail(env, {
      toEmail: cleanEmail,
      discountCode: 'REBEL10',
      discountPercentage: 10,
    });

    if (!mailResult.success) {
      console.error('Newsletter welcome email failed:', mailResult.error);
      // Release the de-dupe claim so the visitor can retry.
      if (claim) await redis(['DEL', subscribedKey]);
      return c.json({ success: false, error: 'We could not send your welcome email right now. Please try again later.' }, 502);
    }

    return c.json({
      success: true,
      message: SUCCESS_MESSAGE,
      discountCode: 'REBEL10',
    });
  } catch (error: unknown) {
    console.error('Newsletter subscription error:', error);
    return c.json({ success: false, error: 'Failed to subscribe' }, 500);
  }
});

export default newsletter;
