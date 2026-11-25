import type { Dashboard, Me } from '@/types/api/models';
import type { CreateHomeRequest } from '@/types/api/requests';
import { baseApi } from '../middlewares/createApi';

export const homeService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<Me, void>({
      query: () => '/me',
      providesTags: ['Me'],
    }),
    getDashboard: build.query<Dashboard, string>({
      query: (homeId) => `/homes/${homeId}`,
      providesTags: (_r, _e, homeId) => [{ type: 'Dashboard', id: homeId }],
    }),
    /** The caller signs out afterwards, which clears every cached response. */
    deleteAccount: build.mutation<void, void>({
      query: () => ({ url: '/me', method: 'DELETE' }),
    }),
    createHome: build.mutation<{ id: string }, CreateHomeRequest>({
      query: (body) => ({ url: '/homes', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    joinHome: build.mutation<void, string>({
      query: (code) => ({ url: '/tenancies/accept', method: 'POST', body: { code: code.trim().toUpperCase() } }),
      invalidatesTags: ['Me'],
    }),
    inviteTenant: build.mutation<{ inviteCode: string }, { homeId: string; startDate: string }>({
      query: ({ homeId, startDate }) => ({
        url: `/homes/${homeId}/tenancies/invite`,
        method: 'POST',
        body: { startDate },
      }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useGetDashboardQuery,
  useDeleteAccountMutation,
  useCreateHomeMutation,
  useJoinHomeMutation,
  useInviteTenantMutation,
} = homeService;
