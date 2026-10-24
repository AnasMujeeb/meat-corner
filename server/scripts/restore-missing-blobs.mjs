#!/usr/bin/env node
/**
 * Meat Corner – Restore Missing Vercel Blob Images
 * server/scripts/restore-missing-blobs.mjs
 *
 * Scans MongoDB database collections (menuitems, categories, sitesettings) for
 * Vercel Blob URLs, performs HEAD requests on each, and for any returning 404,
 * locates the corresponding local file in server/uploads/<path after "uploads/">
 * and re-uploads it to the exact same pathname.
 *
 * Usage:
 *   node scripts/restore-missing-blobs.mjs          # DRY RUN (safe preview)
 *   BLOB_READ_WRITE_TOKEN=xxx npm run restore:blobs -- --apply
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(__dirname, '..');
const envPath = path.resolve(serverDir, '.env');
const uploadsDir = path.resolve(serverDir, 'uploads');

// Load environment variables from server/.env if present without overriding existing env
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const isApply = process.argv.includes('--apply');
const mongoUri = process.env.MONGODB_URI;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

if (!mongoUri) {
  console.error('❌ MONGODB_URI not found in environment or server/.env');
  process.exit(1);
}

if (isApply && !blobToken) {
  console.error('❌ BLOB_READ_WRITE_TOKEN must be set in the environment when running with --apply');
  console.error('   Example: BLOB_READ_WRITE_TOKEN="vercel_blob_..." npm run restore:blobs -- --apply');
  process.exit(1);
}

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
    case '.mp4':  return 'video/mp4';
    default:      return 'application/octet-stream';
  }
}

function isBlobUrl(str) {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('http') && str.includes('blob.vercel-storage.com');
}

function extractBlobUrlsFromDoc(doc) {
  const urls = [];
  if (!doc) return urls;

  function recurse(value) {
    if (!value) return;
    if (typeof value === 'string') {
      if (isBlobUrl(value)) urls.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) recurse(item);
      return;
    }
    if (typeof value === 'object') {
      if (value._bsontype || value instanceof Date) return;
      for (const key of Object.keys(value)) recurse(value[key]);
    }
  }

  recurse(doc);
  return urls;
}

async function headCheckWithConcurrency(urls, concurrency = 15) {
  const results = [];
  const queue = [...urls];

  async function worker() {
    while (queue.length > 0) {
      const url = queue.shift();
      try {
        const res = await fetch(url, { method: 'HEAD' });
        results.push({ url, status: res.status, ok: res.ok });
      } catch (err) {
        results.push({ url, status: 0, error: err.message, ok: false });
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function run() {
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`  Meat Corner – Restore Missing Vercel Blobs [${isApply ? 'APPLY MODE' : 'DRY RUN'}]`);
  console.log('─────────────────────────────────────────────────────────────────');

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;
  console.log(`✅ Connected to database: "${mongoose.connection.name}"`);

  // Collect from menuitems, categories, sitesettings
  const targetCollections = ['menuitems', 'categories', 'sitesettings'];
  const allBlobUrls = new Set();
  const urlSources = new Map(); // url -> Array of sources

  for (const colName of targetCollections) {
    const col = db.collection(colName);
    const docs = await col.find({}).toArray();

    for (const doc of docs) {
      let foundInDoc = [];
      if (colName === 'menuitems') {
        if (Array.isArray(doc.images)) {
          for (const img of doc.images) {
            if (isBlobUrl(img?.url)) foundInDoc.push(img.url);
            if (isBlobUrl(img?.thumbUrl)) foundInDoc.push(img.thumbUrl);
          }
        }
      } else if (colName === 'categories') {
        if (isBlobUrl(doc.image)) foundInDoc.push(doc.image);
      } else if (colName === 'sitesettings') {
        if (isBlobUrl(doc.logo)) foundInDoc.push(doc.logo);
        if (isBlobUrl(doc.heroPoster)) foundInDoc.push(doc.heroPoster);
        if (isBlobUrl(doc.heroVideoUrl)) foundInDoc.push(doc.heroVideoUrl);
      }

      // Also scan full doc to catch any other referenced blob URLs
      const deepFound = extractBlobUrlsFromDoc(doc);
      for (const u of deepFound) {
        if (!foundInDoc.includes(u)) foundInDoc.push(u);
      }

      for (const u of foundInDoc) {
        allBlobUrls.add(u);
        const list = urlSources.get(u) || [];
        list.push(`${colName} (id: ${doc._id})`);
        urlSources.set(u, list);
      }
    }
  }

  const urlList = Array.from(allBlobUrls);
  console.log(`\n🔍 Found ${urlList.length} unique Blob URL(s) referenced in database.`);
  console.log(`⏳ Performing HEAD checks on all ${urlList.length} URL(s)...`);

  const checkResults = await headCheckWithConcurrency(urlList, 15);

  const healthyUrls = [];
  const notFoundUrls = [];
  const otherErrorUrls = [];

  for (const res of checkResults) {
    if (res.ok) {
      healthyUrls.push(res.url);
    } else if (res.status === 404) {
      notFoundUrls.push(res.url);
    } else {
      otherErrorUrls.push(res);
    }
  }

  console.log(`\n📊 Health Check Results:`);
  console.log(`  • 200 OK (healthy): ${healthyUrls.length}`);
  console.log(`  • 404 Not Found:    ${notFoundUrls.length}`);
  if (otherErrorUrls.length > 0) {
    console.log(`  • Other errors:     ${otherErrorUrls.length}`);
    for (const o of otherErrorUrls) {
      console.log(`      ${o.status || 'ERR'} - ${o.url} (${o.error || 'Request failed'})`);
    }
  }

  if (notFoundUrls.length === 0) {
    console.log('\n✅ All referenced Blob URLs are healthy! No missing files to restore.\n');
    await mongoose.disconnect();
    return;
  }

  console.log(`\n🔎 Matching 404 URLs against local server/uploads files...`);

  const restorableFiles = [];
  const missingLocalFiles = [];

  for (const url of notFoundUrls) {
    let pathname = '';
    try {
      const parsed = new URL(url);
      pathname = parsed.pathname.replace(/^\/+/, ''); // e.g. "uploads/processed/x.webp"
    } catch {
      missingLocalFiles.push({ url, pathname: '', localFile: null });
      continue;
    }

    const pathAfterUploads = pathname.replace(/^uploads\//, ''); // e.g. "processed/x.webp"

    // Primary location: server/uploads/<path after "uploads/">
    let localFile = path.resolve(uploadsDir, pathAfterUploads);
    if (!fs.existsSync(localFile)) {
      // Secondary check: server/<pathname>
      const altFile = path.resolve(serverDir, pathname);
      if (fs.existsSync(altFile)) {
        localFile = altFile;
      }
    }

    if (fs.existsSync(localFile)) {
      const stat = fs.statSync(localFile);
      restorableFiles.push({
        url,
        pathname,
        localFile,
        size: stat.size,
        contentType: getContentType(localFile),
      });
    } else {
      missingLocalFiles.push({ url, pathname, localFile });
    }
  }

  console.log(`\n📦 Local File Match Summary:`);
  console.log(`  • 404 URLs with local file available: ${restorableFiles.length}`);
  console.log(`  • 404 URLs with NO local file found:  ${missingLocalFiles.length}`);

  if (restorableFiles.length > 0) {
    console.log(`\n✨ Files ready to restore:`);
    for (const item of restorableFiles) {
      console.log(`  ✓ ${item.pathname} (${(item.size / 1024).toFixed(1)} KB)`);
      console.log(`    Local: ${item.localFile}`);
      console.log(`    Blob:  ${item.url}`);
    }
  }

  if (missingLocalFiles.length > 0) {
    console.log(`\n⚠️  404 URLs with NO matching local file:`);
    for (const item of missingLocalFiles) {
      console.log(`  ❌ ${item.url}`);
      console.log(`     Looked at: ${item.localFile || '(invalid URL)'}`);
    }
  }

  if (!isApply) {
    console.log('\nℹ️  DRY RUN complete. No files were uploaded.');
    console.log('   To restore the missing blobs to Vercel Blob storage, run:');
    console.log('   BLOB_READ_WRITE_TOKEN="your_token" npm run restore:blobs -- --apply\n');
    await mongoose.disconnect();
    return;
  }

  // ─── APPLY MODE: Re-upload to Vercel Blob ──────────────────────────────────
  console.log('\n🚀 Starting Blob Re-upload to Vercel Blob...');
  const { put } = await import('@vercel/blob');

  let uploadedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < restorableFiles.length; i++) {
    const item = restorableFiles[i];
    try {
      const fileBuffer = fs.readFileSync(item.localFile);
      const blob = await put(item.pathname, fileBuffer, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: item.contentType,
        token: blobToken,
        cacheControlMaxAge: 31536000,
      });

      uploadedCount++;
      console.log(`  [${i + 1}/${restorableFiles.length}] Uploaded: ${item.pathname} → ${blob.url}`);
    } catch (err) {
      failedCount++;
      console.error(`  [${i + 1}/${restorableFiles.length}] Failed to upload ${item.pathname}: ${err.message}`);
    }
  }

  console.log(`\n🎉 Restoration Summary:`);
  console.log(`  • Successfully re-uploaded: ${uploadedCount}`);
  console.log(`  • Failed uploads:           ${failedCount}`);
  console.log(`  • Missing local files:      ${missingLocalFiles.length}\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('\n❌ Fatal error in restore-missing-blobs:', err);
  process.exit(1);
});
