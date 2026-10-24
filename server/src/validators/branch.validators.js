import { z } from 'zod';
import { optionalAbsoluteUrlSchema } from './common.validators.js';

export const createBranchSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  address: z.string().max(500).optional().default(''),
  phone: z.string().max(30).optional().default(''),
  mapUrl: optionalAbsoluteUrlSchema,
  openingHours: z.string().max(200).optional().default(''),
  order: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateBranchSchema = createBranchSchema.partial();

export const reorderBranchesSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'ids must be a non-empty array.'),
});
