import type { Listing } from '@/types/api/models';
import type { AddBrokerRequest, UpdateListingRequest } from '@/types/api/requests';
import { baseApi } from '../middlewares/createApi';

export const listingService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listListings: build.query<Listing[], string>({
      query: (homeId) => `/homes/${homeId}/listings`,
      providesTags: (_r, _e, homeId) => [{ type: 'Listing', id: homeId }],
    }),
    linkListing: build.mutation<Listing, { homeId: string; reference: string }>({
      query: ({ homeId, reference }) => ({ url: `/homes/${homeId}/listings`, method: 'POST', body: { reference } }),
      invalidatesTags: (_r, _e, { homeId }) => [
        { type: 'Listing', id: homeId },
        { type: 'Dashboard', id: homeId },
      ],
    }),
    updateListing: build.mutation<Listing, UpdateListingRequest>({
      query: ({ id, changes }) => ({ url: `/listings/${id}`, method: 'PATCH', body: changes }),
      // Optimistic: tick the checkbox immediately, roll back on failure.
      async onQueryStarted({ id, homeId, changes }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          listingService.util.updateQueryData('listListings', homeId, (draft) => {
            const listing = draft.find((l) => l.id === id);
            if (listing) Object.assign(listing, changes);
          }),
        );
        await queryFulfilled.catch(() => patch.undo());
      },
    }),
    addBroker: build.mutation<{ shareUrl: string }, AddBrokerRequest>({
      query: ({ id, agencyName, email }) => ({
        url: `/listings/${id}/brokers`,
        method: 'POST',
        body: { agencyName, email },
      }),
      invalidatesTags: (_r, _e, { homeId }) => [{ type: 'Listing', id: homeId }],
    }),
    sendListingUpdate: build.mutation<{ recipients: number }, { id: string; homeId: string }>({
      query: ({ id }) => ({ url: `/listings/${id}/send-update`, method: 'POST' }),
      invalidatesTags: (_r, _e, { homeId }) => [{ type: 'Listing', id: homeId }],
    }),
  }),
});

export const {
  useListListingsQuery,
  useLinkListingMutation,
  useUpdateListingMutation,
  useAddBrokerMutation,
  useSendListingUpdateMutation,
} = listingService;
