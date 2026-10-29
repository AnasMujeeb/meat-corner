/**
 * Storage Service – Local Disk and Vercel Blob Implementation
 *
 * Public interface:
 *   saveImage(buffer, filename) → { url: string, thumbUrl: string }
 *   deleteImage(url)            → void
 *
 * Behavior:
 *  - If BLOB_READ_WRITE_TOKEN is set:
 *      Uploads to @vercel/blob with public access and returns absolute HTTPS URLs.
 *  - If running on Vercel without BLOB_READ_WRITE_TOKEN:
 *      Does not crash at startup; saveImage throws a 503 "Image storage is not configured".
 *  - If local disk:
 *      Lazily creates UPLOAD_DIR on first save; returns relative /uploads/... URLs.
 */

import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.resolve(env.UPLOAD_DIR);
const isVercel = Boolean(process.env.VERCEL);
const isBlobStorage = Boolean(env.BLOB_READ_WRITE_TOKEN);

/**
 * Ensure upload directory exists lazily when saving to local disk.
 */
async function ensureUploadDir() {
  if (UPLOAD_DIR.startsWith(srcDir)) {
    throw new Error(
      `CRITICAL: UPLOAD_DIR (${UPLOAD_DIR}) must not be located within src/ (${srcDir}) to prevent infinite file watcher loops.`
    );
  }
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
}

/**
 * Process and persist an image buffer.
 *
 * @param {Buffer} buffer - Raw image buffer (from multer memoryStorage)
 * @param {string} baseName - Unique base filename without extension
 * @returns {Promise<{ url: string, thumbUrl: string }>}
 */
export async function saveImage(buffer, baseName) {
  if (isBlobStorage) {
    const mainFilename = `${baseName}.webp`;
    const thumbFilename = `${baseName}_thumb.webp`;

    const mainWebpBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const thumbWebpBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    const { put } = await import('@vercel/blob');

    const [mainBlob, thumbBlob] = await Promise.all([
      put(`uploads/${mainFilename}`, mainWebpBuffer, {
        access: 'public',
        addRandomSuffix: false,
        token: env.BLOB_READ_WRITE_TOKEN,
      }),
      put(`uploads/${thumbFilename}`, thumbWebpBuffer, {
        access: 'public',
        addRandomSuffix: false,
        token: env.BLOB_READ_WRITE_TOKEN,
      }),
    ]);

    return {
      url: mainBlob.url,
      thumbUrl: thumbBlob.url,
    };
  }

  // Running on Vercel without Blob storage
  if (isVercel) {
    const err = new Error('Image storage is not configured');
    err.statusCode = 503;
    throw err;
  }

  // Local disk persistence: lazily ensure directory exists
  await ensureUploadDir();

  const mainFilename = `${baseName}.webp`;
  const thumbFilename = `${baseName}_thumb.webp`;

  const mainPath = path.join(UPLOAD_DIR, mainFilename);
  const thumbPath = path.join(UPLOAD_DIR, thumbFilename);

  await sharp(buffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(mainPath);

  await sharp(buffer)
    .rotate()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(thumbPath);

  return {
    url: `/uploads/${mainFilename}`,
    thumbUrl: `/uploads/${thumbFilename}`,
  };
}

const SAFE_UPLOAD_URL_RE = /^\/uploads\/[A-Za-z0-9_-]+\.webp$/;

/**
 * Check whether an image URL (or its thumbnail variant) is referenced in the database
 * by any MenuItem, Category, or SiteSettings record.
 *
 * @param {string} url - The URL or path to check
 * @returns {Promise<boolean>}
 */
export async function isImageReferenced(url) {
  if (!url || typeof url !== 'string') return false;

  try {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState !== 1) {
      return false;
    }

    const MenuItem = mongoose.models.MenuItem || (await import('../models/MenuItem.js')).default;
    const Category = mongoose.models.Category || (await import('../models/Category.js')).default;
    const SiteSettings = mongoose.models.SiteSettings || (await import('../models/SiteSettings.js')).default;
    const OptionLibraryItem = mongoose.models.OptionLibraryItem || (await import('../models/OptionLibraryItem.js')).default;

    const urlsToCheck = new Set();
    const cleanUrl = url.trim();
    urlsToCheck.add(cleanUrl);

    try {
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        const u = new URL(cleanUrl);
        urlsToCheck.add(`${u.origin}${u.pathname}`);
        urlsToCheck.add(u.pathname);
        urlsToCheck.add(u.pathname.replace(/^\/+/, ''));
      }
    } catch {}

    for (const u of Array.from(urlsToCheck)) {
      if (u.includes('_thumb.webp')) {
        urlsToCheck.add(u.replace(/_thumb\.webp$/, '.webp'));
      } else if (u.endsWith('.webp')) {
        urlsToCheck.add(u.replace(/\.webp$/, '_thumb.webp'));
      }
    }

    const urlList = Array.from(urlsToCheck);

    const [inMenuItem, inCategory, inSiteSettings, inOptionLibrary] = await Promise.all([
      MenuItem.exists({
        $or: [
          { 'images.url': { $in: urlList } },
          { 'images.thumbUrl': { $in: urlList } },
          { 'options.choices.image.url': { $in: urlList } },
          { 'options.choices.image.thumbUrl': { $in: urlList } },
        ],
      }),
      Category.exists({ image: { $in: urlList } }),
      SiteSettings.exists({
        $or: [
          { logo: { $in: urlList } },
          { heroPoster: { $in: urlList } },
          { heroVideoUrl: { $in: urlList } },
        ],
      }),
      OptionLibraryItem.exists({
        $or: [
          { 'image.url': { $in: urlList } },
          { 'image.thumbUrl': { $in: urlList } },
        ],
      }),
    ]);

    return Boolean(inMenuItem || inCategory || inSiteSettings || inOptionLibrary);
  } catch (err) {
    console.warn('⚠️  Failed to check if image is referenced:', err.message);
    return true; // err on the side of caution
  }
}

