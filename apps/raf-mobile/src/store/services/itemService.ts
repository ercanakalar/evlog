import { formDataFile } from '@/services/media/formDataFile';
import type { Category, PackLabelResult, ShelfItem, ShelfItemDetail, UpdatedItem } from '@/types/api/models';
import type { UpdateItemRequest, UploadFile } from '@/types/api/requests';
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
    /** Marking a product used up also lowers at-home counts and can add to a list. */
    updateItem: build.mutation<UpdatedItem, UpdateItemRequest>({
      query: ({ id, ...body }) => ({ url: `/items/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { usedUp }) => [
        { type: 'Item', id: 'LIST' },
        'Insights',
        ...(usedUp === undefined ? [] : (['HomeItem', 'List'] as const)),
      ],
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }));
        if (data) dispatch(itemService.util.upsertQueryData('getItem', id, data));
      },
    }),
    /** Photo of the pack: the reader finds the printed date and it replaces the estimate. */
    readPackLabel: build.mutation<PackLabelResult, { id: string; file: UploadFile }>({
      query: ({ id, file }) => {
        const body = new FormData();
        body.append('file', formDataFile(file));
        return { url: `/items/${id}/label`, method: 'POST', body, timeout: 120_000 };
      },
      invalidatesTags: [{ type: 'Item', id: 'LIST' }, 'Insights'],
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }));
        if (data) dispatch(itemService.util.upsertQueryData('getItem', id, data.item));
      },
    }),
  }),
});

export const { useListShelfQuery, useGetItemQuery, useUpdateItemMutation, useReadPackLabelMutation } = itemService;
