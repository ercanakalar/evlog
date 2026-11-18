import type { KitchenSummary } from '@/types/api/models';
import { transformKitchen } from '../bases/responseTransform';
import { baseApi } from '../middlewares/createApi';

export const kitchenService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getKitchen: build.query<KitchenSummary, string>({
      query: (homeId) => `/homes/${homeId}/kitchen`,
      transformResponse: transformKitchen,
      providesTags: (_r, _e, homeId) => [{ type: 'Kitchen', id: homeId }],
    }),
    addToShoppingList: build.mutation<void, { homeId: string; name: string }>({
      query: ({ homeId, name }) => ({ url: `/homes/${homeId}/shopping-list`, method: 'POST', body: { name } }),
    }),
  }),
});

export const { useGetKitchenQuery, useAddToShoppingListMutation } = kitchenService;
