import { Hono, Context } from 'hono';
import { getEnv, getClientIp, isValidEmail } from '../lib/utils';
import { isRateLimited } from '../lib/redis';
import { generateOtp, storeOtp, verifyOtp, isOtpPurpose } from '../lib/otp';
import { sendOtpEmail, sendPasswordResetEmail } from '../lib/email';

const auth = new Hono();

// Every OTP / reset request emails an address the caller chooses, so cap how
// often one IP can trigger mail and how often one inbox can receive it.
const OTP_SEND_LIMIT = 5;
const OTP_SEND_WINDOW_SECONDS = 60 * 60;

const parseEmail = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && isValidEmail(email) ? email : null;
};

const parsePurpose = (value: unknown) => {
  const purpose = typeof value === 'string' ? value.toUpperCase() : '';
  return isOtpPurpose(purpose) ? purpose : null;
};

async function isOtpSendLimited(c: Context, email: string): Promise<boolean> {
  const [ipLimited, emailLimited] = await Promise.all([
    isRateLimited(`otp-send:ip:${getClientIp(c)}`, OTP_SEND_LIMIT, OTP_SEND_WINDOW_SECONDS),
    isRateLimited(`otp-send:email:${email}`, OTP_SEND_LIMIT, OTP_SEND_WINDOW_SECONDS),
  ]);
  return ipLimited || emailLimited;
}

const TOO_MANY_REQUESTS = 'Too many verification requests. Please try again later.';

// Send OTP to Email
auth.post('/otp/send', async (c) => {
  try {
    const { email, purpose = 'LOGIN', customerName } = await c.req.json();

    const cleanEmail = parseEmail(email);
    if (!cleanEmail) {
      return c.json({ success: false, error: 'Please provide a valid email address.' }, 400);
    }

    const cleanPurpose = parsePurpose(purpose);
    if (!cleanPurpose) {
      return c.json({ success: false, error: 'Invalid OTP purpose.' }, 400);
    }

    if (await isOtpSendLimited(c, cleanEmail)) {
      return c.json({ success: false, error: TOO_MANY_REQUESTS }, 429);
    }

    const otp = generateOtp();
    const expiryMinutes = 10;

    await storeOtp(cleanEmail, cleanPurpose, otp, expiryMinutes);

    const env = getEnv(c);

    // Send OTP via Gmail SMTP / Appwrite Messaging
    const mailResult = await sendOtpEmail(env, {
      toEmail: cleanEmail,
      customerName: typeof customerName === 'string' ? customerName.trim().slice(0, 60) : undefined,
      otp,
      purpose: cleanPurpose,
      expiryMinutes,
    });

    if (!mailResult.success) {
      console.error('OTP Send Error: email delivery failed:', mailResult.error);
      return c.json({ success: false, error: 'Failed to send OTP code. Please try again later.' }, 502);
    }

    return c.json({
      success: true,
      message: `A 6-digit OTP code has been dispatched to ${cleanEmail}. Valid for ${expiryMinutes} minutes.`,
      expiryMinutes,
    });
  } catch (error: unknown) {
    console.error('OTP Send Error:', error);
    return c.json({ success: false, error: 'Failed to send OTP code' }, 500);
  }
});

// Verify Entered OTP
auth.post('/otp/verify', async (c) => {
  try {
    // Each code allows 5 guesses; this also caps guessing across many codes from one IP.
    if (await isRateLimited(`otp-verify:ip:${getClientIp(c)}`, 20, OTP_SEND_WINDOW_SECONDS)) {
      return c.json({ success: false, error: TOO_MANY_REQUESTS }, 429);
    }

    const { email, purpose = 'LOGIN', otp } = await c.req.json();

    const cleanEmail = parseEmail(email);
    if (!cleanEmail || !otp) {
      return c.json({ success: false, error: 'Email and OTP are required.' }, 400);
    }

    const cleanPurpose = parsePurpose(purpose);
    if (!cleanPurpose) {
      return c.json({ success: false, error: 'Invalid OTP purpose.' }, 400);
    }

    const result = await verifyOtp(cleanEmail, cleanPurpose, String(otp));

    if (!result.valid) {
      return c.json({ success: false, error: result.reason || 'Invalid OTP code' }, 400);
    }

    return c.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully.',
      email: cleanEmail,
      purpose: cleanPurpose,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error('OTP Verify Error:', error);
    return c.json({ success: false, error: 'Verification failed' }, 500);
  }
});

// Request Password Reset
auth.post('/password-reset', async (c) => {
  try {
    const { email } = await c.req.json();

    const cleanEmail = parseEmail(email);
    if (!cleanEmail) {
      return c.json({ success: false, error: 'Valid email is required.' }, 400);
    }

    if (await isOtpSendLimited(c, cleanEmail)) {
      return c.json({ success: false, error: TOO_MANY_REQUESTS }, 429);
    }

    const resetCode = generateOtp();
    const env = getEnv(c);

    await storeOtp(cleanEmail, 'PASSWORD_RESET', resetCode, 15);

    await sendPasswordResetEmail(env, {
      toEmail: cleanEmail,
      resetCode,
    });

    return c.json({
      success: true,
      message: 'Password reset instructions and security code have been sent to your email.',
    });
  } catch (error: unknown) {
    console.error('Password Reset Error:', error);
    return c.json({ success: false, error: 'Failed to initiate password reset' }, 500);
  }
});

export default auth;
