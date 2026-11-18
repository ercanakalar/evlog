import type { ConditionPhoto, ConditionSession, ConditionSessionDetail } from '@/types/api/models';
import type { AddPhotoRequest, SessionActionRequest, StartSessionRequest } from '@/types/api/requests';
import { baseApi } from '../middlewares/createApi';

export const conditionRecordService = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listSessions: build.query<ConditionSession[], string>({
      query: (homeId) => `/homes/${homeId}/condition-sessions`,
      providesTags: (_r, _e, homeId) => [{ type: 'ConditionSession', id: `LIST-${homeId}` }],
    }),
    getSession: build.query<ConditionSessionDetail, string>({
      query: (sessionId) => `/condition-sessions/${sessionId}`,
      providesTags: (_r, _e, id) => [{ type: 'ConditionSession', id }],
    }),
    startSession: build.mutation<ConditionSession, StartSessionRequest>({
      query: ({ homeId, type }) => ({ url: `/homes/${homeId}/condition-sessions`, method: 'POST', body: { type } }),
      invalidatesTags: (_r, _e, { homeId }) => [
        { type: 'ConditionSession', id: `LIST-${homeId}` },
        { type: 'Dashboard', id: homeId },
      ],
    }),
    addPhoto: build.mutation<ConditionPhoto, AddPhotoRequest>({
      query: ({ sessionId, room, file }) => {
        const body = new FormData();
        // React Native's FormData takes { uri, name, type } for files.
        body.append('file', file as unknown as Blob);
        body.append('room', room);
        body.append('capturedAt', new Date().toISOString());
        return { url: `/condition-sessions/${sessionId}/photos`, method: 'POST', body };
      },
      invalidatesTags: (_r, _e, { sessionId }) => [{ type: 'ConditionSession', id: sessionId }],
    }),
    sessionAction: build.mutation<ConditionSession, SessionActionRequest>({
      query: ({ sessionId, action }) => ({ url: `/condition-sessions/${sessionId}/${action}`, method: 'POST' }),
      invalidatesTags: (_r, _e, { sessionId, homeId }) => [
        { type: 'ConditionSession', id: sessionId },
        { type: 'ConditionSession', id: `LIST-${homeId}` },
        { type: 'Dashboard', id: homeId },
        'Eligibility',
      ],
    }),
  }),
});

export const {
  useListSessionsQuery,
  useGetSessionQuery,
  useStartSessionMutation,
  useAddPhotoMutation,
  useSessionActionMutation,
} = conditionRecordService;
