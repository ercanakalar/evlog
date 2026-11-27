import type { Household } from '@/types/api/models';
import { baseApi, TAG_TYPES } from '../middlewares/createApi';

/** The people who share one home. Joining or leaving changes whose data everything is. */
export const householdService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHousehold: build.query<Household, void>({
      query: () => '/household',
      providesTags: ['Household'],
    }),
    createInvite: build.mutation<Household, void>({
      query: () => ({ url: '/household/invite', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }));
        if (data) dispatch(householdService.util.upsertQueryData('getHousehold', undefined, data));
      },
    }),
    cancelInvite: build.mutation<Household, void>({
      query: () => ({ url: '/household/invite', method: 'DELETE' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled.catch(() => ({ data: undefined }));
        if (data) dispatch(householdService.util.upsertQueryData('getHousehold', undefined, data));
      },
    }),
    joinHousehold: build.mutation<Household, string>({
      query: (code) => ({ url: '/household/join', method: 'POST', body: { code } }),
      invalidatesTags: [...TAG_TYPES],
    }),
    leaveHousehold: build.mutation<Household, void>({
      query: () => ({ url: '/household/leave', method: 'POST' }),
      invalidatesTags: [...TAG_TYPES],
    }),
  }),
});

export const {
  useGetHouseholdQuery,
  useCreateInviteMutation,
  useCancelInviteMutation,
  useJoinHouseholdMutation,
  useLeaveHouseholdMutation,
} = householdService;
