'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCan } from '../../../common/rbac/usePermission';
import { useListUpcomingMeetingsQuery } from '../meetingsApi';

const LEAD_MS = 5 * 60_000;
const CHECK_MS = 30_000;

/**
 * "Starts in 5 minutes" nudges for meetings on your calendar. Reads the upcoming list the app
 * already keeps fresh over the socket, so reminders cost no extra requests.
 */
export function MeetingReminders() {
  const router = useRouter();
  const allowed = useCan('meeting:read');
  const { data: upcoming } = useListUpcomingMeetingsQuery(undefined, { skip: !allowed });
  const reminded = useRef(new Set<string>());

  useEffect(() => {
    if (!upcoming) return;
    const check = () => {
      const now = Date.now();
      for (const meeting of upcoming) {
        if (meeting.status !== 'scheduled') continue;
        const startsIn = new Date(meeting.startsAt).getTime() - now;
        // A key per start time, so a rescheduled meeting reminds again.
        const key = `${meeting.id}:${meeting.startsAt}`;
        if (startsIn > LEAD_MS || startsIn < -60_000 || reminded.current.has(key)) continue;
        reminded.current.add(key);
        toast(
          startsIn > 60_000
            ? `${meeting.title} starts in ${Math.round(startsIn / 60_000)} min`
            : `${meeting.title} is starting`,
          {
            duration: 20_000,
            action: { label: 'Join', onClick: () => router.push(`/meeting/${meeting.id}`) },
          },
        );
      }
    };
    check();
    const timer = setInterval(check, CHECK_MS);
    return () => clearInterval(timer);
  }, [upcoming, router]);

  return null;
}
