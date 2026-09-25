'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight, Megaphone, Mic, Video } from 'lucide-react';
import type { Announcement, Meeting } from '@devhub/shared-types';
import { Topbar } from '../../common/components/Topbar';
import { Button } from '../../common/components/Button';
import { useCan } from '../../common/rbac/usePermission';
import { cn } from '../../common/lib/cn';
import { useGetCalendarQuery, useListMeetingInvitationsQuery } from '../meetings/meetingsApi';
import { dayLabel, durationLabel } from '../meetings/meetingFormat';
import { MeetingStatusBadge } from '../meetings/components/MeetingCard';
import { MeetingDetailsDialog, RsvpButtons } from '../meetings/components/MeetingDetailsDialog';
import { ScheduleMeetingDialog } from '../meetings/components/ScheduleMeetingDialog';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayKey = (date: Date) => format(date, 'yyyy-MM-dd');

type Filter = 'all' | 'meetings' | 'announcements';

/** Calendar days a meeting touches (usually one; long meetings can cross midnight). */
function daysOf(meeting: Meeting): string[] {
  const keys: string[] = [];
  const end = new Date(meeting.endsAt);
  for (let day = new Date(meeting.startsAt); day < end; day = addDays(day, 1)) {
    keys.push(dayKey(day));
    if (keys.length > 2) break;
  }
  return keys.length > 0 ? keys : [dayKey(new Date(meeting.startsAt))];
}

function MeetingChip({ meeting, onOpen }: { meeting: Meeting; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn(
        'flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium',
        meeting.status === 'live'
          ? 'bg-busy/20 text-busy'
          : meeting.myRsvp === 'tentative'
            ? 'border border-dashed border-primary/50 text-primary'
            : 'bg-primary/15 text-primary',
      )}
      title={meeting.title}
    >
      <span className="shrink-0 tabular-nums">{format(new Date(meeting.startsAt), 'HH:mm')}</span>
      <span className="truncate">{meeting.title}</span>
    </button>
  );
}

/**
 * Your calendar: only meetings you host or said yes/maybe to, plus announcements from broadcast
 * channels you're in. Invitations you haven't answered wait in their own list.
 */
