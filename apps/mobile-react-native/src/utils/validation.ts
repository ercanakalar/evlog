import { z } from 'zod';
import { ROOM_LAYOUT_PATTERN } from '@/constants/domain';

/**
 * Client-side schemas mirror the API's DTOs so most mistakes are caught before
 * a request. The API validates everything again. Messages are i18n keys.
 */
export const signInSchema = z.object({
  email: z.email('validation.email'),
  password: z.string().min(1, 'validation.required'),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'validation.required').max(120),
  email: z.email('validation.email'),
  password: z
    .string()
    .min(8, 'validation.passwordLength')
    .regex(/[a-z]/, 'validation.passwordLower')
    .regex(/[A-Z]/, 'validation.passwordUpper')
    .regex(/\d/, 'validation.passwordDigit')
    .max(128),
});

export const homeSchema = z.object({
  city: z.string().trim().min(1, 'validation.required').max(60),
  district: z.string().trim().min(1, 'validation.required').max(60),
  neighborhood: z.string().trim().max(80),
  addressLine: z.string().trim().min(1, 'validation.required').max(250),
  roomLayout: z.string().regex(ROOM_LAYOUT_PATTERN, 'validation.roomLayout'),
  areaM2: z.string().regex(/^(\d{2,5})?$/, 'validation.number'),
});

export const receiptFieldsSchema = z.object({
  merchantName: z.string().trim().max(200),
  issuedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'validation.date')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'validation.date'),
  total: z.string().trim().regex(/^\d+([.,]\d{1,2})?$/, 'validation.amount'),
});

export const brokerSchema = z.object({
  agencyName: z.string().trim().min(1, 'validation.required').max(120),
  email: z.email('validation.email'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type HomeValues = z.infer<typeof homeSchema>;
export type ReceiptFieldsValues = z.infer<typeof receiptFieldsSchema>;
export type BrokerValues = z.infer<typeof brokerSchema>;
