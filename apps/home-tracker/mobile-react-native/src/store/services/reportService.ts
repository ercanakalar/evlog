import type { ReportRequest } from '@/types/api/requests';
import { baseApi } from '../middlewares/createApi';

export const reportService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    sendReport: build.mutation<{ id: string }, ReportRequest>({
      query: (body) => ({ url: '/reports', method: 'POST', body }),
    }),
  }),
});

export const { useSendReportMutation } = reportService;
