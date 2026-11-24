import type { BaseQueryFn, FetchArgs } from '@reduxjs/toolkit/query';
import { isExpiringSoon } from '@/services/jwt';
import type { AppError } from '@/types/api/errors';
import type { TokenPair } from '@/types/api/groceries/models';
import type { RootState } from '@/types/store';
import { credentialsReceived, signedOut } from '@/store/groceries/authSlice';
import { rawBaseQuery } from '@/store/groceries/bases/baseQuery';
import { toAppError } from '@/store/bases/errorMapping';

type Api = Parameters<typeof rawBaseQuery>[1];

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, however many requests need it. */
function refreshOnce(api: Api, extraOptions: object): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = (api.getState() as RootState).groceriesAuth.refreshToken;
    if (!refreshToken) return false;
    const result = await rawBaseQuery(
      { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
      api,
      extraOptions,
    );
    if (result.data) {
      const tokens = result.data as TokenPair;
      api.dispatch(credentialsReceived({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }));
      return true;
    }
    // Only a definitive rejection signs the user out; offline keeps the session.
    if (result.error && typeof result.error.status === 'number') api.dispatch(signedOut());
    return false;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/**
 * Wraps the raw query with token refresh: refreshes ahead of expiry, retries
 * once after a 401, and maps every failure to AppError.
 */
export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, AppError> = async (
  args,
  api,
  extraOptions,
) => {
  const { accessToken, refreshToken } = (api.getState() as RootState).groceriesAuth;
  if (accessToken && refreshToken && isExpiringSoon(accessToken)) {
    await refreshOnce(api, extraOptions);
  }

  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && (api.getState() as RootState).groceriesAuth.refreshToken) {
    if (await refreshOnce(api, extraOptions)) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }
  if (result.error) return { error: toAppError(result.error), meta: result.meta };
  return { data: result.data, meta: result.meta };
};
