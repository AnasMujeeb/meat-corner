#!/usr/bin/env node
/**
 * Meat Corner — Export Arabic TODO
 * server/scripts/export-arabic-todo.mjs
 *
 * READ-ONLY script.
 * Scans Categories, MenuItems (with options/choices), OptionLibraryItems, Branches,
 * and SiteSettings.aboutText from MongoDB.
 * Writes server/scripts/out/arabic-todo.json with English and current Arabic fields.
 * Also extracts distinct allergens and tags across all menu items.
 *
 * Usage:
 *   node server/scripts/export-arabic-todo.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

import Category from '../src/models/Category.js';
import MenuItem from '../src/models/MenuItem.js';
import OptionLibraryItem from '../src/models/OptionLibraryItem.js';
import Branch from '../src/models/Branch.js';
import SiteSettings from '../src/models/SiteSettings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const outDir = path.resolve(__dirname, 'out');
const outFile = path.join(outDir, 'arabic-todo.json');

// 1. Load MONGODB_URI strictly from server/.env
let mongoUri = '';
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key === 'MONGODB_URI') {
      mongoUri = val;
    }
  }
}
if (!mongoUri) {
  mongoUri = process.env.MONGODB_URI;
}

if (!mongoUri) {
  console.error('❌ MONGODB_URI not found in server/.env or environment.');
  process.exit(1);
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  try {
    const [categories, menuItems, optionLibraryItems, branches, settings] = await Promise.all([
      Category.find().sort({ order: 1, createdAt: 1 }).lean(),
      MenuItem.find().sort({ order: 1, createdAt: 1 }).lean(),
      OptionLibraryItem.find().sort({ category: 1, order: 1, name: 1 }).lean(),
      Branch.find().sort({ order: 1 }).lean(),
      SiteSettings.findOne().lean(),
    ]);

    const items = [];
    const allergensSet = new Set();
    const tagsSet = new Set();

    // 1. Categories
    for (const cat of categories) {
      items.push({
        type: 'category',
        key: cat.slug || String(cat._id),
        english: {
          name: cat.name || '',
          description: cat.description || '',
        },
        arabic: {
          nameAr: cat.nameAr || '',
          descriptionAr: cat.descriptionAr || '',
        },
      });
    }

    // 2. MenuItems
    for (const item of menuItems) {
      (item.allergens || []).forEach((a) => { if (a && a.trim()) allergensSet.add(a.trim()); });
      (item.tags || []).forEach((t) => { if (t && t.trim()) tagsSet.add(t.trim()); });

      const options = (item.options || []).map((opt) => ({
        name: opt.name || '',
        nameAr: opt.nameAr || '',
        choices: (opt.choices || []).map((ch) => ({
          label: ch.label || '',
          labelAr: ch.labelAr || '',
        })),
      }));

      items.push({
        type: 'menuItem',
        key: item.slug || String(item._id),
        english: {
          name: item.name || '',
          description: item.description || '',
        },
        arabic: {
          nameAr: item.nameAr || '',
          descriptionAr: item.descriptionAr || '',
        },
        options,
      });
    }

    // 3. OptionLibraryItems
    for (const lib of optionLibraryItems) {
      items.push({
        type: 'optionLibraryItem',
        key: lib.name || String(lib._id),
        english: {
          name: lib.name || '',
          category: lib.category || '',
        },
        arabic: {
          nameAr: lib.nameAr || '',
        },
      });
    }

    // 4. Branches
    for (const b of branches) {
      items.push({
        type: 'branch',
        key: b.slug || String(b._id),
        english: {
          name: b.name || '',
          address: b.address || '',
          openingHours: b.openingHours || '',
        },
        arabic: {
          nameAr: b.nameAr || '',
          addressAr: b.addressAr || '',
          openingHoursAr: b.openingHoursAr || '',
        },
      });
    }

    // 5. SiteSettings
    if (settings) {
      items.push({
        type: 'settings',
        key: 'singleton',
        english: {
          aboutText: settings.aboutText || '',
        },
        arabic: {
          aboutTextAr: settings.aboutTextAr || '',
        },
      });
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      counts: {
        categories: categories.length,
        menuItems: menuItems.length,
        optionLibraryItems: optionLibraryItems.length,
        branches: branches.length,
        hasSettings: Boolean(settings),
      },
      allergens: Array.from(allergensSet).sort(),
      tags: Array.from(tagsSet).sort(),
      items,
    };

    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    fs.writeFileSync(outFile, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`\nExport complete! Written to: ${outFile}`);
    console.log(`Summary:`);
    console.log(` - Categories: ${payload.counts.categories}`);
    console.log(` - Menu Items: ${payload.counts.menuItems}`);
    console.log(` - Option Library Items: ${payload.counts.optionLibraryItems}`);
    console.log(` - Branches: ${payload.counts.branches}`);
    console.log(` - Distinct Allergens: ${payload.allergens.length}`);
    console.log(` - Distinct Tags: ${payload.tags.length}`);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});

