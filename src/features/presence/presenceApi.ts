import type { PresenceStatus, PresenceUpdatePayload } from '@devhub/shared-types';
import { baseApi, OVERRIDE_ON_HMR } from '../../store/apiBase';
import { unwrap } from '../../store/unwrap';
import { presenceBulkLoaded } from './presenceSlice';

export const presenceApi = baseApi.injectEndpoints({
  overrideExisting: OVERRIDE_ON_HMR,
  endpoints: (builder) => ({
    getStatuses: builder.query<PresenceUpdatePayload[], string[]>({
      query: (userIds) => ({ url: '/presence', params: { userIds: userIds.join(',') } }),
      transformResponse: unwrap<PresenceUpdatePayload[]>,
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(presenceBulkLoaded(data));
      },
    }),
    updateStatus: builder.mutation<
      PresenceUpdatePayload,
      { status: PresenceStatus; customStatus?: string | null }
    >({
      query: (body) => ({ url: '/presence/status', method: 'PATCH', body }),
      transformResponse: unwrap<PresenceUpdatePayload>,
    }),
  }),
});

export const { useGetStatusesQuery, useUpdateStatusMutation } = presenceApi;
