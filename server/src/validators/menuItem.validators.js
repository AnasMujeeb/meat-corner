import { z } from 'zod';
import { imageSourceSchema } from './common.validators.js';

const optionalNutritionNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const num = Number(val);
  return Number.isNaN(num) ? val : num;
}, z.number({ invalid_type_error: 'Must be a valid number.' }).min(0, 'Must be non-negative.').optional());

const nutritionSchema = z
  .object({
    calories: optionalNutritionNumber,
    fat: optionalNutritionNumber,
    protein: optionalNutritionNumber,
    carbs: optionalNutritionNumber,
    fiber: optionalNutritionNumber,
  })
  .nullable()
  .optional()
  .transform((v) => v ?? {});

const choiceSchema = z.object({
  label: z.string().min(1, 'Choice label is required.'),
  extraPrice: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number({ invalid_type_error: 'Extra price must be a number.' }).min(0).optional().default(0)
  ),
});

const optionSchema = z.object({
  name: z.string().min(1, 'Option group name is required.'),
  type: z.enum(['single', 'multiple']),
  required: z.coerce.boolean().optional().default(false),
  choices: z.array(choiceSchema).min(1, 'Option must have at least one choice.'),
});

const imageSchema = z.object({
  url: imageSourceSchema,
  thumbUrl: imageSourceSchema,
  alt: z.string().optional().default(''),
});

export const createMenuItemSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(200),
  description: z.string().max(1000).nullable().optional().transform((v) => v ?? ''),
  category: z.string().min(1, 'Category ID is required.'),
  price: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ required_error: 'Price is required.', invalid_type_error: 'Price must be a valid number.' }).min(0, 'Price must be non-negative.')
  ),
  images: z.array(imageSchema).nullable().optional().transform((v) => v ?? []),
  nutrition: nutritionSchema,
  allergens: z.array(z.string()).nullable().optional().transform((v) => v ?? []),
  tags: z.array(z.string()).nullable().optional().transform((v) => v ?? []),
  options: z.array(optionSchema).nullable().optional().transform((v) => v ?? []),
  isAvailable: z.coerce.boolean().optional().default(true),
  order: z.coerce.number().int().min(0).optional().default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const menuQuerySchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const adminMenuQuerySchema = menuQuerySchema.extend({
  available: z.enum(['true', 'false', 'all']).optional().default('all'),
});
