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

/**
 * Human-readable text for an error. Network/unknown failures use the
 * translated generic strings; API validation messages are shown as sent.
 */
export function describeError(error: AppError | undefined, t: (key: 'common.offline' | 'common.somethingWrong') => string) {
  if (!error) return '';
  if (error.message === 'offline') return t('common.offline');
  if (error.message === 'somethingWrong') return t('common.somethingWrong');
  return error.messages.length > 1 ? error.messages.join('\n') : error.message;
}
