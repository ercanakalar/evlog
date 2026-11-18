import { RECEIPTS_PAGE_SIZE } from '@/constants/domain';
import { formDataFile } from '@/services/media/formDataFile';
import type { Receipt } from '@/types/api/models';
import type { ListReceiptsRequest, UpdateReceiptRequest, UploadReceiptRequest } from '@/types/api/requests';
import { cursorPaging, pageQuery } from '../bases/paging';
import { compact } from '../bases/responseTransform';
import { baseApi } from '../middlewares/createApi';

export const receiptService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listReceipts: build.infiniteQuery<Receipt[], ListReceiptsRequest, string | null>({
      infiniteQueryOptions: cursorPaging<Receipt>(RECEIPTS_PAGE_SIZE),
      query: ({ queryArg, pageParam }) => ({
        url: '/receipts',
        params: { ...compact({ ...queryArg }), ...pageQuery(RECEIPTS_PAGE_SIZE, pageParam) },
      }),
      providesTags: [{ type: 'Receipt', id: 'LIST' }],
    }),
    getReceipt: build.query<Receipt, string>({
      query: (id) => `/receipts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Receipt', id }],
    }),
    uploadReceipt: build.mutation<Receipt, UploadReceiptRequest>({
      query: ({ file, kind, homeId }) => {
        const body = new FormData();
        body.append('file', formDataFile(file));
        body.append('kind', kind);
        if (homeId) body.append('homeId', homeId);
        return { url: '/receipts', method: 'POST', body };
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
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Receipt', id }],
    }),
    confirmReceipt: build.mutation<Receipt, string>({
      query: (id) => ({ url: `/receipts/${id}/confirm`, method: 'POST' }),
      // A confirmed receipt feeds the kitchen, tenancy verification and ratings.
      invalidatesTags: (_r, _e, id) => [
        { type: 'Receipt', id },
        { type: 'Receipt', id: 'LIST' },
        'Kitchen',
        'Eligibility',
        'Dashboard',
      ],
    }),
  }),
});

export const {
  useListReceiptsInfiniteQuery,
  useGetReceiptQuery,
  useUploadReceiptMutation,
  useUpdateReceiptMutation,
  useConfirmReceiptMutation,
} = receiptService;
