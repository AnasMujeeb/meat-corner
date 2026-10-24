/**
 * Storage Service – Local Disk Implementation
 *
 * Public interface (swap this module for cloudinary.js / s3.js later):
 *
 *   saveImage(buffer, filename) → { url: string, thumbUrl: string }
 *   deleteImage(url)            → void
 *
 * The interface contract:
 *  - `saveImage` receives a raw image buffer and a base filename (no extension).
 *  - It must produce a main WebP (≤1200px wide) and a thumb WebP (≤400px wide).
 *  - It returns { url, thumbUrl } as public paths consumable by the client.
 *  - `deleteImage` accepts the URL as returned by saveImage and deletes the file.
 */

import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..');
const UPLOAD_DIR = path.resolve(env.UPLOAD_DIR);

// Ensure uploads are never written inside src/ to prevent watch loops
if (UPLOAD_DIR.startsWith(srcDir)) {
  throw new Error(`CRITICAL: UPLOAD_DIR (${UPLOAD_DIR}) must not be located within src/ (${srcDir}) to prevent infinite file watcher loops.`);
}

// Ensure directory exists at module load time
await fs.mkdir(UPLOAD_DIR, { recursive: true });

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

  const mainPath = path.join(UPLOAD_DIR, mainFilename);
  const thumbPath = path.join(UPLOAD_DIR, thumbFilename);

  // Auto-rotate based on EXIF, convert to WebP, resize preserving aspect ratio
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

// Same allowlist used by upload.controller.js — must stay in sync.
// Internal callers (controllers) only ever pass urls produced by saveImage,
// so valid urls always pass. Invalid/corrupt urls are silently skipped (no crash).
const SAFE_UPLOAD_URL_RE = /^\/uploads\/[A-Za-z0-9_-]+\.webp$/;

/**
 * Delete an image (and its corresponding thumb) from disk.
 *
 * @param {string} url - The `/uploads/filename.webp` path returned by saveImage
 */
export async function deleteImage(url) {
  if (!url) return;

  // Validate url before touching the filesystem.
  // Decode once to catch percent-encoded traversal sequences, then test the
  // strict allowlist.  If it doesn't match, skip silently — never crash on
  // corrupt data coming from the DB.
  let decoded;
  try { decoded = decodeURIComponent(url); } catch { return; }
  if (!SAFE_UPLOAD_URL_RE.test(decoded)) return;

  // Derive the filesystem path from the validated, decoded url
  const filename = path.basename(decoded);
  const mainPath = path.join(UPLOAD_DIR, filename);

  // If this is a thumb URL itself, only delete that file
  if (filename.endsWith('_thumb.webp')) {
    await fs.rm(mainPath, { force: true });
    return;
  }

  // Otherwise delete main + thumb
  const thumbFilename = filename.replace(/\.webp$/, '_thumb.webp');
  const thumbPath = path.join(UPLOAD_DIR, thumbFilename);

  await Promise.all([
    fs.rm(mainPath, { force: true }),
    fs.rm(thumbPath, { force: true }),
  ]);
}
