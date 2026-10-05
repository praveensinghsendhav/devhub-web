'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Settings,
  SmilePlus,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { MEETING_REACTIONS } from '@devhub/shared-types';
import { cn } from '../../../common/lib/cn';
import { useMeetingSession, meetingSession } from '../useMeetingSession';
import { QualityMenu } from './QualityMenu';
import { DeviceSettingsDialog } from './DeviceSettingsDialog';

export type SidePanel = 'people' | 'chat' | null;

function RoundButton({
  onClick,
  active = true,
  danger,
  label,
  shortcut,
  badge,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  label: string;
  shortcut?: string;
  badge?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      className={cn(
        'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors',
        danger
          ? 'bg-busy text-white hover:opacity-90'
          : active
            ? 'bg-bg-hover text-text hover:bg-border'
            : 'bg-busy/15 text-busy hover:bg-busy/25',
        className,
      )}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </button>
  );
}

function ReactionPicker() {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <RoundButton onClick={() => setOpen((v) => !v)} label="Send a reaction">
        <SmilePlus className="h-5 w-5" />
      </RoundButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 z-30 mb-2 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-bg-elevated p-1.5 shadow-2xl"
          >
            {MEETING_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => meetingSession.react(emoji)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-bg-hover"
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LeaveButton() {
  const router = useRouter();
  const myRole = useMeetingSession((s) => s.myRole);
  const [open, setOpen] = useState(false);

  const leave = () => {
    meetingSession.leave();
    router.push('/meeting');
  };

  if (myRole !== 'host') {
    return (
      <RoundButton onClick={leave} danger label="Leave call" className="w-16">
        <PhoneOff className="h-5 w-5" />
      </RoundButton>
    );
  }

  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <RoundButton
        onClick={() => setOpen((v) => !v)}
        danger
        label="Leave or end call"
        className="w-16"
      >
        <PhoneOff className="h-5 w-5" />
      </RoundButton>
      {open && (
        <div className="absolute right-0 bottom-full z-30 mb-2 w-52 overflow-hidden rounded-2xl border border-border bg-bg-elevated p-1.5 shadow-2xl">
          <button
            type="button"
            onClick={leave}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-text hover:bg-bg-hover"
          >
            Leave call
            <span className="block text-xs text-text-muted">Others can keep talking</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              void meetingSession.hostAction('end').then((ok) => ok && router.push('/meeting'));
            }}
            className="w-full rounded-xl px-3 py-2 text-left text-sm text-busy hover:bg-busy/10"
          >
            End for everyone
          </button>
        </div>
      )}
    </div>
  );
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function ControlBar({
  panel,
  onPanel,
}: {
  panel: SidePanel;
  onPanel: (panel: SidePanel) => void;
}) {
  const audio = useMeetingSession((s) => s.audio);
  const video = useMeetingSession((s) => s.video);
  const screen = useMeetingSession((s) => s.screen);
  const hand = useMeetingSession((s) => s.hand);
  const unreadChat = useMeetingSession((s) => s.unreadChat);
  const knocks = useMeetingSession((s) => s.knocks.length);
  const peerCount = useMeetingSession((s) => s.peers.length);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // M: mic · V: camera · H: hand. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      const s = meetingSession.getSnapshot();
      if (e.key === 'm' || e.key === 'M') void meetingSession.setAudio(!s.audio);
      else if (e.key === 'v' || e.key === 'V') void meetingSession.setVideo(!s.video);
      else if (e.key === 'h' || e.key === 'H') meetingSession.setHand(!s.hand);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const togglePanel = (next: Exclude<SidePanel, null>) => onPanel(panel === next ? null : next);

  return (
    // Wraps instead of scrolling: an overflow container would clip the menus that open above the
    // bar (leave/end, reactions, quality), leaving the host's hang-up button looking dead.
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-3">
      <RoundButton
        onClick={() => void meetingSession.setAudio(!audio)}
        active={audio}
        label={audio ? 'Mute' : 'Unmute'}
        shortcut="M"
      >
        {audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </RoundButton>
      <RoundButton
        onClick={() => void meetingSession.setVideo(!video)}
        active={video}
        label={video ? 'Turn camera off' : 'Turn camera on'}
        shortcut="V"
      >
        {video ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </RoundButton>
      {meetingSession.canShareScreen() && (
        <RoundButton
          onClick={() => void meetingSession.setScreen(!screen)}
          label={screen ? 'Stop presenting' : 'Present your screen'}
          className={cn(screen && 'bg-accent/20 text-accent hover:bg-accent/30')}
        >
          <MonitorUp className="h-5 w-5" />
        </RoundButton>
      )}
      <RoundButton
        onClick={() => meetingSession.setHand(!hand)}
        label={hand ? 'Lower hand' : 'Raise hand'}
        shortcut="H"
        className={cn(hand && 'bg-away/25 text-away hover:bg-away/35')}
      >
        <Hand className="h-5 w-5" />
      </RoundButton>
      <ReactionPicker />
      <QualityMenu />

      <span className="mx-1 hidden h-6 w-px bg-border sm:block" />

      <RoundButton
        onClick={() => togglePanel('chat')}
        label="Chat"
        badge={unreadChat}
        className={cn(panel === 'chat' && 'bg-primary/20 text-primary')}
      >
        <MessageSquare className="h-5 w-5" />
      </RoundButton>
      <RoundButton
        onClick={() => togglePanel('people')}
        label={`People (${peerCount + 1})`}
        badge={knocks}
        className={cn(panel === 'people' && 'bg-primary/20 text-primary')}
      >
        <Users className="h-5 w-5" />
      </RoundButton>
      <RoundButton onClick={() => setSettingsOpen(true)} label="Audio & video settings">
        <Settings className="h-5 w-5" />
      </RoundButton>
      <LeaveButton />

      <DeviceSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
