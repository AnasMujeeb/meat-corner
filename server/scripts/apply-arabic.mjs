#!/usr/bin/env node
/**
 * Meat Corner — Apply Arabic Translations
 * server/scripts/apply-arabic.mjs
 *
 * Reads a JSON file structured like arabic-todo.json (or an items array),
 * matches by key:
 *   - category: slug
 *   - menuItem: slug (also matches options by name and choices by label)
 *   - optionLibraryItem: name
 *   - branch: slug
 *   - settings: singleton
 *
 * Updates ONLY Arabic fields (nameAr, descriptionAr, addressAr, openingHoursAr, aboutTextAr, labelAr).
 * NEVER overwrites a non-empty existing Arabic value in the DB unless --force is specified.
 * Default is DRY-RUN. Use --apply to execute bulkWrite operations.
 *
 * Usage:
 *   node server/scripts/apply-arabic.mjs <file.json>          # DRY RUN
 *   node server/scripts/apply-arabic.mjs <file.json> --apply  # APPLY to DB
 *   node server/scripts/apply-arabic.mjs <file.json> --apply --force # Overwrite existing Arabic values
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

const args = process.argv.slice(2);
const isApply = args.includes('--apply');
const isForce = args.includes('--force');
const fileArg = args.find((a) => !a.startsWith('--'));

if (!fileArg) {
  console.error('❌ Please specify a JSON file to apply: node apply-arabic.mjs <file.json> [--apply] [--force]');
  process.exit(1);
}

const targetPath = path.isAbsolute(fileArg) ? fileArg : path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(targetPath)) {
  console.error(`❌ File not found: ${targetPath}`);
  process.exit(1);
}

// Load MONGODB_URI strictly from server/.env
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
  const rawData = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const items = Array.isArray(rawData) ? rawData : (rawData.items || []);

  console.log(`\nMode: ${isApply ? '🚀 APPLYING TO DATABASE' : '🔍 DRY-RUN (no database writes)'}`);
  if (isForce) console.log('⚠️  --force enabled: will overwrite existing non-empty Arabic fields.');
  console.log(`Loaded ${items.length} translation entries from ${targetPath}\n`);

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected.\n');

  try {
    const counts = {
      categories: { matched: 0, updated: 0, skipped: 0 },
      menuItems: { matched: 0, updated: 0, skipped: 0 },
      optionLibraryItems: { matched: 0, updated: 0, skipped: 0 },
      branches: { matched: 0, updated: 0, skipped: 0 },
      settings: { matched: 0, updated: 0, skipped: 0 },
    };

    const categoryOps = [];
    const menuItemOps = [];
    const optionLibOps = [];
    const branchOps = [];
    let settingsUpdateDoc = null;

    const sampleChanges = [];

    for (const entry of items) {
      const type = entry.type;
      const key = entry.key;
      const arabic = entry.arabic || {};

      if (type === 'category') {
        const cat = await Category.findOne({ slug: key }).lean();
        if (!cat) continue;
        counts.categories.matched++;

        const $set = {};
        if (arabic.nameAr && (isForce || !cat.nameAr)) {
          $set.nameAr = arabic.nameAr.trim();
        }
        if (arabic.descriptionAr && (isForce || !cat.descriptionAr)) {
          $set.descriptionAr = arabic.descriptionAr.trim();
        }

        if (Object.keys($set).length > 0) {
          counts.categories.updated++;
          categoryOps.push({
            updateOne: { filter: { _id: cat._id }, update: { $set } },
          });
          if (sampleChanges.length < 5) {
            sampleChanges.push({ type, key, changes: $set });
          }
        } else {
          counts.categories.skipped++;
        }
      } else if (type === 'menuItem') {
        const mItem = await MenuItem.findOne({ slug: key });
        if (!mItem) continue;
        counts.menuItems.matched++;

        let itemModified = false;
        const changeRecord = {};

        if (arabic.nameAr && (isForce || !mItem.nameAr)) {
          mItem.nameAr = arabic.nameAr.trim();
          changeRecord.nameAr = mItem.nameAr;
          itemModified = true;
        }
        if (arabic.descriptionAr && (isForce || !mItem.descriptionAr)) {
          mItem.descriptionAr = arabic.descriptionAr.trim();
          changeRecord.descriptionAr = mItem.descriptionAr;
          itemModified = true;
        }

        // Match options and choices
        if (Array.isArray(entry.options) && Array.isArray(mItem.options)) {
          for (const optEntry of entry.options) {
            const mOpt = mItem.options.find((o) => o.name === optEntry.name);
            if (!mOpt) continue;

            if (optEntry.nameAr && (isForce || !mOpt.nameAr)) {
              mOpt.nameAr = optEntry.nameAr.trim();
              changeRecord[`option.${mOpt.name}.nameAr`] = mOpt.nameAr;
              itemModified = true;
            }

            if (Array.isArray(optEntry.choices) && Array.isArray(mOpt.choices)) {
              for (const chEntry of optEntry.choices) {
                const mChoice = mOpt.choices.find((c) => c.label === chEntry.label);
                if (!mChoice) continue;

                if (chEntry.labelAr && (isForce || !mChoice.labelAr)) {
                  mChoice.labelAr = chEntry.labelAr.trim();
                  changeRecord[`option.${mOpt.name}.choice.${mChoice.label}.labelAr`] = mChoice.labelAr;
                  itemModified = true;
                }
              }
            }
          }
        }

        if (itemModified) {
          counts.menuItems.updated++;
          menuItemOps.push({
            updateOne: {
              filter: { _id: mItem._id },
              update: {
                $set: {
                  nameAr: mItem.nameAr,
                  descriptionAr: mItem.descriptionAr,
                  options: mItem.options,
                },
              },
            },
          });
          if (sampleChanges.length < 5) {
            sampleChanges.push({ type, key, changes: changeRecord });
          }
        } else {
          counts.menuItems.skipped++;
        }
      } else if (type === 'optionLibraryItem') {
        const lib = await OptionLibraryItem.findOne({ name: key }).lean();
        if (!lib) continue;
        counts.optionLibraryItems.matched++;

        const $set = {};
        if (arabic.nameAr && (isForce || !lib.nameAr)) {
          $set.nameAr = arabic.nameAr.trim();
        }

        if (Object.keys($set).length > 0) {
          counts.optionLibraryItems.updated++;
          optionLibOps.push({
            updateOne: { filter: { _id: lib._id }, update: { $set } },
          });
          if (sampleChanges.length < 5) {
            sampleChanges.push({ type, key, changes: $set });
          }
        } else {
          counts.optionLibraryItems.skipped++;
        }
      } else if (type === 'branch') {
        const b = await Branch.findOne({ slug: key }).lean();
        if (!b) continue;
        counts.branches.matched++;

        const $set = {};
        if (arabic.nameAr && (isForce || !b.nameAr)) {
          $set.nameAr = arabic.nameAr.trim();
        }
        if (arabic.addressAr && (isForce || !b.addressAr)) {
          $set.addressAr = arabic.addressAr.trim();
        }
        if (arabic.openingHoursAr && (isForce || !b.openingHoursAr)) {
          $set.openingHoursAr = arabic.openingHoursAr.trim();
        }

        if (Object.keys($set).length > 0) {
          counts.branches.updated++;
          branchOps.push({
            updateOne: { filter: { _id: b._id }, update: { $set } },
          });
          if (sampleChanges.length < 5) {
            sampleChanges.push({ type, key, changes: $set });
          }
        } else {
          counts.branches.skipped++;
        }
      } else if (type === 'settings') {
        const s = await SiteSettings.findOne().lean();
        if (!s) continue;
        counts.settings.matched++;

        if (arabic.aboutTextAr && (isForce || !s.aboutTextAr)) {
          counts.settings.updated++;
          settingsUpdateDoc = { aboutTextAr: arabic.aboutTextAr.trim() };
          if (sampleChanges.length < 5) {
            sampleChanges.push({ type, key, changes: settingsUpdateDoc });
          }
        } else {
          counts.settings.skipped++;
        }
      }
    }

    console.log('--- Summary of Planned Changes ---');
    console.log(`Categories:           Matched: ${counts.categories.matched}, To Update: ${counts.categories.updated}, Skipped: ${counts.categories.skipped}`);
    console.log(`Menu Items:           Matched: ${counts.menuItems.matched}, To Update: ${counts.menuItems.updated}, Skipped: ${counts.menuItems.skipped}`);
    console.log(`Option Library Items: Matched: ${counts.optionLibraryItems.matched}, To Update: ${counts.optionLibraryItems.updated}, Skipped: ${counts.optionLibraryItems.skipped}`);
    console.log(`Branches:             Matched: ${counts.branches.matched}, To Update: ${counts.branches.updated}, Skipped: ${counts.branches.skipped}`);
    console.log(`Site Settings:        Matched: ${counts.settings.matched}, To Update: ${counts.settings.updated}, Skipped: ${counts.settings.skipped}`);

    if (sampleChanges.length > 0) {
      console.log('\n--- Sample Changes ---');
      console.log(JSON.stringify(sampleChanges, null, 2));
    }

    if (isApply) {
      console.log('\nExecuting bulk updates...');
      if (categoryOps.length > 0) {
        const res = await Category.bulkWrite(categoryOps, { ordered: false });
        console.log(`✅ Categories updated: ${res.modifiedCount}`);
      }
      if (menuItemOps.length > 0) {
        const res = await MenuItem.bulkWrite(menuItemOps, { ordered: false });
        console.log(`✅ MenuItems updated: ${res.modifiedCount}`);
      }
      if (optionLibOps.length > 0) {
        const res = await OptionLibraryItem.bulkWrite(optionLibOps, { ordered: false });
        console.log(`✅ OptionLibraryItems updated: ${res.modifiedCount}`);
      }
      if (branchOps.length > 0) {
        const res = await Branch.bulkWrite(branchOps, { ordered: false });
        console.log(`✅ Branches updated: ${res.modifiedCount}`);
      }
      if (settingsUpdateDoc) {
        await SiteSettings.updateOne({}, { $set: settingsUpdateDoc });
        console.log(`✅ SiteSettings updated.`);
      }
      console.log('\n🎉 All operations applied successfully.');
    } else {
      console.log('\nℹ️  This was a DRY RUN. No changes were written to the database.');
      console.log('To apply changes, run the command with --apply.');
    }
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
}

main().catch((err) => {
  console.error('Apply failed:', err);
  process.exit(1);
});

