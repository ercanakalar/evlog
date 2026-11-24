import type { ApplianceType, Upkeep } from '@/types/api/models';
import { transformUpkeep, type NormalizedUpkeep } from '../bases/responseTransform';
import { baseApi } from '../middlewares/createApi';

export const upkeepService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUpkeep: build.query<NormalizedUpkeep, string>({
      query: (homeId) => `/homes/${homeId}/upkeep`,
      transformResponse: (raw: Upkeep) => transformUpkeep(raw),
      providesTags: (_r, _e, homeId) => [{ type: 'Upkeep', id: homeId }],
    }),
    addAppliance: build.mutation<void, { homeId: string; type: ApplianceType; name: string }>({
      query: ({ homeId, ...body }) => ({ url: `/homes/${homeId}/appliances`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { homeId }) => [
        { type: 'Upkeep', id: homeId },
        { type: 'Dashboard', id: homeId },
      ],
    }),
    completeTask: build.mutation<void, { homeId: string; taskId: string }>({
      query: ({ taskId }) => ({ url: `/maintenance-tasks/${taskId}/done`, method: 'POST', body: {} }),
      invalidatesTags: (_r, _e, { homeId }) => [
        { type: 'Upkeep', id: homeId },
        { type: 'Dashboard', id: homeId },
      ],
    }),
  }),
});

export const { useGetUpkeepQuery, useAddApplianceMutation, useCompleteTaskMutation } = upkeepService;
