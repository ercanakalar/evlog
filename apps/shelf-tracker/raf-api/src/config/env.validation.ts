import { z } from 'zod';

const httpUrl = z.url({ protocol: /^https?$/ });
/** Left out or empty ("NAME=") both mean not set. */
const optional = <T extends z.ZodType>(type: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), type.optional());

/** The example values are public, so a production API must not start with them. */
const SECRETS = ['JWT_ACCESS_SECRET', 'OCR_SERVICE_TOKEN', 'OCR_CALLBACK_SECRET'] as const;
/** Without these a published app has no password reset and no valid legal pages. */
const NEEDED_IN_PRODUCTION = ['SMTP_URL', 'MAIL_FROM', 'LEGAL_OPERATOR', 'SUPPORT_EMAIL'] as const;

/** Every environment variable the API reads. The app refuses to start if one is invalid. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
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
  /** A separate receipt reader to use instead of the built-in one; it needs the two secrets. */
  OCR_SERVICE_URL: optional(httpUrl),
  OCR_SERVICE_TOKEN: optional(z.string().min(8)),
  OCR_CALLBACK_SECRET: optional(z.string().min(32)),
  /** The built-in reader's models (npm run models). */
  OCR_MODEL_DIR: z.string().default('./models'),
  /** CPU threads the built-in reader uses; all of them when not set. */
  OCR_THREADS: optional(z.coerce.number().int().min(1).max(256)),
  OCR_TIMEOUT_MS: z.coerce.number().int().min(1000).default(90000),
  /** OAuth client ids (web, iOS, Android) whose Google ID tokens are accepted. */
  GOOGLE_CLIENT_IDS: z.string().default(''),
  /** Where emails are sent through, e.g. smtps://user:password@smtp.example.com:465. */
  SMTP_URL: optional(z.url({ protocol: /^smtps?$/ })),
  /** Sender of emails, e.g. Raf <no-reply@example.com>. */
  MAIL_FROM: optional(z.string().min(3)),
  /** Who runs Raf (legal name and address) and where users reach them; shown on the legal pages. */
  LEGAL_OPERATOR: optional(z.string().min(2)),
  SUPPORT_EMAIL: optional(z.email()),
}).refine((env) => !env.OCR_SERVICE_URL || (env.OCR_SERVICE_TOKEN && env.OCR_CALLBACK_SECRET), {
  message: 'OCR_SERVICE_URL needs OCR_SERVICE_TOKEN and OCR_CALLBACK_SECRET',
  path: ['OCR_SERVICE_URL'],
}).superRefine((env, ctx) => {
  if (env.NODE_ENV !== 'production') return;
  const issue = (name: string, message: string) => ctx.addIssue({ code: 'custom', path: [name], message });
  for (const name of SECRETS) {
    // The reader's secrets only matter with a separate reader.
    if (name !== 'JWT_ACCESS_SECRET' && !env.OCR_SERVICE_URL) continue;
    if (env[name]?.startsWith('change-me')) issue(name, 'Set a secret of your own in production');
  }
  for (const name of NEEDED_IN_PRODUCTION) {
    if (!env[name]) issue(name, 'Required in production');
  }
});

export type Env = z.infer<typeof envSchema>;
