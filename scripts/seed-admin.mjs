/**
 * Automated Admin Seeder for LendLoop
 * 
 * Provisions the initial Administrator account in both:
 * 1. Clerk Identity Directory (via Clerk Backend API)
 * 2. Convex Database (with role: 'admin' and mustChangePassword: true)
 * 
 * Usage:
 *   node scripts/seed-admin.mjs
 *   npm run seed:admin
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cryptographically secure temporary password generator (zero hardcoded strings)
function generateSecureTemporaryPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*';
  const pool = upper + lower + digits + symbols;

  const buf = randomBytes(16);
  // Guarantee character diversity for Clerk security requirements
  const pwd = [
    upper[buf[0] % upper.length],
    lower[buf[1] % lower.length],
    digits[buf[2] % digits.length],
    symbols[buf[3] % symbols.length],
  ];

  for (let i = 4; i < 16; i++) {
    pwd.push(pool[buf[i] % pool.length]);
  }

  // Shuffle using Fisher-Yates with crypto random bytes
  const shuffleBuf = randomBytes(pwd.length);
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = shuffleBuf[i] % (i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }

  return pwd.join('');
}

// Helper to load env vars from .env.local or .env
function loadEnv() {
  const root = resolve(__dirname, '..');
  const envFiles = ['.env.local', '.env'];
  const env = { ...process.env };

  for (const file of envFiles) {
    const fullPath = resolve(root, file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (!env[key]) {
            env[key] = value;
          }
        }
      }
    }
  }
  return env;
}

const env = loadEnv();
const CLERK_SECRET_KEY = env.CLERK_SECRET_KEY;
const CONVEX_URL = env.NEXT_PUBLIC_CONVEX_URL;
const ADMIN_EMAIL = (env.ADMIN_EMAIL || 'edenasamere96@gmail.com').trim().toLowerCase();
const ADMIN_INITIAL_PASSWORD = env.ADMIN_INITIAL_PASSWORD || generateSecureTemporaryPassword();
const ADMIN_NAME = 'Eden Asamere';

if (!CLERK_SECRET_KEY) {
  console.error('[Error]: Missing CLERK_SECRET_KEY in environment.');
  process.exit(1);
}
if (!CONVEX_URL) {
  console.error('[Error]: Missing NEXT_PUBLIC_CONVEX_URL in environment.');
  process.exit(1);
}

async function seedAdmin() {
  console.log('\n=============================================================');
  console.log('🌱  LendLoop Initial Admin Account Provisioning');
  console.log('=============================================================');
  console.log(`Target Email:   ${ADMIN_EMAIL}`);
  console.log(`Convex URL:     ${CONVEX_URL}`);

  let clerkUserId = null;

  // 1. Check if user already exists in Clerk
  console.log('\n[1/3] Checking Clerk Identity Directory...');
  const searchRes = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(ADMIN_EMAIL)}`,
    {
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    console.error('[Clerk Error]: Failed to query users:', errText);
    process.exit(1);
  }

  const existingUsers = await searchRes.json();

  if (Array.isArray(existingUsers) && existingUsers.length > 0) {
    clerkUserId = existingUsers[0].id;
    console.log(`✓ Admin user already exists in Clerk (ID: ${clerkUserId}).`);
    
    // Reset/ensure temporary password is set
    console.log('  Updating initial credentials in Clerk...');
    const updateRes = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: ADMIN_INITIAL_PASSWORD,
        skip_password_checks: true,
      }),
    });
    if (!updateRes.ok) {
      console.warn('  Notice: Could not reset password via PATCH (account might already have custom creds). Continuing...');
    } else {
      console.log('  ✓ Temporary initial password refreshed in Clerk.');
    }
  } else {
    // Create new Clerk user
    console.log('Creating new admin user in Clerk...');
    const createRes = await fetch('https://api.clerk.com/v1/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: [ADMIN_EMAIL],
        password: ADMIN_INITIAL_PASSWORD,
        first_name: 'System',
        last_name: 'Administrator',
        skip_password_checks: true,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json();
      console.error('[Clerk Error]: Failed to create user:', err);
      process.exit(1);
    }

    const created = await createRes.json();
    clerkUserId = created.id;
    console.log(`✓ Admin account created in Clerk (ID: ${clerkUserId}).`);
  }

  // 2. Provision / Upsert Admin in Convex Database
  console.log('\n[2/3] Provisioning Admin Record in Convex Database...');
  const { ConvexHttpClient } = await import('convex/browser');
  const convexClient = new ConvexHttpClient(CONVEX_URL);

  const convexResult = await convexClient.mutation('users:seedAdminUser', {
    clerkId: clerkUserId,
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
  });

  console.log(`✓ Convex seed complete! (Status: ${convexResult.status}, Record ID: ${convexResult.userId})`);

  // 3. Output Credentials and Security Policy
  console.log('\n=============================================================');
  console.log('🎉  INITIAL ADMIN ACCOUNT READY TO USE');
  console.log('=============================================================');
  console.log(`  Email:            ${ADMIN_EMAIL}`);
  console.log(`  Initial Password: ${ADMIN_INITIAL_PASSWORD}`);
  console.log(`  Role:             Administrator (Full RBAC + Compliance Oversight)`);
  console.log(`  Force Reset:      ACTIVE (mustChangePassword: true)`);
  console.log('-------------------------------------------------------------');
  console.log('  🔒 Security Workflow:');
  console.log('  1. Navigate to http://localhost:3000/sign-in or click "Sign In"');
  console.log(`  2. Log in using "${ADMIN_EMAIL}" and "${ADMIN_INITIAL_PASSWORD}"`);
  console.log('  3. The system will IMMEDIATELY present the mandatory password reset modal');
  console.log('  4. Enter a permanent secure password to complete activation');
  console.log('=============================================================\n');
}

seedAdmin().catch((err) => {
  console.error('\n[Seed Fatal Error]:', err);
  process.exit(1);
});
