import { fetchBaseQuery } from '@reduxjs/toolkit/query';
import { env } from '@/config/env';
import i18n from '@/i18n';
import type { RootState } from '@/types/store';

/** Plain HTTP layer: base URL, JSON, bearer token. No retry logic here. */
export const rawBaseQuery = fetchBaseQuery({
  baseUrl: env.apiUrl,
  timeout: 30_000,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
    headers.set('Accept', 'application/json');
    // The API names products in this language.
    headers.set('Accept-Language', i18n.language);
    return headers;
  },
});
