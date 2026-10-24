import { z } from 'zod';

const commaSeparatedUrls = z.string().refine(
  (val) =>
    val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .every((s) => {
        try {
          new URL(s);
          return true;
        } catch {
          return false;
        }
      }),
  { message: 'Must be a valid URL or comma-separated list of valid URLs' }
);

const envSchema = z.object({
  PORT: z
    .string()
    .default('5000')
    .transform(Number)
    .refine((n) => n > 0 && n < 65536, 'PORT must be a valid port number'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().url('MONGODB_URI must be a valid URI'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: commaSeparatedUrls,
  ADMIN_URL: commaSeparatedUrls,
  UPLOAD_DIR: z
    .string()
    .default('uploads')
    .refine(
      (dir) => !dir.replace(/\\/g, '/').split('/').includes('src'),
      'UPLOAD_DIR must not be located within the src/ directory'
    ),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${errors}`);
  }

  return result.data;
}

export const env = validateEnv();
