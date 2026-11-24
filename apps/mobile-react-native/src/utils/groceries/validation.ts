import { z } from 'zod';

/**
 * Client-side schemas mirror the API's DTOs so most mistakes are caught before
 * a request. The API validates everything again. Messages are i18n keys.
 */
export const signInSchema = z.object({
  email: z.email('validation.email'),
  password: z.string().min(1, 'validation.required'),
});

export const signUpSchema = z.object({
  email: z.email('validation.email'),
  password: z
    .string()
    .min(8, 'validation.passwordLength')
    .regex(/[a-z]/, 'validation.passwordLower')
    .regex(/[A-Z]/, 'validation.passwordUpper')
    .regex(/\d/, 'validation.passwordDigit')
    .max(128),
});

/** Receipt header on the review screen. */
export const receiptHeaderSchema = z.object({
  merchantName: z.string().trim().min(1, 'validation.required').max(200),
  issuedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'validation.date'),
  total: z.string().trim().regex(/^\d+([.,]\d{1,2})?$/, 'validation.amount'),
});

/** Date printed on a pack. */
export const packDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'validation.date');

export type SignInValues = z.infer<typeof signInSchema>;
export type ReceiptHeaderValues = z.infer<typeof receiptHeaderSchema>;
