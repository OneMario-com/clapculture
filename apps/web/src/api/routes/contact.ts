import { Hono } from 'hono';
import { getEnv, getClientIp, isValidEmail } from '../lib/utils';
import { isRateLimited } from '../lib/redis';
import { sendContactInquiryEmail } from '../lib/email';

const contact = new Hono();

const MAX_LENGTH = { name: 100, email: 254, subject: 200, message: 5000, phone: 30 };
const CONTACT_LIMIT_PER_HOUR = 5;

/** Trim a text field; single-line fields also have newlines collapsed so they are safe in email headers. */
const readField = (value: unknown, singleLine = true): string => {
  if (typeof value !== 'string') return '';
  return singleLine ? value.replace(/\s+/g, ' ').trim() : value.trim();
};

contact.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const name = readField(body?.name);
    const email = readField(body?.email).toLowerCase();
    const subject = readField(body?.subject);
    const message = readField(body?.message, false);
    const phone = readField(body?.phone);

    if (!name || !email || !subject || !message) {
      return c.json(
        { success: false, error: 'Please provide all required fields (name, email, subject, message).' },
        400
      );
    }

    if (email.length > MAX_LENGTH.email || !isValidEmail(email)) {
      return c.json({ success: false, error: 'Please provide a valid email address.' }, 400);
    }

    if (
      name.length > MAX_LENGTH.name ||
      subject.length > MAX_LENGTH.subject ||
      message.length > MAX_LENGTH.message ||
      phone.length > MAX_LENGTH.phone
    ) {
      return c.json(
        {
          success: false,
          error: `One or more fields are too long (name ${MAX_LENGTH.name}, subject ${MAX_LENGTH.subject}, phone ${MAX_LENGTH.phone}, message ${MAX_LENGTH.message} characters max).`,
        },
        400
      );
    }

    if (await isRateLimited(`contact:ip:${getClientIp(c)}`, CONTACT_LIMIT_PER_HOUR, 60 * 60)) {
      return c.json(
        { success: false, error: 'Too many messages sent. Please try again later or email us directly.' },
        429
      );
    }

    const env = getEnv(c);

    // Send customer auto-reply + admin alert notification
    const { adminResult } = await sendContactInquiryEmail(env, {
      name,
      email,
      subject,
      message,
      phone: phone || undefined,
    });

    if (!adminResult.success) {
      console.error('Contact inquiry delivery failed:', adminResult.error);
      return c.json(
        {
          success: false,
          error: 'We could not deliver your message right now. Please try again later or email clapcultureofficial@gmail.com.',
        },
        502
      );
    }

    return c.json({
      success: true,
      message: 'Transmission received! Our support team will get back to you within 24 hours.',
    });
  } catch (error: unknown) {
    console.error('Contact inquiry error:', error);
    return c.json({ success: false, error: 'Failed to send message' }, 500);
  }
});

export default contact;
