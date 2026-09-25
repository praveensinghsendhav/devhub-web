import type {
  Announcement,
  CreateMeetingRequest,
  Meeting,
  RsvpRequest,
  UpdateMeetingRequest,
} from '@devhub/shared-types';
import { baseApi, OVERRIDE_ON_HMR } from '../../store/apiBase';
import { unwrap } from '../../store/unwrap';

type MeetingArg = { meetingId: string };

export interface CalendarData {
  meetings: Meeting[];
  announcements: Announcement[];
}

/**
 * Every meeting query shares one tag: a MEETING_CHANGED socket event invalidates it, so lists,
 * the calendar and open meeting details all refresh together without polling.
 */
export const meetingsApi = baseApi.injectEndpoints({
  overrideExisting: OVERRIDE_ON_HMR,
  endpoints: (builder) => ({
    getCalendar: builder.query<CalendarData, { from: string; to: string }>({
      query: (params) => ({ url: '/meetings/calendar', params }),
      transformResponse: unwrap<CalendarData>,
      providesTags: ['Meetings'],
    }),
    listUpcomingMeetings: builder.query<Meeting[], void>({
      query: () => ({ url: '/meetings/upcoming' }),
      transformResponse: unwrap<Meeting[]>,
      providesTags: ['Meetings'],
    }),
    listMeetingInvitations: builder.query<Meeting[], void>({
      query: () => ({ url: '/meetings/invitations' }),
      transformResponse: unwrap<Meeting[]>,
      providesTags: ['Meetings'],
    }),
    getMeeting: builder.query<Meeting, string>({
      query: (meetingId) => ({ url: `/meetings/${meetingId}` }),
      transformResponse: unwrap<Meeting>,
      providesTags: ['Meetings'],
    }),

    createMeeting: builder.mutation<Meeting, CreateMeetingRequest>({
      query: (body) => ({ url: '/meetings', method: 'POST', body }),
      transformResponse: unwrap<Meeting>,
      invalidatesTags: ['Meetings'],
    }),
    updateMeeting: builder.mutation<Meeting, MeetingArg & UpdateMeetingRequest>({
      query: ({ meetingId, ...body }) => ({ url: `/meetings/${meetingId}`, method: 'PATCH', body }),
      transformResponse: unwrap<Meeting>,
      invalidatesTags: ['Meetings'],
    }),
    cancelMeeting: builder.mutation<Meeting, MeetingArg>({
      query: ({ meetingId }) => ({ url: `/meetings/${meetingId}/cancel`, method: 'POST' }),
      transformResponse: unwrap<Meeting>,
      invalidatesTags: ['Meetings'],
    }),
    inviteToMeeting: builder.mutation<Meeting, MeetingArg & { userIds: string[] }>({
      query: ({ meetingId, userIds }) => ({
        url: `/meetings/${meetingId}/invite`,
        method: 'POST',
        body: { userIds },
      }),
      transformResponse: unwrap<Meeting>,
      invalidatesTags: ['Meetings'],
    }),
    respondToMeeting: builder.mutation<Meeting, MeetingArg & RsvpRequest>({
      query: ({ meetingId, response }) => ({
        url: `/meetings/${meetingId}/rsvp`,
        method: 'POST',
        body: { response },
      }),
      transformResponse: unwrap<Meeting>,
      invalidatesTags: ['Meetings'],
    }),
    removeMeetingParticipant: builder.mutation<Meeting, MeetingArg & { userId: string }>({
      query: ({ meetingId, userId }) => ({
        url: `/meetings/${meetingId}/participants/${userId}`,
        method: 'DELETE',
      }),
      transformResponse: unwrap<Meeting>,
      invalidatesTags: ['Meetings'],
    }),
  }),
});

export const {
  useGetCalendarQuery,
  useListUpcomingMeetingsQuery,
  useListMeetingInvitationsQuery,
  useGetMeetingQuery,
  useCreateMeetingMutation,
  useUpdateMeetingMutation,
  useCancelMeetingMutation,
  useInviteToMeetingMutation,
  useRespondToMeetingMutation,
  useRemoveMeetingParticipantMutation,
} = meetingsApi;
