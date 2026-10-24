import { z } from 'zod';

export const UPLOAD_IMAGE_PATH_RE = /^\/uploads\/[A-Za-z0-9_-]+(_thumb)?\.webp$/;

export function isValidImageUrlOrPath(val) {
  if (typeof val !== 'string') return false;
  if (UPLOAD_IMAGE_PATH_RE.test(val)) return true;
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidAbsoluteUrl(val) {
  if (typeof val !== 'string') return false;
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidVideoUrlOrPath(val) {
  if (typeof val !== 'string') return false;
  if (!val) return true;
  if (/^\/(uploads|videos)\/[A-Za-z0-9_./-]+$/.test(val)) return true;
  return isValidAbsoluteUrl(val);
}

// Required image source: absolute http(s) URL or uploaded path (/uploads/<name>(_thumb)?.webp)
export const imageSourceSchema = z
  .string()
  .max(2000)
  .refine(isValidImageUrlOrPath, {
    message: 'Must be an absolute http(s) URL or an uploaded path (/uploads/*.webp).',
  });

// Optional image source: empty string, or absolute http(s) URL or uploaded path (/uploads/<name>(_thumb)?.webp)
export const optionalImageSourceSchema = z
  .string()
  .max(2000)
  .optional()
  .default('')
  .refine((val) => val === '' || val === null || val === undefined || isValidImageUrlOrPath(val), {
    message: 'Must be an absolute http(s) URL, an uploaded path (/uploads/*.webp), or empty.',
  });

// Optional absolute URL for socials & mapUrl
export const optionalAbsoluteUrlSchema = z
  .string()
  .max(2000)
  .optional()
  .default('')
  .refine((val) => val === '' || val === null || val === undefined || isValidAbsoluteUrl(val), {
    message: 'Must be a valid absolute URL (http:// or https://) or empty.',
  });

// heroVideoUrl: relative /uploads/... or absolute URL or empty
export const heroVideoUrlSchema = z
  .string()
  .max(2000)
  .optional()
  .default('')
  .refine(isValidVideoUrlOrPath, {
    message: 'Must be a valid URL, /uploads/... path, or empty.',
  });
