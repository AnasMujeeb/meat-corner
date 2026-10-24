import { z } from 'zod';
import { optionalImageSourceSchema } from './common.validators.js';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  description: z.string().max(500).optional().default(''),
  image: optionalImageSourceSchema,
  order: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const reorderCategoriesSchema = z.object({
  ids: z
    .array(z.string().min(1, 'Each id must be a non-empty string.'))
    .min(1, 'At least one id is required.'),
});
