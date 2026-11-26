import { TRIPS_PAGE_SIZE, UPLOAD_RECEIPT_TIMEOUT_MS } from '@/constants/domain';
import { formDataFile } from '@/services/media/formDataFile';
import type { Market, Receipt } from '@/types/api/models';
import type { ListReceiptsRequest, UpdateReceiptRequest, UploadReceiptRequest } from '@/types/api/requests';
import { cursorPaging, pageQuery } from '../bases/paging';
import { compact } from '../bases/query';
import { baseApi } from '../middlewares/createApi';

/** Receipts: a saved (confirmed) receipt is one trip to the market. */
export const receiptService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listReceipts: build.infiniteQuery<Receipt[], ListReceiptsRequest, string | null>({
      infiniteQueryOptions: cursorPaging<Receipt>(TRIPS_PAGE_SIZE),
      query: ({ queryArg, pageParam }) => ({
        url: '/receipts',
        params: { ...compact({ ...queryArg }), ...pageQuery(TRIPS_PAGE_SIZE, pageParam) },
      }),
      providesTags: [{ type: 'Receipt', id: 'LIST' }],
    }),
    /** Being read, waiting for review, or unreadable: newest first. */
    listUnsaved: build.query<Receipt[], void>({
      query: () => ({ url: '/receipts', params: { unsaved: true, take: 20 } }),
      providesTags: [{ type: 'Receipt', id: 'LIST' }],
    }),
    listMarkets: build.query<Market[], void>({
      query: () => '/receipts/markets',
      providesTags: [{ type: 'Receipt', id: 'LIST' }],
    }),
    getReceipt: build.query<Receipt, string>({
      query: (id) => `/receipts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Receipt', id }],
    }),
    uploadReceipt: build.mutation<Receipt, UploadReceiptRequest>({
      query: ({ files }) => {
        const body = new FormData();
        for (const file of files) body.append('files', formDataFile(file));
        // Read in the background; the review screen polls until that is done.
        return { url: '/receipts', method: 'POST', body, timeout: UPLOAD_RECEIPT_TIMEOUT_MS };
      },
      invalidatesTags: [{ type: 'Receipt', id: 'LIST' }],
      // Seed the detail cache so the review screen opens instantly.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }));
        if (data) dispatch(receiptService.util.upsertQueryData('getReceipt', data.id, data));
      },
    }),
    updateReceipt: build.mutation<Receipt, UpdateReceiptRequest>({
      query: ({ id, ...body }) => ({ url: `/receipts/${id}`, method: 'PATCH', body }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }));
        if (data) dispatch(receiptService.util.upsertQueryData('getReceipt', id, data));
      },
    }),
    rescanReceipt: build.mutation<Receipt, string>({
      query: (id) => ({ url: `/receipts/${id}/rescan`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Receipt', id }, { type: 'Receipt', id: 'LIST' }],
    }),
    /** Saving starts every countdown and raises matching at-home counts. */
    confirmReceipt: build.mutation<Receipt, string>({
      query: (id) => ({ url: `/receipts/${id}/confirm`, method: 'POST' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Receipt', id },
        { type: 'Receipt', id: 'LIST' },
        'Item',
        'HomeItem',
        'List',
        'Insights',
        'Me',
      ],
    }),
    deleteReceipt: build.mutation<void, string>({
      query: (id) => ({ url: `/receipts/${id}`, method: 'DELETE' }),
      // Deleting a saved receipt also takes back what it added at home.
      invalidatesTags: [{ type: 'Receipt', id: 'LIST' }, 'Item', 'Insights', 'List', 'Me', 'HomeItem'],
    }),
  }),
});

export const {
  useListReceiptsInfiniteQuery,
  useListUnsavedQuery,
  useListMarketsQuery,
  useGetReceiptQuery,
  useUploadReceiptMutation,
  useUpdateReceiptMutation,
  useRescanReceiptMutation,
  useConfirmReceiptMutation,
  useDeleteReceiptMutation,
} = receiptService;
