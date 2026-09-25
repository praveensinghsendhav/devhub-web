'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { toast } from 'sonner';
import { SOCKET_EVENTS, type MeetingRingPayload } from '@devhub/shared-types';
import { Avatar } from '../../../common/components/Avatar';
import { getSocket } from '../../../common/lib/socketClient';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { ringStopped } from '../meetingsSlice';
import { meetingSession } from '../useMeetingSession';

const RING_TIMEOUT_MS = 45_000;

/** A soft two-tone ring made with WebAudio, so there's no sound file to download. */
function startRingtone(): () => void {
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  try {
    context = new AudioContext();
    const ctx = context;
    const burst = () => {
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
      [0, 0.4].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = i === 0 ? 660 : 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + offset + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.4);
      });
    };
    burst();
    timer = setInterval(burst, 2_500);
  } catch {
    // No audio (autoplay blocked or unsupported): the dialog still shows.
  }
  return () => {
    if (timer) clearInterval(timer);
    void context?.close().catch(() => undefined);
  };
}

function RingCard({ ring }: { ring: MeetingRingPayload }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const group = ring.inviteeCount > 1;

  useEffect(() => {
    const stopTone = startRingtone();
    if (
      document.hidden &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(`${ring.from.name} is calling`, { body: ring.title, tag: ring.meetingId });
      } catch {
        // Some browsers only allow notifications from a service worker.
      }
    }
    const timeout = setTimeout(() => {
      dispatch(ringStopped(ring.meetingId));
      toast.info(`Missed call from ${ring.from.name}`);
    }, RING_TIMEOUT_MS);
    return () => {
      stopTone();
      clearTimeout(timeout);
    };
  }, [ring, dispatch]);

  const accept = () => {
    dispatch(ringStopped(ring.meetingId));
    // Answering hangs up whatever call you were in.
    if (meetingSession.isActive()) meetingSession.leave();
    router.push(`/meeting/${ring.meetingId}?autojoin=1`);
  };

  const decline = () => {
    dispatch(ringStopped(ring.meetingId));
    getSocket()?.emit(SOCKET_EVENTS.MEETING_DECLINE, { meetingId: ring.meetingId });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      className="glass-panel pointer-events-auto flex w-[min(24rem,calc(100vw-2rem))] items-center gap-3 rounded-2xl p-4 shadow-2xl shadow-black/40"
      role="alertdialog"
      aria-label={`Incoming call from ${ring.from.name}`}
    >
      <span className="relative">
        <span className="absolute inset-0 animate-ping rounded-full bg-online/40" />
        <Avatar name={ring.from.name} avatarUrl={ring.from.avatarUrl} size="md" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">{ring.from.name}</p>
        <p className="truncate text-xs text-text-muted">
          {group ? `Group ${ring.media} call · ${ring.title}` : `Incoming ${ring.media} call`}
        </p>
      </div>
      <button
        type="button"
        onClick={decline}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-busy text-white hover:opacity-90"
        aria-label="Decline"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={accept}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-online text-white hover:opacity-90"
        aria-label="Answer"
      >
        {ring.media === 'video' ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
      </button>
    </motion.div>
  );
}

/** Incoming calls, shown on every page of the app. */
export function IncomingCallDialog() {
  const rings = useAppSelector((state) => state.meetings.rings);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2">
      <AnimatePresence>
        {rings.map((ring) => (
          <RingCard key={ring.meetingId} ring={ring} />
        ))}
      </AnimatePresence>
    </div>
  );
}
