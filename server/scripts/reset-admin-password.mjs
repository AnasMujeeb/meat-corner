#!/usr/bin/env node
/**
 * Meat Corner – Reset Admin Password Script
 * server/scripts/reset-admin-password.mjs
 *
 * Usage:
 *   NEW_ADMIN_PASSWORD="your-strong-password" node scripts/reset-admin-password.mjs <admin-email>
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/database.js';
import Admin from '../src/models/Admin.js';

async function main() {
  const emailArg = process.argv[2]?.trim();
  if (!emailArg) {
    console.error('Error: Admin email argument is required. Usage: node scripts/reset-admin-password.mjs <admin-email>');
    process.exit(1);
  }

  const newPassword = process.env.NEW_ADMIN_PASSWORD;
  if (!newPassword) {
    console.error('Error: Environment variable NEW_ADMIN_PASSWORD is required.');
    process.exit(1);
  }

  if (newPassword.length < 10) {
    console.error('Error: NEW_ADMIN_PASSWORD must be at least 10 characters long.');
    process.exit(1);
  }

  const normalizedEmail = emailArg.toLowerCase();

  try {
    await connectDB();

    const admin = await Admin.findOne({ email: normalizedEmail });
    if (!admin) {
      console.error(`Error: Admin with email "${normalizedEmail}" not found.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    admin.passwordHash = passwordHash;
    await admin.save();

    console.log(`Password updated for ${admin.email}`);
  } finally {
    await disconnectDB().catch(() => {});
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
