import { isFulfilled, type Middleware } from '@reduxjs/toolkit';
import { usageReporting } from '@/services/usageReporting';
import type { RootState } from '@/types/store';
import { usageReportingDecided } from '../slices/consentSlice';

interface MutationMeta {
  arg?: { type?: string; endpointName?: string };
}

/**
 * Reports which features are used (successful mutation names only) and
 * only after the user granted consent. Withdrawing consent drops the queue.
 */
export const consentMiddleware: Middleware<object, RootState> = (store) => (next) => (action) => {
  const result = next(action);

  if (usageReportingDecided.match(action) && action.payload === 'denied') {
    usageReporting.clear();
    return result;
  }
  if (store.getState().consent.usageReporting !== 'granted' || !isFulfilled(action)) return result;

  const arg = (action.meta as MutationMeta).arg;
  if (arg?.type === 'mutation' && arg.endpointName) usageReporting.track(arg.endpointName);
  return result;
};
