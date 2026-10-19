import { Query, ID, Users } from 'node-appwrite';
import { getAppwriteClient, AppwriteEnv } from './appwrite';
import { sendMail, MailResult, MailOptions } from './mailer';
import { buildClapCultureEmailTemplate } from './email-template';
import { redis } from './redis';
import { escapeHtml } from './utils';

// ─────────────────────────────────────────────────────────────────────────────
// CORE DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID_CACHE_TTL = 30 * 24 * 60 * 60; // 30 days
const userIdCacheKey = (email: string) => `cc:uid:${email}`;

/**
 * Find (or create) the Appwrite Auth user Appwrite Messaging needs as a
 * recipient. Without Redis this costs 1-2 Appwrite calls per email; with Redis
 * the id is cached so repeat recipients cost none.
 */
async function resolveMessagingUserId(users: Users, email: string): Promise<string | null> {
  const findByEmail = async () => {
    const found = await users.list([Query.equal('email', email), Query.limit(1)]);
    return found.users[0]?.$id ?? null;
  };

  let userId = await findByEmail();
  if (!userId) {
    try {
      // Create user in Appwrite Auth so Appwrite Messaging can deliver to them
      const newUser = await users.create(ID.unique(), email, undefined, undefined, email.split('@')[0]);
      userId = newUser.$id;
    } catch (err) {
      // 409: created concurrently by another request, so look it up once more.
      if ((err as { code?: number })?.code !== 409) throw err;
      userId = await findByEmail();
    }
  }

  if (userId) {
    await redis(['SET', userIdCacheKey(email), userId, 'EX', USER_ID_CACHE_TTL]);
  }
  return userId;
}

