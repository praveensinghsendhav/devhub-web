'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { DoorOpen, Lock, PhoneOff, VideoOff } from 'lucide-react';
import { Button } from '../../../common/components/Button';
import { useGetMeetingQuery } from '../meetingsApi';
import { useMeetingSession, meetingSession } from '../useMeetingSession';
import { CallStage } from './CallStage';
import { PreJoin } from './PreJoin';

function Centered({
  icon,
  title,
  message,
  children,
}: {
  icon: ReactNode;
  title: string;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-text">{title}</h2>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">{message}</p>}
      </div>
      <div className="flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      <p className="text-sm text-text-muted">{label}</p>
    </div>
  );
}

/**
 * The call screen for one meeting. It only renders what the session says; the session itself
 * lives outside React, so leaving this page doesn't hang up.
 */
export function MeetingRoom({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const { data: meeting, error, isLoading } = useGetMeetingQuery(meetingId);
  const phase = useMeetingSession((s) => s.phase);
  const sessionMeetingId = useMeetingSession((s) => s.meetingId);
  const sessionError = useMeetingSession((s) => s.error);
  const endReason = useMeetingSession((s) => s.endReason);
  const otherCallActive = meetingSession.isActive() && sessionMeetingId !== meetingId;

  // Open the camera for this meeting (unless we're already in it, or in another call).
  useEffect(() => {
    if (!meeting || otherCallActive) return;
    const current = meetingSession.getSnapshot();
    if (current.meetingId === meetingId && current.phase !== 'idle') return;

    // Calls you started or answered skip the pre-join screen.
    const params = new URLSearchParams(window.location.search);
    const autoJoin = params.get('autojoin') === '1';
    if (autoJoin) router.replace(`/meeting/${meetingId}`);

    void meetingSession
      .prepare(meetingId, { title: meeting.title, media: meeting.media })
      .then(() => {
        if (autoJoin) void meetingSession.join();
      });
  }, [meeting, meetingId, otherCallActive, router]);

  // Walking away from the pre-join screen releases the camera. A live call keeps going.
  useEffect(
    () => () => {
      if (meetingSession.getSnapshot().phase === 'preview') meetingSession.cancelPreview();
    },
    [],
  );

  if (isLoading) return <Spinner label="Loading meeting…" />;

  if (error || !meeting) {
    return (
      <Centered
        icon={<VideoOff className="h-8 w-8" />}
        title="Meeting not found"
        message="It may have been deleted, or you haven’t been invited."
      >
        <Button variant="secondary" onClick={() => router.push('/meeting')}>
          Back to meetings
        </Button>
      </Centered>
    );
  }

  if (otherCallActive) {
    return (
      <Centered
        icon={<PhoneOff className="h-8 w-8" />}
        title="You’re in another call"
        message="Leave it to join this one."
      >
        <Button
          onClick={() => {
            meetingSession.leave();
          }}
        >
          Leave other call & continue
        </Button>
        <Button variant="secondary" onClick={() => router.push(`/meeting/${sessionMeetingId}`)}>
          Back to current call
        </Button>
      </Centered>
    );
  }

  if (meeting.status === 'cancelled') {
    return (
      <Centered icon={<VideoOff className="h-8 w-8" />} title="This meeting was cancelled">
        <Button variant="secondary" onClick={() => router.push('/meeting')}>
          Back to meetings
        </Button>
      </Centered>
    );
  }

  if (phase === 'in-call' && sessionMeetingId === meetingId) return <CallStage meeting={meeting} />;
  if (phase === 'joining') return <Spinner label="Joining…" />;

  if (phase === 'locked' || phase === 'knocking') {
    return (
      <Centered
        icon={<Lock className="h-8 w-8" />}
        title="This meeting is locked"
        message={
          phase === 'knocking'
            ? 'We’ve asked the host to let you in. Hang tight…'
            : 'Ask a host to let you in.'
        }
      >
        {phase === 'locked' && (
          <Button onClick={() => void meetingSession.knock()}>Ask to join</Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            meetingSession.cancelPreview();
            router.push('/meeting');
          }}
        >
          Cancel
        </Button>
      </Centered>
    );
  }

  if (phase === 'error' && sessionError) {
    const retryable = !['ended', 'removed', 'cancelled', 'not_found'].includes(sessionError.code);
    return (
      <Centered
        icon={<VideoOff className="h-8 w-8" />}
        title="Couldn’t join"
        message={sessionError.message}
      >
        {retryable && <Button onClick={() => void meetingSession.join()}>Try again</Button>}
        <Button
          variant="secondary"
          onClick={() => {
            meetingSession.cancelPreview();
            router.push('/meeting');
          }}
        >
          Back to meetings
        </Button>
      </Centered>
    );
  }

  if (phase === 'ended' && sessionMeetingId === meetingId) {
    const canRejoin = endReason === 'left' && meeting.status !== 'ended';
    return (
      <Centered
        icon={<DoorOpen className="h-8 w-8" />}
        title={
          endReason === 'removed'
            ? 'You were removed from the call'
            : endReason === 'ended'
              ? 'The call has ended'
              : 'You left the call'
        }
      >
        {canRejoin && (
          <Button
            onClick={() =>
              void meetingSession.prepare(meetingId, { title: meeting.title, media: meeting.media })
            }
          >
            Rejoin
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            meetingSession.cancelPreview();
            router.push('/meeting');
          }}
        >
          Back to meetings
        </Button>
      </Centered>
    );
  }

  if (meeting.status === 'ended') {
    return (
      <Centered icon={<VideoOff className="h-8 w-8" />} title="This meeting has ended">
        <Button variant="secondary" onClick={() => router.push('/meeting')}>
          Back to meetings
        </Button>
      </Centered>
    );
  }

  return <PreJoin meeting={meeting} />;
}
