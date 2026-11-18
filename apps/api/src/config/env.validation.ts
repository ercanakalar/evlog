import { z } from 'zod';

const httpUrl = z.url({ protocol: /^https?$/ });
const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined));

/** Every environment variable the API reads. The app refuses to start if one is invalid. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  PUBLIC_API_URL: httpUrl,
  CORS_ORIGINS: z.string().default(''),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z
    .string()
    .regex(/^\d+[smhd]$/)
    .default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(50).default(12),
  OCR_SERVICE_URL: httpUrl,
  OCR_SERVICE_TOKEN: z.string().min(8),
  OCR_CALLBACK_SECRET: z.string().min(32),
  OCR_TIMEOUT_MS: z.coerce.number().int().min(1000).default(90000),
  RENT_RECEIPTS_TO_VERIFY: z.coerce.number().int().min(1).max(12).default(2),
  SAHIBINDEN_API_URL: optionalString.pipe(httpUrl.optional()),
  SAHIBINDEN_API_KEY: optionalString,
});

export type Env = z.infer<typeof envSchema>;
