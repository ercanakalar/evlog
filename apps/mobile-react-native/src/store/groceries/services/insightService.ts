import type { HomeInsights, SpendingInsights } from '@/types/api/groceries/models';
import type { SpendingRequest } from '@/types/api/groceries/requests';
import { compact, utcOffset } from '@/store/bases/query';
import { groceriesApi } from '@/store/groceries/api';

export const insightService = groceriesApi.injectEndpoints({
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
