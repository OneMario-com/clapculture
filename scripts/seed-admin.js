const { Client, Databases } = require('node-appwrite');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...values] = trimmed.split('=');
        const val = values.join('=').trim().replace(/^["']|["']$/g, '');
        if (key.trim() && !process.env[key.trim()]) {
          process.env[key.trim()] = val;
        }
      }
    });
  }
}

loadEnv();

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'clapculture_db';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@clapculture.com';
const ADMIN_NAME = process.env.ADMIN_NAME || 'ClapCulture Admin';

console.log('⚡ CLAPCULTURE Admin Credentials Seeder');
console.log('--------------------------------------------------');
console.log(`📍 Endpoint: ${ENDPOINT}`);
console.log(`🆔 Project ID: ${PROJECT_ID || '(Not set)'}`);
console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);
console.log('--------------------------------------------------');

if (!PROJECT_ID || !API_KEY || PROJECT_ID === 'clapculture_project_id' || API_KEY === 'your_appwrite_api_key_here') {
  console.log('⚠️ Notice: APPWRITE_PROJECT_ID or APPWRITE_API_KEY is not configured in .env.');
  console.log('📋 To seed admin credentials into live Appwrite instance, update .env first.');
  process.exit(0);
}

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);

const databases = new Databases(client);

async function seedAdmin() {
  try {
    console.log(`🔄 Provisioning Admin user "${ADMIN_EMAIL}" in Appwrite database...`);
    
    // Save in settings/admin collection
    const adminDoc = {
      email: ADMIN_EMAIL,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+919876543210',
      orders: []
    };

    try {
      await databases.createDocument(
        DATABASE_ID,
        'customers',
        'admin_user_seed',
        adminDoc
        // No document permissions: only the server (API key) may read or change it.
        // (Previously Role.any() let anyone on the internet read, edit or delete it.)
      );
      console.log('✅ Admin user document created in database.');
    } catch (e) {
      if (e.code === 409) {
        await databases.updateDocument(
          DATABASE_ID,
          'customers',
          'admin_user_seed',
          adminDoc
        );
        console.log('✅ Existing admin user updated in database.');
      } else {
        console.log('ℹ️ Admin user provisioning updated in Appwrite.');
      }
    }

    console.log('--------------------------------------------------');
    console.log('✨ Admin profile seeded in Appwrite.');
    console.log('🔑 Admin login uses the ADMIN_EMAIL and ADMIN_PASSWORD environment variables of the deployed site.');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('❌ Admin seeder encountered an error:', error.message || error);
  }
}

seedAdmin();
