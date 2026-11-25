import type { SerializedError } from '@reduxjs/toolkit';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { AppError } from '@/types/api/errors';

const messagesFrom = (body: unknown): string[] => {
  const message = (body as { message?: unknown } | null | undefined)?.message;
  if (Array.isArray(message)) return message.map(String);
  if (typeof message === 'string') return [message];
  return [];
};

/** Normalises fetch errors and NestJS error bodies into one AppError shape. */
export function toAppError(error: FetchBaseQueryError): AppError {
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return { status: 0, message: 'offline', messages: ['offline'] };
  }
  if (error.status === 'PARSING_ERROR') {
    return { status: error.originalStatus, message: 'somethingWrong', messages: [] };
  }
  if (error.status === 'CUSTOM_ERROR') {
    return { status: 0, message: error.error, messages: [error.error] };
  }
  const messages = messagesFrom(error.data);
  return {
    status: error.status,
    message: messages[0] ?? 'somethingWrong',
    messages,
    body: error.data,
  };
}

export const isAppError = (value: unknown): value is AppError =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as AppError).status === 'number' &&
  Array.isArray((value as AppError).messages);

/** For thunks and `unwrap()` callers: anything thrown becomes an AppError. */
export function asAppError(error: unknown): AppError {
  if (isAppError(error)) return error;
  const serialized = error as SerializedError | undefined;
  return { status: 0, message: serialized?.message ?? 'somethingWrong', messages: [] };
}

/** Codes the API sends with an error; each has a text under `errors`. */
const CODES = [
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'GOOGLE_FAILED',
  'GOOGLE_UNAVAILABLE',
  'RESET_CODE_INVALID',
  'RESET_UNAVAILABLE',
  'RECEIPT_INCOMPLETE',
  'RECEIPT_IN_FUTURE',
  'RECEIPT_NOT_READ',
  'TOO_MANY_READING',
  'WHOLE_PIECES',
] as const;

type ErrorKey =
  | 'common.offline'
  | 'common.somethingWrong'
  | `errors.${(typeof CODES)[number] | 'tooMany' | 'photo' | 'notFound' | 'server'}`;

/** Text for an error in the app's language. The API's own messages are English and not shown. */
export function describeError(error: AppError | undefined, t: (key: ErrorKey) => string): string {
  if (!error) return '';
  if (error.message === 'offline') return t('common.offline');
  const code = CODES.find((c) => c === (error.body as { code?: unknown } | null | undefined)?.code);
  if (code) return t(`errors.${code}`);
  if (error.status === 429) return t('errors.tooMany');
  if (error.status === 413 || error.status === 422) return t('errors.photo');
  if (error.status === 404) return t('errors.notFound');
  if (error.status >= 500) return t('errors.server');
  return t('common.somethingWrong');
}
