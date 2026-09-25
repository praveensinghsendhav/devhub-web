'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { MeetingMedia } from '@devhub/shared-types';
import { extractErrorMessage } from '../../store/apiBase';
import { useCreateMeetingMutation } from './meetingsApi';

/** Starts an instant call: creates it (which rings everyone) and opens the call screen. */
export function useStartCall() {
  const router = useRouter();
  const [createMeeting, state] = useCreateMeetingMutation();

  const startCall = useCallback(
    async (params: { userIds: string[]; title: string; media?: MeetingMedia }) => {
      try {
        const meeting = await createMeeting({
          kind: 'instant',
          title: params.title,
          media: params.media ?? 'video',
          inviteeIds: params.userIds,
        }).unwrap();
        // You started it, so skip the pre-join screen and go straight in.
        router.push(`/meeting/${meeting.id}?autojoin=1`);
        return meeting;
      } catch (error) {
        toast.error(extractErrorMessage(error));
        return null;
      }
    },
    [createMeeting, router],
  );

  return { startCall, isStarting: state.isLoading };
}
