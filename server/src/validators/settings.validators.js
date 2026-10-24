import { z } from 'zod';
import { isValidImageUrlOrPath, isValidAbsoluteUrl, isValidVideoUrlOrPath } from './common.validators.js';

function isValidWhatsapp(val) {
  if (val === undefined || val === '') return true;
  if (isValidAbsoluteUrl(val)) return true;
  if (/^wa\.me\/[0-9]+$/i.test(val.trim())) return true;
  if (/^\+?[0-9\s\-()]{6,30}$/.test(val.trim())) return true;
  return false;
}

const optionalUpdateSocialUrl = z
  .string()
  .max(2000)
  .optional()
  .refine((val) => val === undefined || val === '' || isValidAbsoluteUrl(val), {
    message: 'Must be a valid absolute URL (http:// or https://) or empty.',
  });

const optionalUpdateWhatsapp = z
  .string()
  .max(100)
  .optional()
  .refine(isValidWhatsapp, {
    message: 'Must be a valid URL, wa.me link, phone number, or empty.',
  });

const optionalUpdateImage = z
  .string()
  .max(2000)
  .optional()
  .refine((val) => val === undefined || val === '' || isValidImageUrlOrPath(val), {
    message: 'Must be an absolute http(s) URL, an uploaded path (/uploads/*.webp), or empty.',
  });

const optionalUpdateVideo = z
  .string()
  .max(2000)
  .optional()
  .refine((val) => val === undefined || val === '' || isValidVideoUrlOrPath(val), {
    message: 'Must be a valid URL, /uploads/... path, or empty.',
  });

const socialsSchema = z
  .object({
    instagram: optionalUpdateSocialUrl,
    tiktok: optionalUpdateSocialUrl,
    whatsapp: optionalUpdateWhatsapp,
    talabat: optionalUpdateSocialUrl,
    snoonu: optionalUpdateSocialUrl,
  })
  .partial()
  .optional();

export const updateSettingsSchema = z.object({
  brandName: z.string().min(1).max(100).optional(),
  logo: optionalUpdateImage,
  // heroVideoUrl: optionalUpdateVideo, // Temporarily disabled — uncomment when needed
  // heroPoster: optionalUpdateImage,   // Temporarily disabled — uncomment when needed
  socials: socialsSchema,
  'socials.instagram': optionalUpdateSocialUrl,
  'socials.tiktok': optionalUpdateSocialUrl,
  'socials.whatsapp': optionalUpdateWhatsapp,
  'socials.talabat': optionalUpdateSocialUrl,
  'socials.snoonu': optionalUpdateSocialUrl,
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.union([
    z.string().email().max(150),
    z.literal(''),
  ]).optional(),
  aboutText: z.string().max(5000).optional(),
});