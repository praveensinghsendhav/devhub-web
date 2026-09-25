'use client';

import Link from 'next/link';
import { Mic, Users, Video } from 'lucide-react';
import type { Meeting } from '@devhub/shared-types';
import { cn } from '../../../common/lib/cn';
import { Avatar } from '../../../common/components/Avatar';
import { isJoinable, timeRange } from '../meetingFormat';

export function MeetingStatusBadge({ meeting }: { meeting: Pick<Meeting, 'status'> }) {
  if (meeting.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-busy/15 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-busy uppercase">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-busy" /> Live
      </span>
    );
  }
  if (meeting.status === 'cancelled' || meeting.status === 'ended') {
    return (
      <span className="rounded-full bg-bg-hover px-2 py-0.5 text-[11px] font-semibold tracking-wide text-text-muted uppercase">
        {meeting.status}
      </span>
    );
  }
  return null;
}

/** A compact row for meeting lists; click opens details, the button joins directly. */
export function MeetingCard({
  meeting,
  onOpen,
  actions,
}: {
  meeting: Meeting;
  onOpen: () => void;
  actions?: React.ReactNode;
}) {
  const MediaIcon = meeting.media === 'audio' ? Mic : Video;
  const joinable = isJoinable(meeting);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-bg-elevated p-3 transition-colors sm:p-4',
        meeting.status === 'live' ? 'border-busy/40' : 'border-border hover:border-primary/40',
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            meeting.status === 'live'
              ? 'bg-busy/15 text-busy'
              : 'bg-gradient-to-br from-primary/20 to-accent/20 text-primary',
          )}
        >
          <MediaIcon className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-text">{meeting.title}</span>
            <MeetingStatusBadge meeting={meeting} />
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-muted">
            {timeRange(meeting)}
          </span>
        </span>
        <span
          className="hidden items-center sm:flex"
          title={`${meeting.participants.length} invited`}
        >
          {meeting.participants.slice(0, 3).map((p, i) => (
            <Avatar
              key={p.userId}
              name={p.name}
              avatarUrl={p.avatarUrl}
              size="sm"
              className={cn('ring-2 ring-[var(--color-bg-elevated)]', i > 0 && '-ml-2')}
            />
          ))}
          {meeting.participants.length > 3 && (
            <span className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-bg-hover text-[11px] font-semibold text-text-muted ring-2 ring-[var(--color-bg-elevated)]">
              +{meeting.participants.length - 3}
            </span>
          )}
          {meeting.participants.length === 0 && <Users className="h-4 w-4 text-text-muted" />}
        </span>
      </button>
      {actions}
      {!actions && joinable && (
        <Link
          href={`/meeting/${meeting.id}`}
          className={cn(
            'btn-3d inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium',
            meeting.status === 'live'
              ? 'bg-busy text-white [--btn-edge:color-mix(in_oklab,var(--color-busy)_55%,black)] [--btn-glow:transparent]'
              : 'bg-primary text-primary-foreground',
          )}
        >
          <Video className="h-4 w-4" /> Join
        </Link>
      )}
    </div>
  );
}
