#!/usr/bin/env node
/**
 * Meat Corner – Migrate Uploaded Images to Vercel Blob
 * server/scripts/migrate-images-to-blob.mjs
 *
 * Scans database collections for /uploads/... image paths, uploads the local
 * files to Vercel Blob, and updates the database records to absolute Blob URLs.
 *
 * Usage:
 *   node scripts/migrate-images-to-blob.mjs           # DRY RUN (safe preview)
 *   BLOB_READ_WRITE_TOKEN=xxx node scripts/migrate-images-to-blob.mjs --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');
const uploadsDir = path.resolve(__dirname, '../uploads');
const backupsDir = path.resolve(__dirname, '../backups');

const isApply = process.argv.includes('--apply');

// ─── 1. Load MONGODB_URI strictly from server/.env (never read BLOB token from .env) ─
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
  console.error('❌ MONGODB_URI not found in server/.env');
  process.exit(1);
}

// BLOB_READ_WRITE_TOKEN must come strictly from process.env
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (isApply && !blobToken) {
  console.error('❌ BLOB_READ_WRITE_TOKEN must be set in process.env when running with --apply');
  console.error('   Example: BLOB_READ_WRITE_TOKEN="vercel_blob_..." npm run migrate:images -- --apply');
  process.exit(1);
}

// ─── Helper: MIME Type Detection ─────────────────────────────────────────────
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.webp': return 'image/webp';
    case '.png':  return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif':  return 'image/gif';
    case '.svg':  return 'image/svg+xml';
    case '.avif': return 'image/avif';
    default:      return 'application/octet-stream';
  }
}

// ─── Helper: Recursive string finder for /uploads/ ────────────────────────────
function findUploadPaths(obj, currentPath = '') {
  const matches = [];
  if (obj == null) return matches;

  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/')) {
      matches.push({ path: currentPath, value: obj });
    }
    return matches;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const p = currentPath ? `${currentPath}.${i}` : `${i}`;
      matches.push(...findUploadPaths(obj[i], p));
    }
    return matches;
  }

  if (typeof obj === 'object') {
    if (obj._bsontype || obj instanceof Date) return matches;

    for (const key of Object.keys(obj)) {
      const p = currentPath ? `${currentPath}.${key}` : key;
      matches.push(...findUploadPaths(obj[key], p));
    }
  }

  return matches;
}

// ─── Main Migration Logic ────────────────────────────────────────────────────
async function run() {
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`  Meat Corner – Vercel Blob Image Migration [${isApply ? 'APPLY MODE' : 'DRY RUN'}]`);
  console.log('─────────────────────────────────────────────────────────────────');

  // Connect to MongoDB
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  console.log(`✅ Connected to database: "${mongoose.connection.name}"`);

  // Target collections specified in requirements
  const targetCollections = [
    'menuitems',
    'categories',
    'sitesettings',
    'branches',
    'submissions',
    'admins',
  ];

  const existingCollections = await db.listCollections().toArray();
  const existingNames = new Set(existingCollections.map((c) => c.name));

  const collectionModifications = []; // { colName, docId, updates: { [fieldPath]: oldValue } }
  const distinctUploadPaths = new Set();

  for (const colName of targetCollections) {
    if (!existingNames.has(colName)) {
      continue;
    }

    const col = db.collection(colName);
    const docs = await col.find({}).toArray();

    for (const doc of docs) {
      const pathsInDoc = findUploadPaths(doc);
      if (pathsInDoc.length > 0) {
        const updateMap = {};
        for (const item of pathsInDoc) {
          updateMap[item.path] = item.value;
          distinctUploadPaths.add(item.value);
        }
        collectionModifications.push({
          colName,
          docId: doc._id,
          updates: updateMap,
        });
      }
    }
  }

  // Check local files on disk
  const existingFiles = [];
  const missingFiles = [];
  let totalSizeBytes = 0;

  for (const uploadPath of distinctUploadPaths) {
    const relPath = uploadPath.replace(/^\/uploads\/?/, '');
    const localFile = path.resolve(uploadsDir, relPath);

    if (fs.existsSync(localFile)) {
      const stat = fs.statSync(localFile);
      existingFiles.push({ uploadPath, localFile, relPath, size: stat.size });
      totalSizeBytes += stat.size;
    } else {
      missingFiles.push({ uploadPath, localFile });
    }
  }

  console.log('\n📊 Scan Results:');
  console.log(`  • Distinct /uploads/ paths referenced in DB: ${distinctUploadPaths.size}`);
  console.log(`  • Local files found: ${existingFiles.length} (${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB total)`);
  console.log(`  • Local files missing: ${missingFiles.length}`);
  console.log(`  • Database documents affected: ${collectionModifications.length}`);

  if (missingFiles.length > 0) {
    console.log('\n⚠️  Missing Local Files:');
    for (const m of missingFiles) {
      console.log(`    - ${m.uploadPath} (expected at ${m.localFile})`);
    }
  }

  // Document breakdown by collection
  const countByCollection = {};
  for (const mod of collectionModifications) {
    countByCollection[mod.colName] = (countByCollection[mod.colName] || 0) + 1;
  }
  console.log('\n📁 Documents to update by collection:');
  for (const [col, count] of Object.entries(countByCollection)) {
    console.log(`    - ${col}: ${count} document(s)`);
  }

  // If DRY RUN: exit with report
  if (!isApply) {
    console.log('\nℹ️  DRY RUN complete. No files were uploaded and no database records were modified.');
    console.log('   To execute the migration, run:');
    console.log('   BLOB_READ_WRITE_TOKEN="your_token" npm run migrate:images -- --apply\n');
    await mongoose.disconnect();
    return;
  }

  // ─── APPLY MODE: Upload to Vercel Blob & Update DB ─────────────────────────
  console.log('\n🚀 Starting Blob Uploads...');
  const { put } = await import('@vercel/blob');

  // Load existing backup mappings to be idempotent across runs
  const pathToBlobUrl = {};
  if (fs.existsSync(backupsDir)) {
    const backupFiles = fs.readdirSync(backupsDir).filter((f) => f.startsWith('image-migration-') && f.endsWith('.json'));
    for (const bf of backupFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(backupsDir, bf), 'utf8'));
        if (data.mappings) {
          Object.assign(pathToBlobUrl, data.mappings);
        }
      } catch {}
    }
  }

  let uploadedCount = 0;
  let skippedCount = 0;

  for (const item of existingFiles) {
    if (pathToBlobUrl[item.uploadPath]) {
      skippedCount++;
      continue;
    }

    const fileBuffer = fs.readFileSync(item.localFile);
    const blobPathname = `uploads/${item.relPath.replace(/\\/g, '/')}`;

    try {
      const blob = await put(blobPathname, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: getContentType(item.localFile),
        token: blobToken,
        cacheControlMaxAge: 31536000, // 1 year
      });
      pathToBlobUrl[item.uploadPath] = blob.url;
      uploadedCount++;
      console.log(`  [${uploadedCount + skippedCount}/${existingFiles.length}] Uploaded: ${item.uploadPath} → ${blob.url}`);
    } catch (err) {
      console.error(`  ❌ Failed to upload ${item.uploadPath}:`, err.message);
      throw err;
    }
  }

  console.log(`\n✅ Upload complete: ${uploadedCount} uploaded, ${skippedCount} previously mapped/skipped.`);

  // Write backup mapping file before modifying the database
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  const timestamp = Date.now();
  const backupFilePath = path.join(backupsDir, `image-migration-${timestamp}.json`);
  const backupPayload = {
    timestamp: new Date().toISOString(),
    database: mongoose.connection.name,
    totalMapped: Object.keys(pathToBlobUrl).length,
    mappings: pathToBlobUrl,
  };
  fs.writeFileSync(backupFilePath, JSON.stringify(backupPayload, null, 2), 'utf8');
  console.log(`💾 Backup mapping saved to: server/backups/image-migration-${timestamp}.json`);

  // Update Database Documents
  console.log('\n📝 Updating database documents...');
  let updatedDocsCount = 0;

  for (const mod of collectionModifications) {
    const col = db.collection(mod.colName);
    const setFields = {};

    for (const [fieldPath, oldVal] of Object.entries(mod.updates)) {
      if (pathToBlobUrl[oldVal]) {
        setFields[fieldPath] = pathToBlobUrl[oldVal];
      }
    }

    if (Object.keys(setFields).length > 0) {
      await col.updateOne({ _id: mod.docId }, { $set: setFields });
      updatedDocsCount++;
    }
  }

  console.log(`✅ Successfully updated ${updatedDocsCount} document(s) across all collections.`);
  console.log('🎉 Migration completed successfully!\n');

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('\n❌ Migration failed:', err);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
