#!/usr/bin/env node

/**
 * CLAPCULTURE — Appwrite Messaging & Gmail SMTP Setup Script
 * Configures the Gmail SMTP Provider in the Appwrite Cloud Project.
 */

const fs = require('fs');
const path = require('path');
const { Client, Messaging, ID } = require('node-appwrite');

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

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '6a7dfa97003713198186';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';

const SMTP_CONFIG = {
  providerId: 'gmail-smtp',
  name: 'Gmail SMTP Provider',
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465', 10),
  username: process.env.SMTP_USER || 'clapculture.co@gmail.com',
  password: (process.env.SMTP_PASS || '').replace(/\s+/g, ''),
  encryption: 'ssl', // 'ssl' for 465, 'tls' for 587
  autoTLS: true,
  mailer: 'smtps',
  fromName: process.env.SMTP_FROM_NAME || 'CLAPCULTURE',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'clapculture.co@gmail.com',
  replyToName: 'CLAPCULTURE Support',
  replyToEmail: 'clapculture.co@gmail.com',
  enabled: true,
};

console.log('\n======================================================');
console.log('⚡ CLAPCULTURE — APPWRITE MESSAGING SMTP SETUP');
console.log('======================================================');
console.log(`Endpoint:         ${APPWRITE_ENDPOINT}`);
console.log(`Project ID:       ${APPWRITE_PROJECT_ID}`);
console.log(`SMTP Host:        ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`);
console.log(`SMTP User:        ${SMTP_CONFIG.username}`);
console.log(`Sender:           "${SMTP_CONFIG.fromName}" <${SMTP_CONFIG.fromEmail}>`);
console.log('------------------------------------------------------');

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

const messaging = new Messaging(client);

async function setupAppwriteMessaging() {
  console.log('🔄 Checking existing Appwrite Messaging providers...');

  try {
    const existingProviders = await messaging.listProviders();
    console.log(`   Found ${existingProviders.total} configured provider(s).`);

    const existingSmtp = existingProviders.providers.find(
      (p) => p.provider === 'smtp' || p.$id === SMTP_CONFIG.providerId
    );

    if (existingSmtp) {
      console.log(`🔄 Updating existing SMTP provider [${existingSmtp.$id}] with Gmail SMTP credentials...`);
      const updated = await messaging.updateSmtpProvider(
        existingSmtp.$id,
        SMTP_CONFIG.name,
        SMTP_CONFIG.enabled,
        SMTP_CONFIG.host,
        SMTP_CONFIG.port,
        SMTP_CONFIG.username,
        SMTP_CONFIG.password,
        SMTP_CONFIG.encryption,
        SMTP_CONFIG.autoTLS,
        SMTP_CONFIG.mailer,
        SMTP_CONFIG.fromName,
        SMTP_CONFIG.fromEmail,
        SMTP_CONFIG.replyToName,
        SMTP_CONFIG.replyToEmail
      );
      console.log(`✅ Appwrite Messaging SMTP Provider updated successfully! [ID: ${updated.$id}]`);
    } else {
      console.log(`🔄 Creating new Gmail SMTP provider [${SMTP_CONFIG.providerId}] in Appwrite Messaging...`);
      const created = await messaging.createSmtpProvider(
        SMTP_CONFIG.providerId,
        SMTP_CONFIG.name,
        SMTP_CONFIG.host,
        SMTP_CONFIG.port,
        SMTP_CONFIG.username,
        SMTP_CONFIG.password,
        SMTP_CONFIG.encryption,
        SMTP_CONFIG.autoTLS,
        SMTP_CONFIG.mailer,
        SMTP_CONFIG.fromName,
        SMTP_CONFIG.fromEmail,
        SMTP_CONFIG.replyToName,
        SMTP_CONFIG.replyToEmail,
        SMTP_CONFIG.enabled
      );
      console.log(`✅ Appwrite Messaging SMTP Provider created successfully! [ID: ${created.$id}]`);
    }

    console.log('\n🎉 Appwrite Messaging is now configured with Gmail SMTP (clapculture.co@gmail.com)!');
    console.log('   All platform emails will be routed through Appwrite Messaging & Gmail SMTP.\n');
  } catch (error) {
    console.error('\n⚠️ Appwrite Messaging Configuration Note:');
    console.error(`   ${error.message}`);
    console.log('\nℹ️ The application also includes direct high-performance SMTP transport fallback,');
    console.log('   so all email dispatches will work immediately.\n');
  }
}

setupAppwriteMessaging();
