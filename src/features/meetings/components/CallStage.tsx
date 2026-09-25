'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock, MicOff, X } from 'lucide-react';
import type { Meeting } from '@devhub/shared-types';
import { cn } from '../../../common/lib/cn';
import { formatElapsed } from '../meetingFormat';
import { useMeetingSession, meetingSession } from '../useMeetingSession';
import { VideoGrid } from './VideoGrid';
import { ControlBar, type SidePanel } from './ControlBar';
import { ParticipantsPanel } from './ParticipantsPanel';
import { MeetingChatPanel } from './MeetingChatPanel';

function CallTimer() {
  const joinedAt = useMeetingSession((s) => s.joinedAt);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="font-mono text-xs text-text-muted tabular-nums">
      {joinedAt ? formatElapsed(now - joinedAt) : '00:00'}
    </span>
  );
}

function ReactionsOverlay() {
  const reactions = useMeetingSession((s) => s.reactions);
  return (
    <div className="pointer-events-none absolute bottom-24 left-4 z-20 flex flex-col-reverse gap-1">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, y: 20, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 rounded-full bg-black/55 py-1 pr-3 pl-1.5 text-white backdrop-blur"
          >
            <span className="text-2xl">{reaction.emoji}</span>
            <span className="text-xs">{reaction.name}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function MutedHint() {
  const show = useMeetingSession((s) => s.mutedWhileTalking);
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          onClick={() => void meetingSession.setAudio(true)}
          className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/75 px-4 py-2 text-sm text-white shadow-xl backdrop-blur"
        >
          <MicOff className="h-4 w-4 text-busy" /> You’re muted — tap to unmute
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/** The whole in-call screen: header, stage, side panel and controls. */
export function CallStage({ meeting }: { meeting: Meeting | undefined }) {
  const title = useMeetingSession((s) => s.title);
  const isLocked = useMeetingSession((s) => s.isLocked);
  const chatOpen = useMeetingSession((s) => s.chatOpen);
  const [panel, setPanel] = useState<SidePanel>(chatOpen ? 'chat' : null);

  // Unread counting needs to know whether chat is on screen.
  useEffect(() => {
    meetingSession.setChatOpen(panel === 'chat');
  }, [panel]);

  return (
    <div className="relative flex min-h-0 flex-1 bg-bg">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 px-4">
          <h1 className="truncate text-sm font-semibold text-text">{title}</h1>
          {isLocked && (
            <span className="flex items-center gap-1 text-xs text-away" title="Locked">
              <Lock className="h-3.5 w-3.5" /> Locked
            </span>
          )}
          <span className="ml-auto" />
          <CallTimer />
        </header>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <VideoGrid />
          <ReactionsOverlay />
          <MutedHint />
        </div>
        <ControlBar panel={panel} onPanel={setPanel} />
      </div>

      <AnimatePresence>
        {panel && (
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18 }}
            className={cn(
              'flex w-full flex-col border-l border-border bg-bg-elevated',
              // Full-screen sheet on phones, a side column on larger screens.
              'absolute inset-0 z-30 sm:static sm:w-80',
            )}
          >
            <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border px-2">
              {(['people', 'chat'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanel(id)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                    panel === id ? 'bg-bg-hover text-text' : 'text-text-muted hover:text-text',
                  )}
                >
                  {id}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPanel(null)}
                className="ml-auto rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {panel === 'people' ? <ParticipantsPanel meeting={meeting} /> : <MeetingChatPanel />}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
