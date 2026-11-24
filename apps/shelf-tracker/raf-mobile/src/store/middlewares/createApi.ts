import { buildCreateApi, coreModule, reactHooksModule } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../bases/baseQueryWithReauth';

/** RTK Query's createApi with the React hooks module, built explicitly. */
const createApiWithHooks = buildCreateApi(coreModule(), reactHooksModule());

export const TAG_TYPES = ['Me', 'Receipt', 'Item', 'HomeItem', 'List', 'Insights'] as const;

/**
 * The single API slice every service injects into. App-wide defaults live
 * here: re-authenticating base query, cache lifetime, refetch on focus and
 * reconnect (wired to AppState in store/index).
 */
export const baseApi = createApiWithHooks({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: TAG_TYPES,
  keepUnusedDataFor: 120,
  refetchOnReconnect: true,
  refetchOnFocus: true,
  endpoints: () => ({}),
});
