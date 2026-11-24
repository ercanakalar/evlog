import type { HomeInsights, SpendingInsights } from '@/types/api/models';
import type { SpendingRequest } from '@/types/api/requests';
import { compact, utcOffset } from '../bases/query';
import { baseApi } from '../middlewares/createApi';

export const insightService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHomeInsights: build.query<HomeInsights, void>({
      query: () => ({ url: '/insights/home', params: { utcOffset: utcOffset() } }),
      providesTags: ['Insights'],
    }),
    getSpending: build.query<SpendingInsights, SpendingRequest>({
      query: (arg) => ({ url: '/insights/spending', params: compact({ ...arg }) }),
      providesTags: ['Insights'],
    }),
  }),
});

export const { useGetHomeInsightsQuery, useGetSpendingQuery } = insightService;
