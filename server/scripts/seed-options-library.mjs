#!/usr/bin/env node
/**
 * Meat Corner – Seed Options Library (Sauces & Side Dishes)
 * server/scripts/seed-options-library.mjs
 *
 * Scans server/uploads/Sauces and server/uploads/Side Dishes (including nested folders),
 * converts HEIC/PNG/JPG to WebP, uploads to Vercel Blob (or stores locally if token is absent),
 * and creates OptionLibraryItem records in MongoDB.
 *
 * HEIC decoding is handled via `heic-convert` (pure JS/WASM) converting to JPEG buffer in-memory,
 * then passed to `sharp` for high-quality WebP generation.
 *
 * Usage:
 *   node scripts/seed-options-library.mjs            # DRY RUN (shows file -> name mapping, tests HEIC in-memory, no changes)
 *   node scripts/seed-options-library.mjs --dry-run  # Explicit DRY RUN
 *   node scripts/seed-options-library.mjs --apply    # Real execution (upserts to DB, uploads images)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const uploadsDir = path.resolve(__dirname, '../uploads');

const isApply = process.argv.includes('--apply');
const isDryRun = !isApply || process.argv.includes('--dry-run');

// ─── 1. Load MONGODB_URI strictly from server/.env ──────────────────────────
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

const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

// ─── 2. Helpers ─────────────────────────────────────────────────────────────
function formatOptionName(filename) {
  const withoutExt = path.parse(filename).name;
  let clean = withoutExt.replace(/[_-]+/g, ' ').trim();
  const words = clean.split(/\s+/).map((word) => {
    const lower = word.toLowerCase();
    if (lower === 'bbq') return 'BBQ';
    if (lower === '&' || lower === 'and') return '&';
    if (/^\d+(\.\d+)?[a-z]+$/i.test(word)) return word; // e.g. 3.7ml
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return words.join(' ');
}

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.avif']);

function scanDirectoryRecursive(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectoryRecursive(fullPath));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Prepares image buffer for sharp: if HEIC/HEIF, converts to JPEG buffer first via heic-convert.
 */
async function prepareImageBuffer(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.heic' || ext === '.heif') {
    const heicConvert = (await import('heic-convert')).default;
    const jpegBuffer = await heicConvert({
      buffer: fileBuffer,
      format: 'JPEG',
      quality: 0.92,
    });
    return Buffer.from(jpegBuffer);
  }

  return fileBuffer;
}

