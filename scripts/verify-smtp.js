#!/usr/bin/env node

/**
 * CLAPCULTURE — Gmail SMTP Verification Script
 * Tests connectivity and credentials with Gmail SMTP server (smtp.gmail.com:465)
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// 1. Load environment variables from .env file
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

const config = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '465', 10) === 465,
  user: process.env.SMTP_USER || 'clapculture.co@gmail.com',
  pass: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  fromName: process.env.SMTP_FROM_NAME || 'CLAPCULTURE',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'clapculture.co@gmail.com',
};

console.log('\n======================================================');
console.log('⚡ CLAPCULTURE — GMAIL SMTP VERIFICATION');
console.log('======================================================');
console.log(`Host:             ${config.host}`);
console.log(`Port:             ${config.port} (${config.secure ? 'SSL' : 'TLS/STARTTLS'})`);
console.log(`User:             ${config.user}`);
console.log(`Sender:           "${config.fromName}" <${config.fromEmail}>`);
console.log(`Password:         ${'*'.repeat(config.pass.length)} (${config.pass.length} chars)`);
console.log('------------------------------------------------------');
console.log('🔄 Connecting to smtp.gmail.com...');

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

transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ SMTP Verification FAILED:');
    console.error(`   Error Code:    ${error.code || 'UNKNOWN'}`);
    console.error(`   Error Message: ${error.message}`);
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Ensure 2-Step Verification is ON in your Google Account.');
    console.log('   2. Generate an "App Password" under Google Account > Security > 2-Step Verification > App Passwords.');
    console.log('   3. Set SMTP_PASS in .env to the 16-character App Password without spaces.\n');
    process.exit(1);
  } else {
    console.log('\n✅ GMAIL SMTP CONNECTION VERIFIED SUCCESSFULLY!');
    console.log('   The Gmail SMTP server is ready to deliver all transactional emails.\n');
    process.exit(0);
  }
});