export function CalendarView() {
  const router = useRouter();
  const canSchedule = useCan('meeting:create');
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [filter, setFilter] = useState<Filter>('all');
  const [openMeetingId, setOpenMeetingId] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // The visible grid: whole weeks covering the month (at most 6 weeks, well under the API cap).
  const { days, range } = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const list: Date[] = [];
    for (let day = start; day <= end; day = addDays(day, 1)) list.push(day);
    return { days: list, range: { from: start.toISOString(), to: addDays(end, 1).toISOString() } };
  }, [month]);
  const { data, isFetching } = useGetCalendarQuery(range);
  const { data: invitations = [] } = useListMeetingInvitationsQuery();

  const { meetingsByDay, announcementsByDay } = useMemo(() => {
    const meetings = new Map<string, Meeting[]>();
    const announcements = new Map<string, Announcement[]>();
    for (const meeting of data?.meetings ?? []) {
      for (const key of daysOf(meeting)) meetings.set(key, [...(meetings.get(key) ?? []), meeting]);
    }
    for (const post of data?.announcements ?? []) {
      const key = dayKey(new Date(post.createdAt));
      announcements.set(key, [...(announcements.get(key) ?? []), post]);
    }
    return { meetingsByDay: meetings, announcementsByDay: announcements };
  }, [data]);

  const showMeetings = filter !== 'announcements';
  const showAnnouncements = filter !== 'meetings';
  const selectedKey = dayKey(selectedDay);
  const dayMeetings = showMeetings ? (meetingsByDay.get(selectedKey) ?? []) : [];
  const dayAnnouncements = showAnnouncements ? (announcementsByDay.get(selectedKey) ?? []) : [];
  const openMeeting =
    [...(data?.meetings ?? []), ...invitations].find((m) => m.id === openMeetingId) ?? null;

  const goToMonth = (next: Date) => {
    setMonth(startOfMonth(next));
    setSelectedDay(isSameMonth(next, new Date()) ? new Date() : startOfMonth(next));
  };

  return (
    <>
      <Topbar title="Calendar">
        {canSchedule && (
          <Button size="sm" onClick={() => setScheduleOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </Button>
        )}
      </Topbar>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        {/* Month grid */}
        <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5 lg:overflow-y-auto">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-lg font-semibold text-text">
              {format(month, 'MMMM yyyy')}
            </h2>
            <div className="flex rounded-lg bg-bg-hover p-0.5 text-xs font-medium">
              {(['all', 'meetings', 'announcements'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFilter(id)}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 capitalize transition-colors',
                    filter === id
                      ? 'bg-bg-elevated text-text shadow'
                      : 'text-text-muted hover:text-text',
                  )}
                >
                  {id}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => goToMonth(addMonths(month, -1))}
                className="rounded-lg p-2 text-text-muted hover:bg-bg-hover hover:text-text"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goToMonth(new Date())}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-text hover:bg-bg-hover"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => goToMonth(addMonths(month, 1))}
                className="rounded-lg p-2 text-text-muted hover:bg-bg-hover hover:text-text"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={cn(
              'grid grid-cols-7 overflow-hidden rounded-2xl border border-border bg-border/60 transition-opacity',
              isFetching && 'opacity-70',
            )}
            style={{ gap: 1 }}
          >
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="bg-bg-elevated py-2 text-center text-[11px] font-semibold tracking-wide text-text-muted uppercase"
              >
                {d}
              </div>
            ))}
            {days.map((day) => {
              const key = dayKey(day);
              const meetings = showMeetings ? (meetingsByDay.get(key) ?? []) : [];
              const posts = showAnnouncements ? (announcementsByDay.get(key) ?? []) : [];
              const selected = isSameDay(day, selectedDay);
              const extra = Math.max(0, meetings.length - 2);
              return (
                <div
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedDay(day)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedDay(day)}
                  className={cn(
                    'flex min-h-16 cursor-pointer flex-col gap-1 bg-bg-elevated p-1 text-left transition-colors sm:min-h-24 sm:p-1.5',
                    !isSameMonth(day, month) && 'bg-bg/60 text-text-muted',
                    selected ? 'ring-2 ring-primary ring-inset' : 'hover:bg-bg-hover',
                  )}
                  aria-label={format(day, 'EEEE d MMMM')}
                  aria-pressed={selected}
                >
                  <span className="flex items-center justify-between">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                        isToday(day) ? 'bg-primary text-primary-foreground' : 'text-text',
                        !isSameMonth(day, month) && !isToday(day) && 'text-text-muted',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {posts.length > 0 && (
                      <span
                        className="flex items-center gap-0.5 text-[10px] font-semibold text-accent"
                        title={`${posts.length} announcement${posts.length > 1 ? 's' : ''}`}
                      >
                        <Megaphone className="h-3 w-3" />
                        {posts.length > 1 && posts.length}
                      </span>
                    )}
                  </span>
                  {/* Phones get dots; wider screens get titles. */}
                  <span className="flex flex-wrap gap-0.5 sm:hidden">
                    {meetings.slice(0, 4).map((m) => (
                      <span
                        key={m.id}
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          m.status === 'live' ? 'bg-busy' : 'bg-primary',
                        )}
                      />
                    ))}
                  </span>
                  <span className="hidden flex-col gap-0.5 sm:flex">
                    {meetings.slice(0, 2).map((meeting) => (
                      <MeetingChip
                        key={meeting.id}
                        meeting={meeting}
                        onOpen={() => setOpenMeetingId(meeting.id)}
                      />
                    ))}
                    {extra > 0 && (
                      <span className="px-1.5 text-[11px] text-text-muted">+{extra} more</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agenda for the selected day */}
        <aside className="flex w-full shrink-0 flex-col gap-5 border-t border-border p-4 sm:p-5 lg:w-96 lg:overflow-y-auto lg:border-t-0 lg:border-l">
          {invitations.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
                Waiting for your reply · {invitations.length}
              </h3>
              <ul className="flex flex-col gap-2">
                {invitations.slice(0, 5).map((meeting) => (
                  <li
                    key={meeting.id}
                    className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenMeetingId(meeting.id)}
                      className="block w-full text-left"
                    >
                      <span className="block truncate text-sm font-medium text-text">
                        {meeting.title}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {dayLabel(new Date(meeting.startsAt))} ·{' '}
                        {format(new Date(meeting.startsAt), 'HH:mm')}
                      </span>
                    </button>
                    <div className="mt-2">
                      <RsvpButtons meeting={meeting} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">
                {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE, d MMMM')}
              </h3>
              {canSchedule && (
                <button
                  type="button"
                  onClick={() => setScheduleOpen(true)}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  + Add
                </button>
              )}
            </div>

            {dayMeetings.length === 0 && dayAnnouncements.length === 0 && (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-text-muted">
                Nothing on this day.
              </p>
            )}

            <ul className="flex flex-col gap-2">
              {dayMeetings.map((meeting) => {
                const Icon = meeting.media === 'audio' ? Mic : Video;
                return (
                  <li key={meeting.id}>
                    <button
                      type="button"
                      onClick={() => setOpenMeetingId(meeting.id)}
                      className={cn(
                        'flex w-full gap-3 rounded-xl border p-3 text-left transition-colors hover:bg-bg-hover',
                        meeting.status === 'live' ? 'border-busy/40' : 'border-border',
                      )}
                    >
                      <span className="w-12 shrink-0 text-xs text-text-muted tabular-nums">
                        {format(new Date(meeting.startsAt), 'HH:mm')}
                        <span className="block">{durationLabel(meeting)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate text-sm font-medium text-text">
                            {meeting.title}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                          <MeetingStatusBadge meeting={meeting} />
                          {meeting.myRsvp === 'tentative' && <span>Maybe</span>}
                          {meeting.participants.length} people
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
              {dayAnnouncements.map((post) => (
                <li key={post.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/chat/${post.conversationId}`)}
                    className="flex w-full gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3 text-left transition-colors hover:bg-accent/10"
                  >
                    <span className="w-12 shrink-0 text-xs text-text-muted tabular-nums">
                      {format(new Date(post.createdAt), 'HH:mm')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                        <Megaphone className="h-3.5 w-3.5" />
                        <span className="truncate">{post.conversationName}</span>
                      </span>
                      <span className="mt-1 line-clamp-3 block text-sm text-text">{post.body}</span>
                      <span className="mt-1 block text-xs text-text-muted">{post.senderName}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <MeetingDetailsDialog
        meeting={openMeeting}
        open={Boolean(openMeeting)}
        onClose={() => setOpenMeetingId(null)}
      />
      <ScheduleMeetingDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        initialDate={selectedDay}
      />
    </>
  );
}
