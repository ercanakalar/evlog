import type { AddedToList, HomeItem, HomeUnit } from '@/types/api/models';
import { baseApi } from '../middlewares/createApi';

/** "At home": products counted in pieces or kilograms; saved receipts raise matching counts. */
export const homeItemService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listHomeItems: build.query<HomeItem[], void>({
      query: () => '/home-items',
      providesTags: ['HomeItem'],
    }),
    /** One product with its brands and pack sizes. */
    getHomeItem: build.query<HomeItem, string>({
      query: (id) => `/home-items/${id}`,
      providesTags: ['HomeItem'],
    }),
    addHomeItem: build.mutation<HomeItem, { name: string; unit: HomeUnit; count?: number }>({
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
        const detail = dispatch(
          homeItemService.util.updateQueryData('getHomeItem', id, (item) => {
            item.count = count;
          }),
        );
        await queryFulfilled.catch(() => {
          patch.undo();
          detail.undo();
        });
      },
    }),
    /** Switching to pieces rounds the amount on the server. */
    setHomeItemUnit: build.mutation<HomeItem, { id: string; unit: HomeUnit }>({
      query: ({ id, unit }) => ({ url: `/home-items/${id}`, method: 'PATCH', body: { unit } }),
      invalidatesTags: ['HomeItem', 'List'],
    }),
    /**
     * Puts the product on the first market list (`newListName` names a new one
     * if there is none). `addedToList` is null when it is already on a list.
     */
    addHomeItemToList: build.mutation<{ addedToList: AddedToList | null }, { id: string; newListName: string }>({
      query: ({ id, newListName }) => ({ url: `/home-items/${id}/shopping-list`, method: 'POST', body: { newListName } }),
      invalidatesTags: ['List'],
    }),
    removeHomeItem: build.mutation<void, string>({
      query: (id) => ({ url: `/home-items/${id}`, method: 'DELETE' }),
      invalidatesTags: ['HomeItem', 'List'],
    }),
  }),
});

export const {
  useListHomeItemsQuery,
  useGetHomeItemQuery,
  useAddHomeItemMutation,
  useSetHomeItemCountMutation,
  useSetHomeItemUnitMutation,
  useAddHomeItemToListMutation,
  useRemoveHomeItemMutation,
} = homeItemService;
