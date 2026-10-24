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
 *  - If BLOB_READ_WRITE_TOKEN is not set:
 *      Saves to local disk under UPLOAD_DIR and returns relative /uploads/... URLs.
 */

import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.resolve(env.UPLOAD_DIR);
const isBlobStorage = Boolean(env.BLOB_READ_WRITE_TOKEN);

// Ensure mkdir and local validation only run when using local disk
if (!isBlobStorage) {
  if (UPLOAD_DIR.startsWith(srcDir)) {
    throw new Error(
      `CRITICAL: UPLOAD_DIR (${UPLOAD_DIR}) must not be located within src/ (${srcDir}) to prevent infinite file watcher loops.`
    );
  }
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Process and persist an image buffer.
 *
 * @param {Buffer} buffer - Raw image buffer (from multer memoryStorage)
 * @param {string} baseName - Unique base filename without extension
 * @returns {Promise<{ url: string, thumbUrl: string }>}
 */
export async function saveImage(buffer, baseName) {
  const mainFilename = `${baseName}.webp`;
  const thumbFilename = `${baseName}_thumb.webp`;

  if (isBlobStorage) {
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

  // Local disk persistence
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
 * Delete an image (and its corresponding thumb) from Blob storage or disk.
 *
 * @param {string} url - The URL returned by saveImage
 */
export async function deleteImage(url) {
  if (!url) return;

  // Blob storage deletion (best-effort)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
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
    await fs.rm(mainPath, { force: true });
    return;
  }

  const thumbFilename = filename.replace(/\.webp$/, '_thumb.webp');
  const thumbPath = path.join(UPLOAD_DIR, thumbFilename);

  await Promise.all([
    fs.rm(mainPath, { force: true }),
    fs.rm(thumbPath, { force: true }),
  ]);
}
