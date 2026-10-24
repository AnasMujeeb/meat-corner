/**
 * Master Seed Script for Meat Corner
 * server/src/seed/index.js
 *
 * Seeds authentic categories, menu items, prices, descriptions, and media assets
 * based on the Meat Corner Master Menu Reference.
 *
 * Run:
 *   npm run seed
 */

import 'dotenv/config';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/database.js';

import Admin from '../models/Admin.js';
import Category from '../models/Category.js';
import MenuItem from '../models/MenuItem.js';
import Branch from '../models/Branch.js';
import Submission from '../models/Submission.js';
import SiteSettings from '../models/SiteSettings.js';
import { toSlug, uniqueSlug } from '../utils/slug.js';

// Load authentic master menu reference seed data
const masterDataPath = new URL('./master_seed_data.json', import.meta.url);
const masterData = JSON.parse(fs.readFileSync(masterDataPath, 'utf8'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) { console.log(`  ${msg}`); }
function section(title) { console.log(`\n── ${title} ──────────────────`); }

// ─── Reset / Clear Dummy Collections ──────────────────────────────────────────

async function clearCollections() {
  section('Reset & Purge Old Demo Collections');

  const [menuRes, catRes, branchRes, subRes] = await Promise.all([
    MenuItem.deleteMany({}),
    Category.deleteMany({}),
    Branch.deleteMany({}),
    Submission.deleteMany({}),
  ]);

  log(`🗑️  Cleared MenuItems:   ${menuRes.deletedCount} removed`);
  log(`🗑️  Cleared Categories:  ${catRes.deletedCount} removed`);
  log(`🗑️  Cleared Branches:    ${branchRes.deletedCount} removed`);
  log(`🗑️  Cleared Submissions: ${subRes.deletedCount} removed`);
}

// ─── Admin ────────────────────────────────────────────────────────────────────

async function seedAdmin() {
  section('Admin User');

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@meatcorner.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '10december2004';

  const existing = await Admin.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    log(`✓ Admin already exists: ${ADMIN_EMAIL}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await Admin.create({ email: ADMIN_EMAIL, passwordHash, name: 'Admin' });
  log(`✅ Created admin user: ${ADMIN_EMAIL}`);
  return admin;
}

// ─── Site Settings ────────────────────────────────────────────────────────────

async function seedSettings() {
  section('Site Settings & Hero Configuration');

  const existing = await SiteSettings.findOne();
  const heroPoster = '/uploads/processed/wagyu-ribeye-entrecote-steak.webp';

  if (existing) {
    existing.brandName = 'Meat Corner';
    existing.heroPoster = heroPoster;
    await existing.save();
    log(`✓ Updated SiteSettings with authentic heroPoster: ${heroPoster}`);
    return existing;
  }

  const settings = await SiteSettings.create({
    brandName: 'Meat Corner',
    heroPoster: heroPoster,
    heroVideoUrl: 'https://www.pexels.com/video/authentic-khmer-restaurant-interior-in-siem-reap-29229038/',
    contactPhone: '+974 7777 8888',
    contactEmail: 'contact@meatcorner.qa',
    aboutText: 'Meat Corner – Premium cuts, authentic Wagyu steaks, artisan burgers, and gourmet smokehouse favorites in Doha, Qatar.',
    socials: {
      instagram: 'https://www.instagram.com/meatcorner.qa?cplk=ZjQ4N2VqNTg0ZTY5&utm_source=qr',
      facebook: 'https://www.linkedin.com/in/anasmujeeb',
      whatsapp: '+97455556666',
      tiktok: '',
      talabat: '',
      snoonu: '',
    },
  });

  log(`✅ Created SiteSettings with authentic brand info and hero poster: ${heroPoster}`);
  return settings;
}

// ─── Branches ─────────────────────────────────────────────────────────────────

async function seedBranches() {
  section('Authentic Branches');

  const branches = [
    {
      name: 'Madinat Khalifa',
      slug: 'madinat-khalifa',
      address: 'Madinat Khalifa South, Street 340, Doha, Qatar',
      phone: '+974 7777 8888',
      mapUrl: 'https://maps.google.com/?q=Meat+Corner+Madinat+Khalifa',
      openingHours: 'Sat–Wed: 12:00 PM – 1:00 AM | Thu–Fri: 12:00 PM – 2:00 AM',
      order: 0,
      isActive: true,
    },
    {
      name: 'Centro',
      slug: 'centro',
      address: 'Centro Mall, Al Muntazah, Doha, Qatar',
      phone: '+974 5555 6666',
      mapUrl: 'https://maps.google.com/?q=Meat+Corner+Centro',
      openingHours: 'Sat–Wed: 12:00 PM – 1:00 AM | Thu–Fri: 12:00 PM – 2:00 AM',
      order: 1,
      isActive: true,
    },
  ];

  for (const b of branches) {
    await Branch.create(b);
    log(`✅ Seeded branch: ${b.name}`);
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

async function seedCategories() {
  section('Authentic Categories');

  const categoryMap = {};

  for (const catDef of masterData.categories) {
    const slug = toSlug(catDef.name);
    const cat = await Category.create({
      name: catDef.name,
      slug: slug,
      description: catDef.description,
      image: catDef.image,
      order: catDef.order,
      isActive: true,
    });

    categoryMap[catDef.name] = cat;
    log(`✅ Seeded category: ${cat.name} (${cat.slug})`);
  }

  return categoryMap;
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

async function seedMenuItems(categoryMap) {
  section('Authentic Menu Items');

  let count = 0;
  for (const itemDef of masterData.menuItems) {
    const categoryDoc = categoryMap[itemDef.category];
    if (!categoryDoc) {
      console.warn(`  ⚠️ Category not found for item: ${itemDef.name} (${itemDef.category})`);
      continue;
    }

    await MenuItem.create({
      name: itemDef.name,
      slug: itemDef.slug,
      description: itemDef.description,
      category: categoryDoc._id,
      price: itemDef.price,
      images: itemDef.images,
      nutrition: itemDef.nutrition,
      allergens: [],
      tags: itemDef.tags,
      options: itemDef.options,
      isAvailable: true,
      order: itemDef.order,
    });
    count++;
  }

  log(`✅ Seeded ${count} authentic menu items with media assets & options!`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🥩  Meat Corner – Master Database Seeder');
  console.log('═'.repeat(50));

  await connectDB();

  // 1. Clear old collections
  await clearCollections();

  // 2. Ensure Admin user
  await seedAdmin();

  // 3. Ensure SiteSettings
  await seedSettings();

  // 4. Seed authentic branches
  await seedBranches();

  // 5. Seed authentic categories
  const categoryMap = await seedCategories();

  // 6. Seed authentic menu items
  await seedMenuItems(categoryMap);

  // 7. Verify collection totals
  section('Database Audit & Final Verification');
  const counts = {
    menuItems: await MenuItem.countDocuments(),
    categories: await Category.countDocuments(),
    branches: await Branch.countDocuments(),
    submissions: await Submission.countDocuments(),
    admins: await Admin.countDocuments(),
    siteSettings: await SiteSettings.countDocuments(),
  };

  log(`• MenuItems:    ${counts.menuItems} (target: 98)`);
  log(`• Categories:   ${counts.categories} (target: 12)`);
  log(`• Branches:     ${counts.branches} (target: 2)`);
  log(`• Submissions:  ${counts.submissions} (clean: 0)`);
  log(`• Admins:       ${counts.admins} (ready: 1)`);
  log(`• SiteSettings: ${counts.siteSettings} (ready: 1)`);

  console.log('\n' + '═'.repeat(50));
  console.log('🎉  Meat Corner database successfully populated with authentic menu & assets!\n');

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('\n❌  Master seed failed:', err);
  try {
    await disconnectDB();
  } catch (_) {}
  process.exit(1);
});
