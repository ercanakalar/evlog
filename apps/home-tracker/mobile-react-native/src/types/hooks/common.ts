import type { AppError } from '@/types/api/errors';

/** Common shape returned by screen hooks that load one resource. */
export interface LoadState<T> {
  data: T | undefined;
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | undefined;
  refresh: () => void;
}
