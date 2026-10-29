import { z } from 'zod';
import { optionalImageSourceSchema } from './common.validators.js';

export const createOptionLibraryItemSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100),
  category: z.enum(['sauce', 'side', 'other']).default('sauce'),
  image: z
    .object({
      url: optionalImageSourceSchema,
      thumbUrl: optionalImageSourceSchema,
    })
    .optional()
    .default({ url: '', thumbUrl: '' }),
  price: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number({ invalid_type_error: 'Price must be a number.' }).min(0).optional().default(0)
  ),
  isAvailable: z.coerce.boolean().optional().default(true),
  order: z.coerce.number().int().min(0).optional().default(0),
});

export const updateOptionLibraryItemSchema = createOptionLibraryItemSchema.partial();