// ─── 3. Main Runner ─────────────────────────────────────────────────────────
async function run() {
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`  Meat Corner – Seed Options Library [${isDryRun ? 'DRY RUN - PREVIEW ONLY' : 'APPLY MODE'}]`);
  console.log('─────────────────────────────────────────────────────────────────');

  const saucesDir = path.join(uploadsDir, 'Sauces');
  const sidesDir = path.join(uploadsDir, 'Side Dishes');

  const sauceFiles = scanDirectoryRecursive(saucesDir);
  const sideFiles = scanDirectoryRecursive(sidesDir);

  const itemsToSeed = [];

  for (const filePath of sauceFiles) {
    const filename = path.basename(filePath);
    const name = formatOptionName(filename);
    itemsToSeed.push({
      filePath,
      filename,
      relPath: path.relative(uploadsDir, filePath),
      name,
      category: 'sauce',
    });
  }

  for (const filePath of sideFiles) {
    const filename = path.basename(filePath);
    const name = formatOptionName(filename);
    itemsToSeed.push({
      filePath,
      filename,
      relPath: path.relative(uploadsDir, filePath),
      name,
      category: 'side',
    });
  }

  // De-duplicate across nested directories
  const uniqueItemsMap = new Map();
  for (const item of itemsToSeed) {
    if (!uniqueItemsMap.has(item.name)) {
      uniqueItemsMap.set(item.name, item);
    }
  }
  const uniqueItems = Array.from(uniqueItemsMap.values());

  console.log(`\nFound ${uniqueItems.length} unique library items from uploads:`);
  console.log(`  • Sauces: ${uniqueItems.filter((i) => i.category === 'sauce').length}`);
  console.log(`  • Side Dishes: ${uniqueItems.filter((i) => i.category === 'side').length}`);
  console.log('\nMapping (File -> Generated Name [Category]):');
  console.log('─────────────────────────────────────────────────────────────────');
  uniqueItems.forEach((item, idx) => {
    console.log(
      `  ${String(idx + 1).padStart(2, ' ')}. [${item.category.toUpperCase().padEnd(5, ' ')}] ` +
      `"${item.filename}" (${item.relPath})\n      ➔  "${item.name}"`
    );
  });
  console.log('─────────────────────────────────────────────────────────────────');

  // Check MongoDB existing records
  let existingNames = new Set();
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
      const OptionLibraryItem =
        mongoose.models.OptionLibraryItem ||
        (await import('../src/models/OptionLibraryItem.js')).default;
      const existingDocs = await OptionLibraryItem.find({}, 'name').lean();
      existingNames = new Set(existingDocs.map((d) => d.name));
      console.log(`\nDB Status: ${existingNames.size} existing items already in OptionLibraryItem.`);
    } catch (err) {
      console.warn('⚠️  Could not connect to DB for preview:', err.message);
    }
  }

  if (isDryRun) {
    console.log('\n🧪 Testing in-memory HEIC decoding via heic-convert...');
    const testHeicItem = uniqueItems.find(
      (i) => i.filename.toLowerCase() === 'cowboy sauce.heic' || i.filename.toLowerCase().endsWith('.heic')
    );

    if (testHeicItem) {
      try {
        console.log(`   Selected test file: "${testHeicItem.filename}" (${testHeicItem.relPath})`);
        const decodedBuffer = await prepareImageBuffer(testHeicItem.filePath);
        const meta = await sharp(decodedBuffer).metadata();
        console.log(`   ✅ HEIC decode test SUCCESSFUL: decoded to ${meta.width}x${meta.height} (${meta.format}) in memory.`);
      } catch (err) {
        console.error(`   ❌ HEIC decode test FAILED:`, err.message);
      }
    } else {
      console.log('   ⚠️  No HEIC file found to test.');
    }

    console.log('\n[DRY RUN SUMMARY]');
    console.log(`  - Items that would be newly created: ${uniqueItems.filter((i) => !existingNames.has(i.name)).length}`);
    console.log(`  - Items already present (will be preserved/updated): ${uniqueItems.filter((i) => existingNames.has(i.name)).length}`);
    console.log('\n✅ Dry run complete. No files uploaded and no database changes made.');
    console.log('   To apply changes to DB, run:');
    console.log('   node scripts/seed-options-library.mjs --apply\n');
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    return;
  }

  // ─── APPLY MODE ─────────────────────────────────────────────────────────────
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found. Cannot apply.');
    process.exit(1);
  }

  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(mongoUri);
  }

  const OptionLibraryItem =
    mongoose.models.OptionLibraryItem ||
    (await import('../src/models/OptionLibraryItem.js')).default;

  console.log('\n🚀 Starting image conversion and DB upsert...');

  let putBlob = null;
  if (blobToken) {
    const blobPkg = await import('@vercel/blob');
    putBlob = blobPkg.put;
    console.log('☁️  Vercel Blob token detected. Images will be uploaded to Vercel Blob.');
  } else {
    console.log('💾 No BLOB_READ_WRITE_TOKEN set. Images will be processed to server/uploads/processed/.');
  }

  const processedDir = path.join(uploadsDir, 'processed');
  if (!fs.existsSync(processedDir)) {
    fs.mkdirSync(processedDir, { recursive: true });
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < uniqueItems.length; i++) {
    const item = uniqueItems[i];
    console.log(`[${i + 1}/${uniqueItems.length}] Processing "${item.name}"...`);

    const existingDoc = await OptionLibraryItem.findOne({ name: item.name });

    // If already exists with valid images, don't re-upload
    if (existingDoc && existingDoc.image?.url && existingDoc.image?.thumbUrl) {
      console.log(`   ↳ Already exists with image. Preserving without re-upload.`);
      updatedCount++;
      continue;
    }

    // Convert with prepareImageBuffer (handles HEIC -> JPEG buffer) and sharp -> WebP
    const imageBuffer = await prepareImageBuffer(item.filePath);
    const safeBaseName = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const mainWebp = await sharp(imageBuffer)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer();

    const thumbWebp = await sharp(imageBuffer)
      .rotate()
      .resize({ width: 320, height: 320, fit: 'cover' })
      .webp({ quality: 80 })
      .toBuffer();

    let mainUrl = '';
    let thumbUrl = '';

    if (putBlob && blobToken) {
      const [mainBlob, thumbBlob] = await Promise.all([
        putBlob(`uploads/options-library/${safeBaseName}.webp`, mainWebp, {
          access: 'public',
          addRandomSuffix: false,
          token: blobToken,
        }),
        putBlob(`uploads/options-library/${safeBaseName}_thumb.webp`, thumbWebp, {
          access: 'public',
          addRandomSuffix: false,
          token: blobToken,
        }),
      ]);
      mainUrl = mainBlob.url;
      thumbUrl = thumbBlob.url;
    } else {
      const mainFilename = `opt_${safeBaseName}.webp`;
      const thumbFilename = `opt_${safeBaseName}_thumb.webp`;
      fs.writeFileSync(path.join(processedDir, mainFilename), mainWebp);
      fs.writeFileSync(path.join(processedDir, thumbFilename), thumbWebp);
      mainUrl = `/uploads/processed/${mainFilename}`;
      thumbUrl = `/uploads/processed/${thumbFilename}`;
    }

    if (existingDoc) {
      existingDoc.image = { url: mainUrl, thumbUrl };
      existingDoc.category = item.category;
      existingDoc.order = i;
      await existingDoc.save();
      updatedCount++;
    } else {
      await OptionLibraryItem.create({
        name: item.name,
        category: item.category,
        image: { url: mainUrl, thumbUrl },
        price: 0,
        isAvailable: true,
        order: i,
      });
      createdCount++;
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log(`✅ Seed Completed: ${createdCount} created, ${updatedCount} preserved/updated.`);
  console.log('─────────────────────────────────────────────────────────────────');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Error during options library seed:', err);
  process.exit(1);
});
