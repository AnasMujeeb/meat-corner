import multer from 'multer';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { createError } from '../middleware/errorHandler.js';
import { saveImage, deleteImage } from '../services/storage.js';
import { env } from '../config/env.js';

// ─── Multer configuration ─────────────────────────────────────────────────────

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (Vercel body limit is 4.5 MB)

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      createError(
        400,
        `Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, GIF, AVIF.`
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// ─── Strict upload-URL allowlist regex ────────────────────────────────────────
//
// A valid url produced by saveImage looks like:
//   /uploads/img_<timestamp>_<hex>.webp
//   /uploads/img_<timestamp>_<hex>_thumb.webp
//
// We accept ONLY this form — no percent-encoding, no extra segments, no dots
// in the basename other than the final ".webp".
//
const SAFE_UPLOAD_URL_RE = /^\/uploads\/[A-Za-z0-9_-]+\.webp$/;

/**
 * Validate a url string intended for deletion.
 * Throws 400 if the url doesn't match the strict allowlist.
 * Returns the absolute filesystem path of the file.
 */
function resolveUploadUrl(url) {
  if (!url || typeof url !== 'string') {
    throw createError(400, 'url is required.');
  }

  // Decode percent-encoding once, then re-validate the decoded form.
  // This catches %2e%2e, %2f, %5c, %00, etc.
  let decoded;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    throw createError(400, 'url contains invalid percent-encoding.');
  }

  // Strict allowlist on the decoded value
  if (!SAFE_UPLOAD_URL_RE.test(decoded)) {
    throw createError(
      400,
      'url must match /uploads/<name>.webp where <name> contains only letters, digits, underscores, and hyphens.'
    );
  }

  // Build and verify the filesystem path
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  // path.basename on the already-validated decoded string is now safe
  const filename = path.basename(decoded);
  const targetPath = path.resolve(path.join(uploadDir, filename));

  // Final containment check (defence in depth)
  if (!targetPath.startsWith(uploadDir + path.sep) && targetPath !== uploadDir) {
    throw createError(400, 'Path traversal detected.');
  }

  return targetPath;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/admin/upload
 * Accepts a single image file (field name: "image"), processes it via sharp,
 * and returns { url, thumbUrl }.
 */
export const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw createError(400, 'No image file provided.');
  }

  // Generate a URL-safe unique base name using Node built-in crypto
  const randomSuffix = randomBytes(6).toString('hex'); // 12 hex chars
  const baseName = `img_${Date.now()}_${randomSuffix}`;

  const { url, thumbUrl } = await saveImage(req.file.buffer, baseName);

  res.status(201).json({ success: true, data: { url, thumbUrl } });
});

/**
 * DELETE /api/admin/upload
 * Body: { url: string }
 * Deletes an uploaded image + its thumb from disk.
 * Only allows paths matching the strict SAFE_UPLOAD_URL_RE allowlist.
 */
export const deleteUpload = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    throw createError(400, 'url is required.');
  }

  // Handle Blob / remote URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      new URL(url);
    } catch {
      throw createError(400, 'Invalid image URL.');
    }
    await deleteImage(url);
    return res.json({ success: true, message: 'Image deleted.' });
  }

  // resolveUploadUrl throws 400 for any invalid/traversal url
  const targetPath = resolveUploadUrl(url);

  // Return 404 if the file does not exist (don't silently succeed)
  try {
    await fs.access(targetPath);
  } catch {
    throw createError(404, 'File not found.');
  }

  await deleteImage(url);

  res.json({ success: true, message: 'Image deleted.' });
});
