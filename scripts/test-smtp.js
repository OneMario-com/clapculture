#!/usr/bin/env node

/**
 * CLAPCULTURE — Transactional Email Dispatcher (Appwrite Messaging + Gmail SMTP)
 * Usage:
 *   node scripts/test-smtp.js
 *   node scripts/test-smtp.js --to=your-email@example.com --type=welcome
 *   node scripts/test-smtp.js --to=your-email@example.com --type=order
 *   node scripts/test-smtp.js --to=your-email@example.com --type=shipping
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { Client, Messaging, Users, Query, ID } = require('node-appwrite');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=');
        if (key) {
          process.env[key.trim()] = values.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const args = process.argv.slice(2);
let targetEmail = process.env.SMTP_USER || 'clapculture.co@gmail.com';
let emailType = 'order';

args.forEach((arg) => {
  if (arg.startsWith('--to=')) {
    targetEmail = arg.split('=')[1];
  }
  if (arg.startsWith('--type=')) {
    emailType = arg.split('=')[1].toLowerCase();
  }
});

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a7dfa97003713198186';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

const config = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '465', 10) === 465,
  user: process.env.SMTP_USER || 'clapculture.co@gmail.com',
  pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  fromName: process.env.SMTP_FROM_NAME || 'CLAPCULTURE',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'clapculture.co@gmail.com',
};

function buildEmailTemplate({ preheader, badge, badgeColor, title, subtitle, customerName, bodyHtml, buttonText, buttonUrl }) {
  const badgeBg =
    badgeColor === 'amber' ? '#f59e0b' :
    badgeColor === 'cyan' ? '#06b6d4' :
    badgeColor === 'purple' ? '#a855f7' :
    badgeColor === 'red' ? '#ef4444' :
    '#d2f000';

  const badgeText = badgeColor === 'amber' || badgeColor === 'cyan' || badgeColor === 'lime' || !badgeColor ? '#090909' : '#ffffff';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background-color:#050505; color:#e5e5e5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    table { border-collapse:collapse; }
    @media screen and (max-width: 600px) {
      .email-container { width:100% !important; }
      .mobile-padding { padding-left:20px !important; padding-right:20px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#050505;">
  <div style="display:none; max-height:0; overflow:hidden;">${preheader || 'CLAPCULTURE'}</div>
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#050505;">
    <tr>
      <td align="center" style="padding: 30px 12px 50px 12px;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width:600px; width:100%; background-color:#121212; border:1px solid #262626; border-radius:12px; overflow:hidden; box-shadow:0 20px 40px rgba(0,0,0,0.8);">
          
          <!-- BRAND HEADER -->
          <tr>
            <td align="center" style="background-color:#0a0a0a; padding:32px 24px; border-bottom:2px solid #222;">
              <div style="font-size:32px; font-weight:900; letter-spacing:0.18em; color:#ffffff; text-transform:uppercase; font-family:'Arial Black', sans-serif;">
                CLAPCULTURE
              </div>
              <div style="display:inline-block; margin-top:10px; background-color:${badgeBg}; color:${badgeText}; font-size:10px; font-weight:900; letter-spacing:0.2em; padding:4px 12px; text-transform:uppercase; border-radius:3px; font-family:monospace;">
                ${badge || 'OFFICIAL DISPATCH'}
              </div>
            </td>
          </tr>

          <!-- CONTENT BODY -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 36px 20px 36px;">
              ${customerName ? `<div style="font-size:13px; font-weight:700; color:#a3a3a3; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:8px;">HELLO ${customerName.toUpperCase()},</div>` : ''}
              <h1 style="font-size:26px; font-weight:900; color:#ffffff; text-transform:uppercase; margin:0 0 8px 0; line-height:1.2; font-family:'Arial Black', sans-serif;">
                ${title}
              </h1>
              ${subtitle ? `<div style="font-size:13px; font-weight:700; color:#d2f000; letter-spacing:0.05em; text-transform:uppercase; margin-bottom:20px;">${subtitle}</div>` : ''}
              <div style="color:#d4d4d4; font-size:14px; line-height:1.7;">
                ${bodyHtml}
              </div>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          ${buttonText && buttonUrl ? `
          <tr>
            <td align="center" class="mobile-padding" style="padding:10px 36px 32px 36px;">
              <a href="${buttonUrl}" target="_blank" style="background-color:#d2f000; color:#090909; font-size:13px; font-weight:900; text-decoration:none; border-radius:4px; padding:14px 32px; display:inline-block; text-transform:uppercase; letter-spacing:0.12em;">
                ${buttonText} &rarr;
              </a>
            </td>
          </tr>` : ''}

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color:#0a0a0a; padding:28px 24px; border-top:1px solid #222; font-size:11px; color:#525252;">
              <p style="margin:0 0 8px 0; color:#737373;">
                Have questions? Reach us directly at <a href="mailto:clapculture.co@gmail.com" style="color:#d2f000; text-decoration:none;">clapculture.co@gmail.com</a>
              </p>
              <p style="margin:0;">
                &copy; ${new Date().getFullYear()} CLAPCULTURE. ALL RIGHTS RESERVED. | DESIGN & DEVELOPED BY <a href="https://vcard.stemlen.com/u/surendra" target="_blank" style="color:#d2f000; text-decoration:none; font-weight:700;">SURENDRA.CODES</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getEmailPayload(type) {
  if (type === 'welcome') {
    return {
      subject: `Welcome to CLAPCULTURE — Claim Your 10% Off Code [REBEL10]`,
      html: buildEmailTemplate({
        preheader: 'Welcome to CLAPCULTURE! Claim your 10% discount code inside.',
        badge: 'WELCOME TO THE REBEL NATION',
        badgeColor: 'lime',
        title: 'WELCOME TO CLAPCULTURE',
        subtitle: 'HERE IS YOUR 10% OFF DISCOUNT CODE',
        bodyHtml: `
          <p>Welcome to the inner circle of <strong style="color: #ffffff;">CLAPCULTURE</strong>. You now have frontline access to limited drop notifications, star edition releases, and exclusive member discounts.</p>
          <div style="background-color: #0a0a0a; border: 2px solid #d2f000; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <span style="font-size: 10px; color: #a3a3a3; font-weight: 900; letter-spacing: 0.2em; font-family: monospace; text-transform: uppercase;">YOUR WELCOME VOUCHER</span>
            <div style="font-size: 32px; font-weight: 900; color: #d2f000; font-family: monospace; letter-spacing: 0.15em; margin: 8px 0;">REBEL10</div>
            <p style="font-size: 12px; color: #737373; margin: 0;">Apply during checkout for 10% off your first order.</p>
          </div>
        `,
        buttonText: 'SHOP THE NEW DROPS',
        buttonUrl: 'http://localhost:3000/shop',
      }),
    };
  }

  if (type === 'shipping') {
    return {
      subject: `Your Order #CLAP-99001 Has Shipped! - CLAPCULTURE`,
      html: buildEmailTemplate({
        preheader: 'Your Order #CLAP-99001 Has Shipped! — CLAPCULTURE',
        badge: 'PACKAGE DISPATCHED',
        badgeColor: 'amber',
        title: 'YOUR GEAR IS ON THE WAY',
        subtitle: 'ORDER #CLAP-99001',
        customerName: 'Surendra',
        bodyHtml: `
          <p>Your package has officially been <strong style="color: #38bdf8;">DISPATCHED</strong> and is moving through the express delivery network.</p>
          <div style="background-color: #0a0a0a; border: 2px dashed #d2f000; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
            <span style="font-size: 10px; color: #a3a3a3; font-weight: 900; letter-spacing: 0.2em; font-family: monospace; text-transform: uppercase;">COURIER TRACKING NUMBER</span>
            <div style="font-size: 24px; font-weight: 900; color: #d2f000; font-family: monospace; margin: 8px 0;">TRK-CLAP-99887766IN</div>
            <div style="font-size: 12px; color: #737373;">Courier: BlueDart Express &bull; Est. Delivery: 2-3 Business Days</div>
          </div>
        `,
        buttonText: 'LIVE PACKAGE TRACKING',
        buttonUrl: 'http://localhost:3000/track-order?orderId=CLAP-99001',
      }),
    };
  }

  // Default: Order Confirmation
  return {
    subject: `Order Confirmed #CLAP-99001 - CLAPCULTURE`,
    html: buildEmailTemplate({
      preheader: 'Order #CLAP-99001 Confirmed — CLAPCULTURE',
      badge: 'BOOKING CONFIRMED',
      badgeColor: 'lime',
      title: 'ORDER #CLAP-99001',
      subtitle: 'THANK YOU FOR JOINING THE CULTURE',
      customerName: 'Surendra',
      bodyHtml: `
        <p>Your order <strong style="color: #d2f000; font-family: monospace;">#CLAP-99001</strong> has been placed and received by our fulfillment team.</p>
        <div style="background-color: #0a0a0a; border: 1px solid #262626; border-radius: 8px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: 800; color: #737373; text-transform: uppercase; font-family: monospace; margin-bottom: 10px;">ORDER ITEMS</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr style="border-bottom: 1px solid #222;">
              <td style="padding: 8px 0; color: #fff; font-weight: 700;">OG Senani Heavyweight Oversized Tee <span style="font-size: 11px; color: #737373;">(Size: XL)</span></td>
              <td style="padding: 8px 0; color: #d2f000; text-align: right; font-weight: 800; font-family: monospace;">₹1,499</td>
            </tr>
            <tr style="border-bottom: 1px solid #222;">
              <td style="padding: 8px 0; color: #fff; font-weight: 700;">Rebel Star Washed Drop Tee <span style="font-size: 11px; color: #737373;">(Size: L)</span></td>
              <td style="padding: 8px 0; color: #d2f000; text-align: right; font-weight: 800; font-family: monospace;">₹1,299</td>
            </tr>
          </table>
          <div style="border-top: 2px solid #262626; margin-top: 12px; padding-top: 12px; text-align: right;">
            <span style="font-size: 11px; color: #737373; margin-right: 10px; font-family: monospace;">TOTAL PAID:</span>
            <span style="font-size: 20px; font-weight: 900; color: #d2f000; font-family: monospace;">₹2,798</span>
          </div>
        </div>
      `,
      buttonText: 'TRACK YOUR ORDER',
      buttonUrl: 'http://localhost:3000/track-order?orderId=CLAP-99001',
    }),
  };
}

const payload = getEmailPayload(emailType);

console.log('\n======================================================');
console.log(`🚀 CLAPCULTURE — TRANSACTIONAL EMAIL DISPATCH [${emailType.toUpperCase()}]`);
console.log('======================================================');
console.log(`To:               ${targetEmail}`);
console.log(`From:             "${config.fromName}" <${config.fromEmail}>`);
console.log(`Subject:          ${payload.subject}`);
console.log('------------------------------------------------------');
console.log('🔄 Dispatching via Appwrite Messaging & Gmail SMTP...');

async function dispatchTransactional() {
  try {
    const client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const messaging = new Messaging(client);
    const users = new Users(client);

    let targetUserId;
    const cleanEmail = targetEmail.toLowerCase().trim();
    const existing = await users.list([Query.equal('email', cleanEmail), Query.limit(1)]);

    if (existing.users.length > 0) {
      targetUserId = existing.users[0].$id;
    } else {
      const newUser = await users.create(ID.unique(), cleanEmail, undefined, undefined, 'Valued Rebel');
      targetUserId = newUser.$id;
    }

    const message = await messaging.createEmail(
      ID.unique(),
      payload.subject,
      payload.html,
      [], // topics
      [targetUserId], // users
      [], // targets
      [], // cc
      [], // bcc
      [], // attachments
      false, // draft = false
      true // html = true
    );

    console.log('\n✅ EMAIL DISPATCHED & LOGGED IN APPWRITE MESSAGING!');
    console.log(`   Appwrite Message ID: ${message.$id}`);
    console.log(`   Status:              ${message.status || 'SENT'}`);
    console.log(`   Recipient:           ${targetEmail}`);
    console.log('\n🎉 Visible in the "Messages" tab of your Appwrite Console!\n');
    process.exit(0);
  } catch (appwriteErr) {
    console.log(`ℹ️ Appwrite Messaging fallback notice: ${appwriteErr.message}`);
    console.log('🔄 Delivering via direct Gmail SMTP transport...');

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    transporter.sendMail(
      {
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: targetEmail,
        subject: payload.subject,
        html: payload.html,
      },
      (error, info) => {
        if (error) {
          console.error('\n❌ Failed to send email:');
          console.error(`   Error: ${error.message}`);
          process.exit(1);
        } else {
          console.log('\n✅ EMAIL DISPATCHED SUCCESSFULLY VIA GMAIL SMTP!');
          console.log(`   Message ID:    ${info.messageId}`);
          console.log(`   Recipient:     ${targetEmail}\n`);
          process.exit(0);
        }
      }
    );
  }
}

dispatchTransactional();
