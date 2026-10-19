#!/usr/bin/env node

/**
 * CLAPCULTURE — Send OTP Verification Email via Appwrite Messaging & Gmail SMTP
 * Usage:
 *   node scripts/send-otp.js
 *   node scripts/send-otp.js --to=user@example.com --purpose=LOGIN
 *   node scripts/send-otp.js --to=user@example.com --purpose=CHECKOUT
 *   node scripts/send-otp.js --to=user@example.com --purpose=ORDER_TRACKING
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

// Parse CLI Arguments
const args = process.argv.slice(2);
let targetEmail = process.env.SMTP_USER || 'clapculture.co@gmail.com';
let purpose = 'LOGIN';
let customOtp = '';

args.forEach((arg) => {
  if (arg.startsWith('--to=')) {
    targetEmail = arg.split('=')[1];
  }
  if (arg.startsWith('--purpose=')) {
    purpose = arg.split('=')[1].toUpperCase();
  }
  if (arg.startsWith('--code=')) {
    customOtp = arg.split('=')[1];
  }
});

const otp = customOtp || crypto.randomInt(100000, 999999).toString();
const expiryMinutes = 10;

const config = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '465', 10) === 465,
  user: process.env.SMTP_USER || 'clapculture.co@gmail.com',
  pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  fromName: process.env.SMTP_FROM_NAME || 'CLAPCULTURE',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'clapculture.co@gmail.com',
};

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a7dfa97003713198186';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

const purposeLabel =
  purpose === 'LOGIN' ? 'ACCOUNT LOGIN' :
  purpose === 'CHECKOUT' ? 'CHECKOUT VERIFICATION' :
  purpose === 'ORDER_TRACKING' ? 'ORDER TRACKING ACCESS' :
  purpose === 'ADMIN_2FA' ? 'ADMIN SECURITY ACCESS' :
  purpose === 'PASSWORD_RESET' ? 'PASSWORD RESET' :
  'VERIFICATION';

const subject = `[${otp}] Your CLAPCULTURE Verification Code`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your CLAPCULTURE Verification Code</title>
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
  <div style="display:none; max-height:0; overflow:hidden;">Your CLAPCULTURE OTP is ${otp} — Valid for ${expiryMinutes} minutes</div>
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
              <div style="display:inline-block; margin-top:10px; background-color:#d2f000; color:#090909; font-size:10px; font-weight:900; letter-spacing:0.2em; padding:4px 12px; text-transform:uppercase; border-radius:3px; font-family:monospace;">
                SECURITY VERIFICATION
              </div>
            </td>
          </tr>

          <!-- CONTENT BODY -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 36px 20px 36px;">
              <h1 style="font-size:24px; font-weight:900; color:#ffffff; text-transform:uppercase; margin:0 0 6px 0; line-height:1.2; font-family:'Arial Black', sans-serif;">
                YOUR VERIFICATION CODE
              </h1>
              <div style="font-size:13px; font-weight:700; color:#d2f000; letter-spacing:0.05em; text-transform:uppercase; margin-bottom:20px;">
                ${purposeLabel}
              </div>
              
              <p style="color:#d4d4d4; font-size:14px; line-height:1.7; margin:0 0 16px 0;">
                Use the following One-Time Password (OTP) to complete your <strong style="color:#ffffff;">${purposeLabel}</strong> on CLAPCULTURE.
              </p>

              <!-- OTP GLOW BOX -->
              <div style="background-color:#0a0a0a; border:2px solid #d2f000; border-radius:10px; padding:28px 20px; margin:24px 0; text-align:center; box-shadow:0 0 20px rgba(210, 240, 0, 0.15);">
                <span style="font-size:10px; color:#a3a3a3; font-weight:900; letter-spacing:0.25em; font-family:monospace; text-transform:uppercase;">
                  ONE-TIME PASSWORD
                </span>
                <div style="font-size:42px; font-weight:900; color:#d2f000; font-family:monospace; letter-spacing:0.35em; margin:12px 0 6px 0; padding-left:0.35em;">
                  ${otp}
                </div>
                <div style="font-size:11px; color:#737373; font-family:monospace; margin-top:8px;">
                  &bull; VALID FOR <span style="color:#ffffff; font-weight:bold;">${expiryMinutes} MINUTES</span> ONLY &bull;
                </div>
              </div>

              <!-- SECURITY NOTICE -->
              <div style="background-color:#171717; border-left:3px solid #d2f000; padding:14px 18px; margin-bottom:20px; font-size:12px; color:#a3a3a3; line-height:1.6;">
                <strong style="color:#ffffff;">Security Alert:</strong> Never share this OTP with anyone. CLAPCULTURE staff will never request your verification code.
              </div>

              <p style="font-size:12px; color:#737373; margin:0;">
                If you did not request this OTP, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color:#0a0a0a; padding:28px 24px; border-top:1px solid #222; font-size:11px; color:#525252;">
              <p style="margin:0 0 8px 0; color:#737373;">
                Have questions? Contact us at <a href="mailto:clapculture.co@gmail.com" style="color:#d2f000; text-decoration:none;">clapculture.co@gmail.com</a>
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

console.log('\n======================================================');
console.log('⚡ CLAPCULTURE — SEND OTP VERIFICATION');
console.log('======================================================');
console.log(`To:               ${targetEmail}`);
console.log(`Purpose:          ${purposeLabel}`);
console.log(`Generated OTP:    ${otp}`);
console.log(`Expires In:       ${expiryMinutes} minutes`);
console.log(`Sender:           "${config.fromName}" <${config.fromEmail}>`);
console.log('------------------------------------------------------');
console.log('🔄 Dispatching OTP via Appwrite Messaging & Gmail SMTP...');

async function dispatchOtp() {
  // 1. Try Appwrite Messaging Service (logs in Appwrite Messages Console)
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
      subject,
      html,
      [], // topics
      [targetUserId], // users
      [], // targets
      [], // cc
      [], // bcc
      [], // attachments
      false, // draft = false
      true // html = true
    );

    console.log('\n✅ OTP DISPATCHED & LOGGED IN APPWRITE MESSAGING!');
    console.log(`   Appwrite Message ID: ${message.$id}`);
    console.log(`   Recipient:           ${targetEmail}`);
    console.log(`   Code:                ${otp}`);
    console.log('\n🎉 This message is now visible under the "Messages" tab in your Appwrite Console!\n');
    process.exit(0);
  } catch (appwriteErr) {
    console.log(`ℹ️ Appwrite Messaging note: ${appwriteErr.message}`);
    console.log('🔄 Delivering directly via Gmail SMTP transport...');

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
        subject,
        html,
      },
      (error, info) => {
        if (error) {
          console.error('\n❌ Failed to send OTP email:');
          console.error(`   Error: ${error.message}`);
          process.exit(1);
        } else {
          console.log('\n✅ OTP EMAIL SENT SUCCESSFULLY!');
          console.log(`   Message ID:    ${info.messageId}`);
          console.log(`   Recipient:     ${targetEmail}`);
          console.log(`   Code:          ${otp}\n`);
          process.exit(0);
        }
      }
    );
  }
}

dispatchOtp();
