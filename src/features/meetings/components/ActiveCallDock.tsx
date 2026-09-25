'use client';

import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, Mic, MicOff, PhoneOff } from 'lucide-react';
import { useMeetingSession, meetingSession } from '../useMeetingSession';
import { CallAudio } from './CallAudio';

/**
 * Keeps a call going while you browse the rest of the app: a small bar to return, mute or hang
 * up, plus the audio for everyone in the call.
 */
export function ActiveCallDock() {
  const pathname = usePathname();
  const router = useRouter();
  const phase = useMeetingSession((s) => s.phase);
  const meetingId = useMeetingSession((s) => s.meetingId);
  const title = useMeetingSession((s) => s.title);
  const audio = useMeetingSession((s) => s.audio);
  const peerCount = useMeetingSession((s) => s.peers.length);
  const onCallPage = pathname === `/meeting/${meetingId}`;
  const show = phase === 'in-call' && !onCallPage;

  return (
    <>
      <CallAudio />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="glass-panel fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-2xl py-2 pr-2 pl-4 shadow-2xl shadow-black/40"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-online" />
            <button
              type="button"
              onClick={() => router.push(`/meeting/${meetingId}`)}
              className="min-w-0 text-left"
            >
              <span className="block max-w-40 truncate text-sm font-semibold text-text">
                {title}
              </span>
              <span className="block text-xs text-text-muted">
                {peerCount === 0 ? 'Waiting for others' : `${peerCount + 1} in call`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void meetingSession.setAudio(!audio)}
              className={`flex h-9 w-9 items-center justify-center rounded-full ${audio ? 'bg-bg-hover text-text' : 'bg-busy/15 text-busy'}`}
              aria-label={audio ? 'Mute' : 'Unmute'}
            >
              {audio ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/meeting/${meetingId}`)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-hover text-text"
              aria-label="Return to call"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => meetingSession.leave()}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-busy text-white"
              aria-label="Leave call"
            >
              <PhoneOff className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