export async function dispatchPlatformEmail(
  options: MailOptions,
  env?: AppwriteEnv
): Promise<MailResult> {
  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const cleanEmails = recipients.map((email) => email.toLowerCase().trim());
  let usedCachedIds = false;

  // 1. Try Appwrite Messaging Service (Logs in Appwrite Console -> Messaging -> Messages)
  try {
    const { client, messaging, users } = getAppwriteClient(env);
    if (client && messaging && users) {
      const userIds: string[] = [];
      const cachedIds = await redis(['MGET', ...cleanEmails.map(userIdCacheKey)]);

      for (const [index, cleanEmail] of cleanEmails.entries()) {
        const cachedId = Array.isArray(cachedIds) ? cachedIds[index] : null;
        if (typeof cachedId === 'string' && cachedId) {
          userIds.push(cachedId);
          usedCachedIds = true;
          continue;
        }
        try {
          const userId = await resolveMessagingUserId(users, cleanEmail);
          if (userId) userIds.push(userId);
        } catch (lookupErr: unknown) {
          const msg = lookupErr instanceof Error ? lookupErr.message : String(lookupErr);
          console.log(`ℹ️ [Appwrite Messaging] Could not resolve recipient ${cleanEmail}: ${msg}`);
        }
      }

      if (userIds.length > 0) {
        const message = await messaging.createEmail(
          ID.unique(),
          options.subject,
          options.html,
          [], // topics
          userIds, // Appwrite User IDs
          [], // targets
          [], // cc
          [], // bcc
          [], // attachments
          false, // draft = false (dispatch immediately)
          true // html = true
        );

        if (message?.$id) {
          console.log(`✉️ [Appwrite Messaging] Message [ID: ${message.$id}] created and dispatched to ${recipients.join(', ')}`);
          return { success: true, messageId: message.$id };
        }
      }
    }
  } catch (appwriteErr: unknown) {
    const msg = appwriteErr instanceof Error ? appwriteErr.message : String(appwriteErr);
    console.log(`ℹ️ [Appwrite Messaging -> Direct SMTP Fallback]: ${msg}`);
    // A cached id may point at a deleted Appwrite user; drop it so the next email re-resolves it.
    if (usedCachedIds) {
      await redis(['DEL', ...cleanEmails.map(userIdCacheKey)]);
    }
  }

  // 2. Direct Gmail SMTP Delivery via Nodemailer
  return sendMail(options, env);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OrderItem {
  name: string;
  size: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

export interface OrderEmailData {
  toEmail: string;
  customerName: string;
  orderId: string;
  totalAmount: number;
  subtotal?: number;
  discountAmount?: number;
  shippingFee?: number;
  items: OrderItem[];
  paymentStatus: string;
  shippingAddress: string;
  customerPhone?: string;
  paymentMethod?: string;
  utrNumber?: string;
  orderDate?: string;
}

export interface OtpEmailData {
  toEmail: string;
  customerName?: string;
  otp: string;
  purpose?: string;
  expiryMinutes?: number;
}

export interface PaymentVerifiedData {
  toEmail: string;
  customerName: string;
  orderId: string;
  transactionId?: string;
  amount?: number;
  paymentMethod?: string;
}

export interface PaymentFailedData {
  toEmail: string;
  customerName: string;
  orderId: string;
  reason?: string;
  amount?: number;
}

export interface ShippingUpdateData {
  toEmail: string;
  customerName: string;
  orderId: string;
  trackingNumber: string;
  courierName?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

export interface OutForDeliveryData {
  toEmail: string;
  customerName: string;
  orderId: string;
  trackingNumber: string;
  deliveryAgent?: string;
  deliveryPhone?: string;
}

export interface OrderDeliveredData {
  toEmail: string;
  customerName: string;
  orderId: string;
  deliveredAt?: string;
  discountCode?: string;
}

export interface OrderCancelledData {
  toEmail: string;
  customerName: string;
  orderId: string;
  reason?: string;
  refundAmount?: number;
  refundMethod?: string;
}

export interface RefundProcessedData {
  toEmail: string;
  customerName: string;
  orderId: string;
  refundAmount: number;
  refundReference: string;
  refundMethod?: string;
}

export interface NewsletterWelcomeData {
  toEmail: string;
  discountCode?: string;
  discountPercentage?: number;
}

export interface AbandonedCartData {
  toEmail: string;
  customerName?: string;
  items: OrderItem[];
  totalAmount: number;
  checkoutUrl: string;
  discountCode?: string;
}

export interface ContactInquiryData {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}

export interface AdminAlertData {
  subject: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  metadata?: Record<string, unknown>;
}

export interface PasswordResetData {
  toEmail: string;
  customerName?: string;
  resetCode: string;
  resetLink?: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// 1. OTP VERIFICATION EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOtpEmail(
  env: AppwriteEnv | undefined,
  data: OtpEmailData
): Promise<MailResult> {
  const expiry = data.expiryMinutes || 10;
  const otp = escapeHtml(data.otp);
  const purposeLabel =
    data.purpose === 'LOGIN' ? 'ACCOUNT LOGIN' :
    data.purpose === 'CHECKOUT' ? 'CHECKOUT VERIFICATION' :
    data.purpose === 'ORDER_TRACKING' ? 'ORDER TRACKING ACCESS' :
    data.purpose === 'ADMIN_2FA' ? 'ADMIN SECURITY ACCESS' :
    data.purpose === 'PASSWORD_RESET' ? 'PASSWORD RESET' :
    'VERIFICATION';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px;">
      Use the following One-Time Password (OTP) to complete your <strong style="color: #ffffff;">${purposeLabel}</strong> on CLAPCULTURE.
    </p>

    <!-- OTP GLOW BOX -->
    <div style="background-color: #0a0a0a; border: 2px solid #d2f000; border-radius: 10px; padding: 28px; margin: 24px 0; text-align: center; box-shadow: 0 0 20px rgba(210, 240, 0, 0.15);">
      <span style="font-size: 10px; color: #a3a3a3; font-weight: 900; letter-spacing: 0.25em; font-family: monospace; text-transform: uppercase;">
        ONE-TIME PASSWORD
      </span>
      <div style="font-size: 40px; font-weight: 900; color: #d2f000; font-family: monospace; letter-spacing: 0.35em; margin: 12px 0 6px 0; padding-left: 0.35em;">
        ${otp}
      </div>
      <div style="font-size: 11px; color: #737373; font-family: monospace; margin-top: 8px;">
        &bull; VALID FOR <span style="color: #ffffff; font-weight: bold;">${expiry} MINUTES</span> ONLY &bull;
      </div>
    </div>

    <!-- SECURITY NOTICE -->
    <div style="background-color: #171717; border-left: 3px solid #d2f000; padding: 14px 18px; margin-bottom: 20px; font-size: 12px; color: #a3a3a3; line-height: 1.6;">
      <strong style="color: #ffffff;">Security Alert:</strong> Never share this OTP with anyone. CLAPCULTURE team members will never ask for your verification code.
    </div>

    <p style="font-size: 12px; color: #737373; margin: 0;">
      If you did not request this OTP code, you can safely ignore this transmission.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Your CLAPCULTURE OTP is ${otp} — Valid for ${expiry} mins`,
    badge: 'SECURITY VERIFICATION',
    badgeColor: 'lime',
    title: 'YOUR VERIFICATION CODE',
    subtitle: purposeLabel,
    customerName: data.customerName,
    bodyHtml,
    footerNotice: `This single-use code was requested for ${escapeHtml(data.toEmail)}. Expires in ${expiry} minutes.`,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `[${data.otp}] Your CLAPCULTURE Verification Code`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ORDER CONFIRMATION & FULL RECEIPT EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(
  env: AppwriteEnv | undefined,
  data: OrderEmailData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const trackUrl = `${baseUrl}/track-order?orderId=${encodeURIComponent(data.orderId)}&email=${encodeURIComponent(data.toEmail)}`;

  const orderId = escapeHtml(data.orderId);

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #222222;">
      <td style="padding: 14px 0; font-weight: 700; color: #ffffff;">
        ${escapeHtml(item.name)}
        <div style="font-size: 11px; color: #737373; font-weight: 400; text-transform: uppercase; margin-top: 2px;">
          SIZE: <span style="color: #d2f000; font-weight: bold;">${escapeHtml(item.size)}</span>
        </div>
      </td>
      <td style="padding: 14px 0; color: #a3a3a3; text-align: center; font-family: monospace; font-size: 13px;">x${escapeHtml(item.quantity)}</td>
      <td style="padding: 14px 0; color: #d2f000; font-weight: 800; text-align: right; font-family: monospace; font-size: 14px;">₹${item.price * item.quantity}</td>
    </tr>
  `
    )
    .join('');

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px;">
      Your order <strong style="color: #d2f000; font-family: monospace; font-size: 16px;">#${orderId}</strong> has been confirmed and placed with our fulfillment crew!
    </p>

    <!-- ORDER SUMMARY TABLE -->
    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #262626; padding-bottom: 10px; margin-bottom: 12px;">
        <span style="font-size: 11px; font-weight: 900; color: #737373; letter-spacing: 0.15em; text-transform: uppercase; font-family: monospace;">
          ORDER RECEIPT
        </span>
        <span style="font-size: 11px; color: #a3a3a3; font-family: monospace;">
          ${data.orderDate ? escapeHtml(data.orderDate) : new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 2px solid #262626; text-align: left; color: #737373; font-size: 10px; font-family: monospace; letter-spacing: 0.1em;">
            <th style="padding-bottom: 8px;">ITEM</th>
            <th style="padding-bottom: 8px; text-align: center;">QTY</th>
            <th style="padding-bottom: 8px; text-align: right;">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- PRICING BREAKDOWN -->
      <div style="border-top: 2px solid #262626; margin-top: 16px; padding-top: 14px;">
        ${data.subtotal ? `
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #a3a3a3; margin-bottom: 6px;">
          <span>Subtotal:</span>
          <span style="font-family: monospace;">₹${data.subtotal}</span>
        </div>` : ''}
        ${data.discountAmount ? `
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #4ade80; margin-bottom: 6px;">
          <span>Discount:</span>
          <span style="font-family: monospace;">-₹${data.discountAmount}</span>
        </div>` : ''}
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: #a3a3a3; margin-bottom: 8px;">
          <span>Shipping:</span>
          <span style="color: #d2f000; font-weight: bold; font-family: monospace;">${(data.shippingFee && data.shippingFee > 0) ? `₹${data.shippingFee}` : 'FREE (PAN-INDIA)'}</span>
        </div>
        <div style="border-top: 1px solid #222; padding-top: 10px; text-align: right;">
          <span style="font-size: 11px; color: #737373; margin-right: 12px; font-family: monospace; text-transform: uppercase;">TOTAL PAID:</span>
          <span style="font-size: 24px; font-weight: 900; color: #d2f000; font-family: monospace;">₹${data.totalAmount}</span>
        </div>
      </div>
    </div>

    <!-- SHIPPING ADDRESS & INFO -->
    <div style="background-color: #171717; border: 1px solid #262626; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 800; color: #737373; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px; font-family: monospace;">
        DELIVERY DESTINATION
      </div>
      <div style="color: #ffffff; font-size: 13px; line-height: 1.6;">
        <strong>${escapeHtml(data.customerName)}</strong><br/>
        ${escapeHtml(data.shippingAddress)}<br/>
        ${data.customerPhone ? `<span style="color: #a3a3a3;">Contact: ${escapeHtml(data.customerPhone)}</span>` : ''}
      </div>
    </div>

    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      We will dispatch your order via Express Courier within 24 hours. Click below to view live milestone updates.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Order #${orderId} Confirmed — CLAPCULTURE`,
    badge: 'BOOKING CONFIRMED',
    badgeColor: 'lime',
    title: `ORDER #${orderId}`,
    subtitle: 'THANK YOU FOR JOINING THE CULTURE',
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'TRACK YOUR ORDER',
    buttonUrl: trackUrl,
    secondaryButtonText: 'VISIT STORE',
    secondaryButtonUrl: `${baseUrl}/shop`,
    footerNotice: `This email is a formal confirmation of order #${orderId}. Keep this email for your records.`,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Order Confirmed #${data.orderId} - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PAYMENT VERIFIED & RECEIVED EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPaymentVerifiedEmail(
  env: AppwriteEnv | undefined,
  data: PaymentVerifiedData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const trackUrl = `${baseUrl}/track-order?orderId=${encodeURIComponent(data.orderId)}&email=${encodeURIComponent(data.toEmail)}`;

  const orderId = escapeHtml(data.orderId);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      Awesome news! Your payment for Order <strong style="color: #d2f000; font-family: monospace;">#${orderId}</strong> has been <span style="color: #4ade80; font-weight: 900;">VERIFIED & RECEIVED</span> by our accounts department.
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 11px; color: #737373; font-weight: 800; letter-spacing: 0.15em; font-family: monospace; text-transform: uppercase;">
        PAYMENT STATUS
      </div>
      <div style="font-size: 20px; font-weight: 900; color: #4ade80; margin-top: 4px; letter-spacing: 0.05em;">
        &check; PAYMENT CONFIRMED
      </div>
      ${data.transactionId ? `
      <div style="font-family: monospace; font-size: 12px; color: #a3a3a3; margin-top: 8px; border-top: 1px solid #222; padding-top: 8px;">
        UTR / Ref: <span style="color: #d2f000;">${escapeHtml(data.transactionId)}</span>
      </div>` : ''}
    </div>

    <p style="color: #d4d4d4; font-size: 14px; margin: 0 0 8px 0;">
      Your street gear is now being customized and packaged for express fulfillment. You will receive tracking details within 24 hours.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Payment Verified for Order #${orderId} — CLAPCULTURE`,
    badge: 'PAYMENT VERIFIED',
    badgeColor: 'cyan',
    title: `PAYMENT RECEIVED`,
    subtitle: `ORDER #${orderId}`,
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'VIEW ORDER TIMELINE',
    buttonUrl: trackUrl,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Payment Verified for Order #${data.orderId} - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAYMENT FAILED / ACTION REQUIRED EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPaymentFailedEmail(
  env: AppwriteEnv | undefined,
  data: PaymentFailedData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const payUrl = `${baseUrl}/payment/${encodeURIComponent(data.orderId)}`;
  const orderId = escapeHtml(data.orderId);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      We were unable to verify your payment for Order <strong style="color: #ef4444; font-family: monospace;">#${orderId}</strong>.
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #ef4444; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 11px; color: #ef4444; font-weight: 800; letter-spacing: 0.15em; font-family: monospace; text-transform: uppercase;">
        STATUS: ACTION REQUIRED
      </div>
      <div style="font-size: 16px; font-weight: 800; color: #ffffff; margin-top: 6px;">
        ${escapeHtml(data.reason || 'Payment screenshot or transaction reference could not be verified.')}
      </div>
    </div>

    <p style="color: #d4d4d4; font-size: 14px; margin: 0 0 16px 0;">
      Your items are held in stock for 24 hours. Please click below to resubmit your UPI payment screenshot or complete payment.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Action Required: Payment Pending for Order #${orderId}`,
    badge: 'PAYMENT PENDING',
    badgeColor: 'red',
    title: 'PAYMENT ACTION REQUIRED',
    subtitle: `ORDER #${orderId}`,
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'COMPLETE PAYMENT NOW',
    buttonUrl: payUrl,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Action Required: Payment for Order #${data.orderId} - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ORDER SHIPPED & DISPATCH EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendShippingUpdateEmail(
  env: AppwriteEnv | undefined,
  data: ShippingUpdateData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const trackUrl = data.trackingUrl || `${baseUrl}/track-order?orderId=${encodeURIComponent(data.orderId)}&email=${encodeURIComponent(data.toEmail)}`;

  const orderId = escapeHtml(data.orderId);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      Your package for Order <strong style="color: #d2f000; font-family: monospace;">#${orderId}</strong> has officially been <span style="color: #38bdf8; font-weight: 900;">DISPATCHED</span> and is on its way to you!
    </p>

    <!-- TRACKING CODE HIGHLIGHT BOX -->
    <div style="background-color: #0a0a0a; border: 2px dashed #d2f000; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
      <span style="font-size: 10px; color: #a3a3a3; font-weight: 900; letter-spacing: 0.2em; font-family: monospace; text-transform: uppercase;">
        COURIER TRACKING NUMBER
      </span>
      <div style="font-size: 26px; font-weight: 900; color: #d2f000; font-family: monospace; letter-spacing: 0.1em; margin: 8px 0;">
        ${escapeHtml(data.trackingNumber)}
      </div>
      <div style="font-size: 12px; color: #737373;">
        Courier: <strong style="color: #ffffff;">${escapeHtml(data.courierName || 'Express Courier')}</strong> &bull; Est. Delivery: <strong style="color: #ffffff;">${escapeHtml(data.estimatedDelivery || '2-4 Business Days')}</strong>
      </div>
    </div>

    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      Click the button below to monitor live milestone updates for your delivery.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Your Order #${orderId} Has Shipped! — CLAPCULTURE`,
    badge: 'PACKAGE DISPATCHED',
    badgeColor: 'amber',
    title: 'YOUR GEAR IS ON THE WAY',
    subtitle: `ORDER #${orderId}`,
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'LIVE PACKAGE TRACKING',
    buttonUrl: trackUrl,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Your Order #${data.orderId} Has Shipped! - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. OUT FOR DELIVERY EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOutForDeliveryEmail(
  env: AppwriteEnv | undefined,
  data: OutForDeliveryData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const trackUrl = `${baseUrl}/track-order?orderId=${encodeURIComponent(data.orderId)}&email=${encodeURIComponent(data.toEmail)}`;

  const orderId = escapeHtml(data.orderId);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px;">
      Get ready! Order <strong style="color: #d2f000; font-family: monospace;">#${orderId}</strong> is <span style="color: #d2f000; font-weight: 900;">OUT FOR DELIVERY TODAY</span>!
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 30px; margin-bottom: 8px;">🚚</div>
      <div style="font-size: 18px; font-weight: 900; color: #ffffff; text-transform: uppercase;">
        ARRIVING TODAY
      </div>
      <div style="font-size: 12px; color: #a3a3a3; margin-top: 6px;">
        Tracking Ref: <span style="color: #d2f000; font-family: monospace;">${escapeHtml(data.trackingNumber)}</span>
      </div>
      ${data.deliveryAgent ? `
      <div style="font-size: 12px; color: #737373; margin-top: 6px;">
        Delivery Partner: <strong style="color: #fff;">${escapeHtml(data.deliveryAgent)}</strong> ${data.deliveryPhone ? `(${escapeHtml(data.deliveryPhone)})` : ''}
      </div>` : ''}
    </div>

    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      Please ensure someone is available at your delivery location to receive the package.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Out for Delivery Today: Order #${orderId} — CLAPCULTURE`,
    badge: 'OUT FOR DELIVERY',
    badgeColor: 'lime',
    title: 'ARRIVING TODAY',
    subtitle: `ORDER #${orderId}`,
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'TRACK LIVE DELIVERY',
    buttonUrl: trackUrl,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Out for Delivery: Order #${data.orderId} Arriving Today - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ORDER DELIVERED / COMPLETED EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOrderDeliveredEmail(
  env: AppwriteEnv | undefined,
  data: OrderDeliveredData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const code = escapeHtml(data.discountCode || 'REBEL10');
  const orderId = escapeHtml(data.orderId);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      Courier records confirm that Order <strong style="color: #d2f000; font-family: monospace;">#${orderId}</strong> has successfully been <span style="color: #4ade80; font-weight: 900;">DELIVERED</span>.
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <div style="font-size: 28px; margin-bottom: 8px;">🔥</div>
      <div style="font-size: 18px; font-weight: 900; color: #ffffff; text-transform: uppercase;">
        WEAR IT LOUD. WEAR IT PROUD.
      </div>
      <p style="font-size: 13px; color: #a3a3a3; margin: 8px 0 0 0;">
        Tag us on Instagram <a href="https://www.instagram.com/clapculture_" target="_blank" style="color: #d2f000; text-decoration: none;"><strong>@clapculture_</strong></a> to get featured on our official drop feed.
      </p>
    </div>

    <!-- LOYALTY DISCOUNT VOUCHER -->
    <div style="background-color: #1a1a1a; border: 1px dashed #d2f000; border-radius: 8px; padding: 18px; margin: 20px 0; text-align: center;">
      <span style="font-size: 10px; color: #a3a3a3; font-weight: 800; letter-spacing: 0.15em; font-family: monospace; text-transform: uppercase;">
        EXCLUSIVE REBEL 10% DISCOUNT CODE
      </span>
      <div style="font-size: 26px; font-weight: 900; color: #d2f000; font-family: monospace; letter-spacing: 0.1em; margin-top: 4px;">
        ${code}
      </div>
      <p style="font-size: 11px; color: #737373; margin: 4px 0 0 0;">Use this code on your next streetwear haul.</p>
    </div>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Order #${orderId} Delivered — CLAPCULTURE`,
    badge: 'DELIVERED',
    badgeColor: 'lime',
    title: 'DELIVERY CONFIRMED',
    subtitle: `ORDER #${orderId}`,
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'SHOP NEW DROPS',
    buttonUrl: `${baseUrl}/shop`,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Order #${data.orderId} Delivered - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ORDER CANCELLED EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOrderCancelledEmail(
  env: AppwriteEnv | undefined,
  data: OrderCancelledData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';

  const orderId = escapeHtml(data.orderId);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      Order <strong style="color: #ffffff; font-family: monospace;">#${orderId}</strong> has been <span style="color: #ef4444; font-weight: 900;">CANCELLED</span>.
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #737373; text-transform: uppercase; font-family: monospace; margin-bottom: 6px;">
        CANCELLATION DETAILS
      </div>
      <div style="font-size: 13px; color: #e5e5e5;">
        ${escapeHtml(data.reason || 'Cancelled upon customer request or payment timeout.')}
      </div>
      ${data.refundAmount ? `
      <div style="font-size: 13px; color: #d2f000; font-weight: bold; margin-top: 10px; border-top: 1px solid #222; padding-top: 10px;">
        Refund Amount: ₹${data.refundAmount} (Will reflect in 3-5 business days)
      </div>` : ''}
    </div>

    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      If you did not request this cancellation or have questions, reach us at <a href="mailto:clapcultureofficial@gmail.com" style="color: #d2f000;">clapcultureofficial@gmail.com</a>.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Order #${orderId} Cancelled — CLAPCULTURE`,
    badge: 'ORDER CANCELLED',
    badgeColor: 'red',
    title: 'ORDER CANCELLED',
    subtitle: `ORDER #${orderId}`,
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'VISIT STOREFRONT',
    buttonUrl: baseUrl,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Order #${data.orderId} Cancelled - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. REFUND PROCESSED EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendRefundProcessedEmail(
  env: AppwriteEnv | undefined,
  data: RefundProcessedData
): Promise<MailResult> {
  const orderId = escapeHtml(data.orderId);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      A refund for Order <strong style="color: #ffffff; font-family: monospace;">#${orderId}</strong> has been <span style="color: #4ade80; font-weight: 900;">SUCCESSFULLY PROCESSED</span>.
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <span style="font-size: 11px; color: #737373; font-weight: 800; letter-spacing: 0.15em; font-family: monospace; text-transform: uppercase;">
        REFUND AMOUNT
      </span>
      <div style="font-size: 30px; font-weight: 900; color: #4ade80; font-family: monospace; margin: 6px 0;">
        ₹${data.refundAmount}
      </div>
      <div style="font-size: 12px; color: #a3a3a3; font-family: monospace;">
        Refund Reference ID: <strong style="color: #fff;">${escapeHtml(data.refundReference)}</strong>
      </div>
    </div>

    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      The amount should credit back to your original source account or UPI ID within 2 to 4 business days depending on your bank.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Refund Processed for Order #${orderId} (₹${data.refundAmount})`,
    badge: 'REFUND PROCESSED',
    badgeColor: 'cyan',
    title: 'REFUND INITIATED',
    subtitle: `ORDER #${orderId}`,
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'VISIT STORE',
    buttonUrl: env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com',
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Refund Processed for Order #${data.orderId} [₹${data.refundAmount}] - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. NEWSLETTER & WELCOME DISCOUNT EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendNewsletterWelcomeEmail(
  env: AppwriteEnv | undefined,
  data: NewsletterWelcomeData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const code = data.discountCode || 'REBEL10';
  const codeHtml = escapeHtml(code);
  const discount = data.discountPercentage || 10;

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px;">
      Welcome to the inner circle of <strong style="color: #ffffff;">CLAPCULTURE</strong>. You now have frontline access to limited drop notifications, star edition releases, and exclusive member discounts.
    </p>

    <!-- COUPON CODE BOX -->
    <div style="background-color: #0a0a0a; border: 2px solid #d2f000; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
      <span style="font-size: 11px; color: #a3a3a3; font-weight: 900; letter-spacing: 0.2em; font-family: monospace; text-transform: uppercase;">
        EXCLUSIVE ${discount}% WELCOME VOUCHER
      </span>
      <div style="font-size: 32px; font-weight: 900; color: #d2f000; font-family: monospace; letter-spacing: 0.15em; margin: 10px 0;">
        ${codeHtml}
      </div>
      <p style="font-size: 12px; color: #737373; margin: 0;">
        Apply this code during checkout on your first order for instant savings.
      </p>
    </div>

    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      Crafted with custom heavyweight blanks, tailored drop shoulders, and high-density street typography. Built for those who defy the ordinary.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Welcome to CLAPCULTURE! Claim your ${discount}% discount code inside.`,
    badge: 'WELCOME TO THE REBEL NATION',
    badgeColor: 'lime',
    title: 'WELCOME TO CLAPCULTURE',
    subtitle: `HERE IS YOUR ${discount}% OFF DISCOUNT`,
    bodyHtml,
    buttonText: 'SHOP THE NEW DROPS',
    buttonUrl: `${baseUrl}/shop`,
    secondaryButtonText: 'EXPLORE COLLECTIONS',
    secondaryButtonUrl: `${baseUrl}/collections`,
    footerNotice: 'You subscribed to the CLAPCULTURE newsletter. You can unsubscribe at any time.',
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Welcome to CLAPCULTURE — Claim Your ${discount}% Off Code [${code}]`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. ABANDONED CART REMINDER EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendAbandonedCartEmail(
  env: AppwriteEnv | undefined,
  data: AbandonedCartData
): Promise<MailResult> {
  const code = escapeHtml(data.discountCode || 'REBEL5');

  const itemsHtml = data.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #222;">
      <td style="padding: 10px 0; color: #fff; font-weight: 700;">${escapeHtml(item.name)} (${escapeHtml(item.size)})</td>
      <td style="padding: 10px 0; color: #a3a3a3; text-align: center;">x${escapeHtml(item.quantity)}</td>
      <td style="padding: 10px 0; color: #d2f000; text-align: right; font-weight: bold; font-family: monospace;">₹${item.price * item.quantity}</td>
    </tr>`
    )
    .join('');

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px;">
      You left some fire street gear in your cart. Stocks for limited star drops are strictly capped.
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        ${itemsHtml}
      </table>
    </div>

    <!-- 5% INCENTIVE DISCOUNT -->
    <div style="background-color: #1a1a1a; border: 1px dashed #d2f000; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
      <span style="font-size: 10px; color: #a3a3a3; font-weight: 800; letter-spacing: 0.15em; font-family: monospace; text-transform: uppercase;">
        EXTRA 5% CHECKOUT CODE
      </span>
      <div style="font-size: 24px; font-weight: 900; color: #d2f000; font-family: monospace; margin: 4px 0;">
        ${code}
      </div>
    </div>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: 'Your cart is waiting at CLAPCULTURE — Complete your order',
    badge: 'CART RESERVED',
    badgeColor: 'amber',
    title: 'COMPLETE YOUR GEAR',
    subtitle: 'LIMITED INVENTORY RESERVED',
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'COMPLETE CHECKOUT NOW',
    buttonUrl: data.checkoutUrl,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `Did you leave something behind? Complete your CLAPCULTURE haul`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. CONTACT FORM INQUIRY SERVICE (Auto-Reply + Admin Alert)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendContactInquiryEmail(
  env: AppwriteEnv | undefined,
  data: ContactInquiryData
): Promise<{ customerResult: MailResult; adminResult: MailResult }> {
  const adminEmail = env?.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || 'clapcultureofficial@gmail.com';
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';

  const name = escapeHtml(data.name);
  const email = escapeHtml(data.email);
  const subject = escapeHtml(data.subject);

  // 1. Customer Auto-Reply Email
  // This goes to whatever address the visitor typed, so it must not echo their
  // subject or message back (that would let anyone send arbitrary text from our domain).
  const customerBodyHtml = `
    <p style="margin: 0 0 16px 0;">
      We have received your message and a member of our support crew will review it shortly.
    </p>
    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      Our support team operates 7 days a week and will respond to your inquiry within 24 hours.
    </p>
  `;

  const customerHtml = buildClapCultureEmailTemplate({
    preheader: 'We received your message — CLAPCULTURE Support',
    badge: 'MESSAGE RECEIVED',
    badgeColor: 'lime',
    title: 'TRANSMISSION RECEIVED',
    subtitle: "WE'RE ON IT",
    customerName: data.name,
    bodyHtml: customerBodyHtml,
    buttonText: 'VISIT STORE',
    buttonUrl: `${baseUrl}/shop`,
  });

  const customerResult = await dispatchPlatformEmail(
    {
      to: data.email,
      subject: 'We received your message - CLAPCULTURE',
      html: customerHtml,
      replyTo: adminEmail,
    },
    env
  );

  // 2. Admin Alert Notification Email
  const adminBodyHtml = `
    <p style="margin: 0 0 16px 0;">
      A new customer contact inquiry was submitted via the website contact form.
    </p>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0; background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px;">
      <tr style="border-bottom: 1px solid #262626;">
        <td style="padding: 10px 14px; color: #737373; font-weight: 700; width: 100px;">SENDER</td>
        <td style="padding: 10px 14px; color: #ffffff; font-weight: 700;">${name} &lt;${email}&gt;</td>
      </tr>
      ${data.phone ? `
      <tr style="border-bottom: 1px solid #262626;">
        <td style="padding: 10px 14px; color: #737373; font-weight: 700;">PHONE</td>
        <td style="padding: 10px 14px; color: #d2f000; font-family: monospace;">${escapeHtml(data.phone)}</td>
      </tr>` : ''}
      <tr style="border-bottom: 1px solid #262626;">
        <td style="padding: 10px 14px; color: #737373; font-weight: 700;">SUBJECT</td>
        <td style="padding: 10px 14px; color: #ffffff;">${subject}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; color: #737373; font-weight: 700; vertical-align: top;">MESSAGE</td>
        <td style="padding: 10px 14px; color: #d4d4d4; white-space: pre-wrap;">${escapeHtml(data.message)}</td>
      </tr>
    </table>
  `;

  const adminHtml = buildClapCultureEmailTemplate({
    preheader: `[New Inquiry] ${name}: ${subject}`,
    badge: 'ADMIN INBOX ALERT',
    badgeColor: 'amber',
    title: 'NEW CONTACT INQUIRY',
    subtitle: `${name} &bull; ${email}`,
    bodyHtml: adminBodyHtml,
    buttonText: `REPLY TO ${escapeHtml(data.name.toUpperCase())}`,
    buttonUrl: `mailto:${data.email}?subject=Re: ${encodeURIComponent(data.subject)}`,
    showSocials: false,
    footerNotice: 'Internal admin notification dispatched from CLAPCULTURE Web Portal.',
  });

  const adminResult = await dispatchPlatformEmail(
    {
      to: adminEmail,
      subject: `[Support Inquiry] ${data.name}: "${data.subject}"`,
      html: adminHtml,
      replyTo: data.email,
    },
    env
  );

  return { customerResult, adminResult };
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. ADMIN GENERAL ALERT SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendAdminAlertEmail(
  env: AppwriteEnv | undefined,
  data: AdminAlertData
): Promise<MailResult> {
  const adminEmail = env?.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL || 'clapcultureofficial@gmail.com';
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; font-size: 15px;">
      ${escapeHtml(data.message)}
    </p>
    ${data.metadata ? `
    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 12px; color: #a3a3a3; white-space: pre-wrap;">
${escapeHtml(JSON.stringify(data.metadata, null, 2))}
    </div>` : ''}
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: escapeHtml(data.subject),
    badge: 'SYSTEM ALERT',
    badgeColor: 'red',
    title: escapeHtml(data.title),
    bodyHtml,
    buttonText: escapeHtml(data.actionText || 'VIEW ADMIN PANEL'),
    // actionUrl is usually a site path (e.g. /admin/orders/<id>); email clients need an absolute link.
    buttonUrl: data.actionUrl?.startsWith('/') ? `${baseUrl}${data.actionUrl}` : data.actionUrl || `${baseUrl}/admin`,
    showSocials: false,
    footerNotice: 'Automated administrative system alert for CLAPCULTURE.',
  });

  return dispatchPlatformEmail(
    {
      to: adminEmail,
      subject: `[CLAPCULTURE Admin] ${data.subject}`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. PASSWORD RESET EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  env: AppwriteEnv | undefined,
  data: PasswordResetData
): Promise<MailResult> {
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';
  const resetUrl = data.resetLink || `${baseUrl}/admin/login?resetCode=${encodeURIComponent(data.resetCode)}`;
  const resetCode = escapeHtml(data.resetCode);

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      A password reset request was initiated for your account. Use the following code to proceed:
    </p>

    <div style="background-color: #0a0a0a; border: 2px solid #d2f000; border-radius: 8px; padding: 24px; margin: 20px 0; text-align: center;">
      <span style="font-size: 10px; color: #a3a3a3; font-weight: 900; letter-spacing: 0.2em; font-family: monospace; text-transform: uppercase;">
        PASSWORD RESET CODE
      </span>
      <div style="font-size: 36px; font-weight: 900; color: #d2f000; font-family: monospace; letter-spacing: 0.2em; margin: 10px 0;">
        ${resetCode}
      </div>
      <div style="font-size: 11px; color: #737373; font-family: monospace;">Expires in 15 minutes</div>
    </div>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: `Password Reset Code: ${resetCode} — CLAPCULTURE`,
    badge: 'SECURITY RESET',
    badgeColor: 'amber',
    title: 'RESET YOUR PASSWORD',
    subtitle: 'SECURITY ACTION REQUIRED',
    customerName: data.customerName,
    bodyHtml,
    buttonText: 'RESET PASSWORD NOW',
    buttonUrl: resetUrl,
  });

  return dispatchPlatformEmail(
    {
      to: data.toEmail,
      subject: `[${data.resetCode}] Password Reset Code - CLAPCULTURE`,
      html,
    },
    env
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. SMTP DIAGNOSTIC / TEST EMAIL SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export async function sendTestEmail(
  env: AppwriteEnv | undefined,
  targetEmail?: string
): Promise<MailResult> {
  const recipient = targetEmail || env?.SMTP_USER || process.env.SMTP_USER || 'clapcultureofficial@gmail.com';
  const baseUrl = env?.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://clapculture.com';

  const bodyHtml = `
    <p style="margin: 0 0 16px 0;">
      This is a verified live test transmission confirming that your <strong style="color: #d2f000;">Gmail SMTP integration & Appwrite Messaging</strong> is operational!
    </p>

    <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 800; color: #737373; letter-spacing: 0.15em; font-family: monospace; margin-bottom: 12px;">
        SMTP CONFIGURATION DIAGNOSTICS
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: monospace;">
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px 0; color: #737373;">SMTP HOST:</td>
          <td style="padding: 8px 0; color: #ffffff; text-align: right;">${env?.SMTP_HOST || process.env.SMTP_HOST || 'smtp.gmail.com'}</td>
        </tr>
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px 0; color: #737373;">SMTP PORT:</td>
          <td style="padding: 8px 0; color: #ffffff; text-align: right;">${env?.SMTP_PORT || process.env.SMTP_PORT || '465'} (SSL)</td>
        </tr>
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px 0; color: #737373;">AUTHENTICATED USER:</td>
          <td style="padding: 8px 0; color: #d2f000; text-align: right;">${env?.SMTP_USER || process.env.SMTP_USER || 'clapcultureofficial@gmail.com'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #737373;">DISPATCH TIMESTAMP:</td>
          <td style="padding: 8px 0; color: #ffffff; text-align: right;">${new Date().toISOString()}</td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #a3a3a3; margin: 0;">
      All transactional email templates (OTP, Order Confirmation, Payment Verified, Dispatch, Delivered, Newsletter Welcome, Contact Inquiries) use this unified theme and SMTP engine.
    </p>
  `;

  const html = buildClapCultureEmailTemplate({
    preheader: 'Gmail SMTP Connection & Diagnostics Test — CLAPCULTURE',
    badge: 'SMTP DIAGNOSTIC TEST',
    badgeColor: 'lime',
    title: 'GMAIL SMTP IS LIVE',
    subtitle: 'END-TO-END TEST PASSED',
    bodyHtml,
    buttonText: 'VISIT STOREFRONT',
    buttonUrl: baseUrl,
  });

  return dispatchPlatformEmail(
    {
      to: recipient,
      subject: `[SMTP Test] Gmail Integration Verified - CLAPCULTURE (${new Date().toLocaleTimeString()})`,
      html,
    },
    env
  );
}
