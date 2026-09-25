'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarDays, CalendarPlus, Gauge, Lock, Phone, Video } from 'lucide-react';
import type { Meeting } from '@devhub/shared-types';
import { Topbar } from '../../../common/components/Topbar';
import { Button } from '../../../common/components/Button';
import { Can } from '../../../common/rbac/Can';
import { useListMeetingInvitationsQuery, useListUpcomingMeetingsQuery } from '../meetingsApi';
import { dayLabel } from '../meetingFormat';
import { MeetingCard } from './MeetingCard';
import { MeetingDetailsDialog, RsvpButtons } from './MeetingDetailsDialog';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { StartCallDialog } from './StartCallDialog';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-text-muted uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

const FEATURES = [
  {
    icon: Gauge,
    title: 'Works on slow networks',
    text: 'Quality adapts per person; Data saver and Audio only are one tap away.',
  },
  {
    icon: Lock,
    title: 'Private by design',
    text: 'Media is encrypted browser-to-browser. Only invited people can join.',
  },
  {
    icon: CalendarDays,
    title: 'Your calendar only',
    text: 'Only meetings you accept show up on your calendar.',
  },
];

export function MeetingsHome() {
  const { data: upcoming = [], isLoading } = useListUpcomingMeetingsQuery();
  const { data: invitations = [] } = useListMeetingInvitationsQuery();
  const [callOpen, setCallOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const live = upcoming.filter((m) => m.status === 'live');
  const liveInvites = invitations.filter((m) => m.status === 'live');
  const pendingInvites = invitations.filter((m) => m.status !== 'live');

  const byDay = useMemo(() => {
    const groups = new Map<string, Meeting[]>();
    for (const meeting of upcoming.filter((m) => m.status === 'scheduled')) {
      const key = format(new Date(meeting.startsAt), 'yyyy-MM-dd');
      groups.set(key, [...(groups.get(key) ?? []), meeting]);
    }
    return [...groups.entries()];
  }, [upcoming]);

  const selected = [...upcoming, ...invitations].find((m) => m.id === selectedId) ?? null;
  const empty = !isLoading && upcoming.length === 0 && invitations.length === 0;

  return (
    <>
      <Topbar title="Meetings">
        <Link
          href="/calendar"
          className="hidden items-center gap-1.5 text-sm text-text-muted hover:text-text sm:flex"
        >
          <CalendarDays className="h-4 w-4" /> Calendar
        </Link>
      </Topbar>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6">
          <Can permission="meeting:create">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setCallOpen(true)}
                className="group flex items-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-bg-elevated to-accent/10 p-5 text-left transition-colors hover:border-primary/60"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground">
                  <Video className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-semibold text-text">Start a call</span>
                  <span className="block text-sm text-text-muted">
                    1:1 or group, rings right away
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-bg-elevated p-5 text-left transition-colors hover:border-primary/40"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-hover text-primary">
                  <CalendarPlus className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-semibold text-text">Schedule a meeting</span>
                  <span className="block text-sm text-text-muted">
                    Invite people, add an agenda
                  </span>
                </span>
              </button>
            </div>
          </Can>

          {(live.length > 0 || liveInvites.length > 0) && (
            <Section title="Live now">
              {[...live, ...liveInvites].map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onOpen={() => setSelectedId(meeting.id)}
                />
              ))}
            </Section>
          )}

          {pendingInvites.length > 0 && (
            <Section title={`Invitations · ${pendingInvites.length}`}>
              {pendingInvites.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onOpen={() => setSelectedId(meeting.id)}
                  actions={<RsvpButtons meeting={meeting} compact />}
                />
              ))}
            </Section>
          )}

          {byDay.map(([day, meetings]) => (
            <Section key={day} title={dayLabel(new Date(`${day}T00:00`))}>
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onOpen={() => setSelectedId(meeting.id)}
                />
              ))}
            </Section>
          ))}

          {isLoading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-bg-elevated" />
              ))}
            </div>
          )}

          {empty && (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <Phone className="mx-auto h-8 w-8 text-text-muted" />
              <p className="mt-3 font-medium text-text">Nothing on the schedule</p>
              <p className="mt-1 text-sm text-text-muted">
                Start a call, or schedule a meeting and it’ll show up here and on your calendar.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-border bg-bg-elevated/60 p-4">
                <Icon className="h-5 w-5 text-accent" />
                <p className="mt-2 text-sm font-medium text-text">{title}</p>
                <p className="mt-0.5 text-xs text-text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <StartCallDialog open={callOpen} onClose={() => setCallOpen(false)} />
      <ScheduleMeetingDialog open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      <MeetingDetailsDialog
        meeting={selected}
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
