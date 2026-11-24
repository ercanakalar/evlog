import type { Me } from '@/types/api/groceries/models';
import type { UpdateSettingsRequest } from '@/types/api/groceries/requests';
import { groceriesApi } from '@/store/groceries/api';

export const meService = groceriesApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<Me, void>({
      query: () => '/me',
      providesTags: ['Me'],
    }),
    updateSettings: build.mutation<Me, UpdateSettingsRequest>({
      query: (body) => ({ url: '/me/settings', method: 'PATCH', body }),
      // Apply the toggle at once; roll back if the server refuses.
      async onQueryStarted(changes, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          meService.util.updateQueryData('getMe', undefined, (me) => Object.assign(me, changes)),
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(meService.util.upsertQueryData('getMe', undefined, data));
        } catch {
          patch.undo();
        }
      },
    }),
    deleteAccount: build.mutation<void, void>({
      query: () => ({ url: '/me', method: 'DELETE' }),
    }),
  }),
});

export const { useGetMeQuery, useUpdateSettingsMutation, useDeleteAccountMutation } = meService;
