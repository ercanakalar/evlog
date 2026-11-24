import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import { env } from '@/config/env';
import type { RootState } from '@/types/store';

/** Plain HTTP layer: base URL, JSON, bearer token. No retry logic here. */
export const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.groceriesApiUrl,
  timeout: 30_000,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).groceriesAuth.accessToken;
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    return headers;
  },
});
