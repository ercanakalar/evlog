import type { PublishedRating, RatingEligibility } from '@/types/api/models';
import type { SubmitRatingRequest } from '@/types/api/requests';
import { baseApi } from '../middlewares/createApi';

export const ratingService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEligibility: build.query<RatingEligibility, string>({
      query: (homeId) => `/homes/${homeId}/ratings/eligibility`,
      providesTags: (_r, _e, homeId) => [{ type: 'Eligibility', id: homeId }],
    }),
    listRatings: build.query<PublishedRating[], string>({
      query: (homeId) => `/homes/${homeId}/ratings`,
      providesTags: (_r, _e, homeId) => [{ type: 'Rating', id: homeId }],
    }),
    submitRating: build.mutation<void, SubmitRatingRequest>({
      query: ({ homeId, ...body }) => ({ url: `/homes/${homeId}/ratings`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { homeId }) => [
        { type: 'Eligibility', id: homeId },
        { type: 'Rating', id: homeId },
        { type: 'Dashboard', id: homeId },
      ],
    }),
  }),
});

export const { useGetEligibilityQuery, useListRatingsQuery, useSubmitRatingMutation } = ratingService;
