import { z } from 'zod';

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
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  ADMIN_URL: z.string().url('ADMIN_URL must be a valid URL'),
  UPLOAD_DIR: z
    .string()
    .default('uploads')
    .refine(
      (dir) => !dir.replace(/\\/g, '/').split('/').includes('src'),
      'UPLOAD_DIR must not be located within the src/ directory'
    ),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error('❌  Environment validation failed:\n' + errors);
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();
