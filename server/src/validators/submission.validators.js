import { z } from 'zod';

/**
 * Honeypot strategy: the `website` field is NOT validated by Zod.
 * It is passed through as an unknown field (using .passthrough() on the outer schema)
 * and checked in the controller. If filled, the controller silently succeeds.
 *
 * This means Zod must not reject the field when it is present.
 */
const baseSubmissionSchema = z
  .object({
    name: z.string().min(1, 'Name is required.').max(150),
    email: z.string().email('Invalid email address.'),
    phone: z.string().max(30).optional().default(''),
    message: z.string().min(5, 'Message is too short.').max(2000),
  })
  .passthrough(); // Allow unknown fields (including `website` honeypot) to pass through

export const contactSchema = baseSubmissionSchema;

export const cateringSchema = baseSubmissionSchema.extend({
  eventDate: z.coerce.date().optional(),
  guestCount: z.coerce.number().int().min(1).max(10000).optional(),
});

export const submissionStatusSchema = z.object({
  status: z.enum(['new', 'read', 'done']),
});

export const submissionQuerySchema = z.object({
  type: z.enum(['contact', 'catering', 'all']).optional().default('all'),
  status: z.enum(['new', 'read', 'done', 'all']).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
