import { differenceInMinutes, format, isSameDay, isToday, isTomorrow } from 'date-fns';
import type { Meeting, RsvpResponse } from '@devhub/shared-types';

export const RSVP_LABELS: Record<RsvpResponse, string> = {
  pending: 'Awaiting reply',
  accepted: 'Going',
  tentative: 'Maybe',
  declined: 'Declined',
};

export function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, d MMM');
}

/** "Today · 14:00 – 14:30" */
export function timeRange(meeting: Pick<Meeting, 'startsAt' | 'endsAt'>): string {
  const start = new Date(meeting.startsAt);
  const end = new Date(meeting.endsAt);
  const endLabel = isSameDay(start, end) ? format(end, 'HH:mm') : format(end, 'd MMM HH:mm');
  return `${dayLabel(start)} · ${format(start, 'HH:mm')} – ${endLabel}`;
}

export function durationLabel(meeting: Pick<Meeting, 'startsAt' | 'endsAt'>): string {
  const minutes = differenceInMinutes(new Date(meeting.endsAt), new Date(meeting.startsAt));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Joinable: live now, or scheduled and starting within the next 15 minutes (or already due). */
export function isJoinable(meeting: Meeting, now = Date.now()): boolean {
  if (meeting.status === 'live') return true;
  if (meeting.status !== 'scheduled') return false;
  const start = new Date(meeting.startsAt).getTime();
  const end = new Date(meeting.endsAt).getTime();
  return now >= start - 15 * 60_000 && now < end;
}

export function meetingLink(meetingId: string): string {
  return typeof window === 'undefined'
    ? `/meeting/${meetingId}`
    : `${window.location.origin}/meeting/${meetingId}`;
}

export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
