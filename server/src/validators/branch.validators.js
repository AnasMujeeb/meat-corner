import { z } from 'zod';
import { optionalAbsoluteUrlSchema } from './common.validators.js';

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  nameAr: z.string().max(100).nullable().optional().transform((v) => (v ? v.trim() : '')),
  address: z.string().max(500).nullable().optional().transform((v) => (v ? v.trim() : '')),
  addressAr: z.string().max(500).nullable().optional().transform((v) => (v ? v.trim() : '')),
  phone: z.string().max(30).optional().default(''),
  mapUrl: optionalAbsoluteUrlSchema,
  openingHours: z.string().max(200).nullable().optional().transform((v) => (v ? v.trim() : '')),
  openingHoursAr: z.string().max(200).nullable().optional().transform((v) => (v ? v.trim() : '')),
  order: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateBranchSchema = createBranchSchema.partial();

export const reorderBranchesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'ids must be a non-empty array.'),
});
