import type { Category, ShelfItem, ShelfItemDetail } from '@/types/api/models';
import type { UpdateItemRequest } from '@/types/api/requests';
import { compact } from '../bases/query';
import { baseApi } from '../middlewares/createApi';

/** The shelf: products from saved receipts with their countdown. */
export const itemService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listShelf: build.query<ShelfItem[], { category?: Category } | void>({
      query: (arg) => ({ url: '/items', params: compact({ category: arg?.category }) }),
      providesTags: [{ type: 'Item', id: 'LIST' }],
    }),
    getItem: build.query<ShelfItemDetail, string>({
      query: (id) => `/items/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Item', id }],
    }),
    updateItem: build.mutation<ShelfItemDetail, UpdateItemRequest>({
      query: ({ id, ...body }) => ({ url: `/items/${id}`, method: 'PATCH', body }),
      invalidatesTags: [{ type: 'Item', id: 'LIST' }, 'Insights'],
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }));
        if (data) dispatch(itemService.util.upsertQueryData('getItem', id, data));
      },
    }),
  }),
});

export const { useListShelfQuery, useGetItemQuery, useUpdateItemMutation } = itemService;