/**
 * Delete an image (and its corresponding thumb) from Blob storage or disk.
 * Skips deletion if the image is still referenced by any menu item, category, or settings.
 *
 * @param {string} url - The URL returned by saveImage
 */
export async function deleteImage(url) {
  if (!url) return;

  // Blob storage deletion (best-effort)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (!env.BLOB_READ_WRITE_TOKEN) return;
    try {
      const referenced = await isImageReferenced(url);
      if (referenced) {
        return;
      }
      const { del } = await import('@vercel/blob');
      const urlsToDelete = [url];
      if (!url.includes('_thumb.webp') && url.endsWith('.webp')) {
        urlsToDelete.push(url.replace(/\.webp$/, '_thumb.webp'));
      }
      await del(urlsToDelete, { token: env.BLOB_READ_WRITE_TOKEN });
    } catch (err) {
      console.warn('⚠️  Failed to delete from Vercel Blob (best-effort):', err.message);
    }
    return;
  }

  // If on Vercel without blob storage, never touch local disk
  if (isVercel) {
    return;
  }

  // Local disk deletion
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return;
  }
  if (!SAFE_UPLOAD_URL_RE.test(decoded)) return;

  const filename = path.basename(decoded);
  const mainPath = path.join(UPLOAD_DIR, filename);

  if (filename.endsWith('_thumb.webp')) {
    await fs.rm(mainPath, { force: true }).catch(() => {});
    return;
  }

  const thumbFilename = filename.replace(/\.webp$/, '_thumb.webp');
  const thumbPath = path.join(UPLOAD_DIR, thumbFilename);

  await Promise.all([
    fs.rm(mainPath, { force: true }).catch(() => {}),
    fs.rm(thumbPath, { force: true }).catch(() => {}),
  ]);
}
