import type { HomeItem } from '@/types/api/models';
import { baseApi } from '../middlewares/createApi';

/** "At home": counted products; saved receipts raise matching counts. */
export const homeItemService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listHomeItems: build.query<HomeItem[], void>({
      query: () => '/home-items',
      providesTags: ['HomeItem'],
    }),
    addHomeItem: build.mutation<HomeItem, { name: string; count?: number }>({
      query: (body) => ({ url: '/home-items', method: 'POST', body }),
      invalidatesTags: ['HomeItem', 'List'],
    }),
    /** Optimistic: the count changes on tap, the server catches up. */
    setHomeItemCount: build.mutation<HomeItem, { id: string; count: number }>({
      query: ({ id, count }) => ({ url: `/home-items/${id}`, method: 'PATCH', body: { count } }),
      invalidatesTags: ['List'],
      async onQueryStarted({ id, count }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          homeItemService.util.updateQueryData('listHomeItems', undefined, (items) => {
            const item = items.find((i) => i.id === id);
            if (item) item.count = count;
          }),
        );
        await queryFulfilled.catch(() => patch.undo());
      },
    }),
    removeHomeItem: build.mutation<void, string>({
      query: (id) => ({ url: `/home-items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['HomeItem', 'List'],
    }),
  }),
});

export const {
  useListHomeItemsQuery,
  useAddHomeItemMutation,
  useSetHomeItemCountMutation,
  useRemoveHomeItemMutation,
} = homeItemService;
