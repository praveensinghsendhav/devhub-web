'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Info, Megaphone, Phone, ShieldCheck, Users, Video } from 'lucide-react';
import {
  MAX_MEETING_PARTICIPANTS,
  type Conversation,
  type MeetingMedia,
} from '@devhub/shared-types';
import { useAppSelector } from '../../../store/hooks';
import { cn } from '../../../common/lib/cn';
import { useCan } from '../../../common/rbac/usePermission';
import { useStartCall } from '../../meetings/useStartCall';
import {
  lastSeenLabel,
  otherMember,
  typingLabel,
  useLivePresence,
  useSelfId,
  useTypingNames,
} from '../chatHooks';
import { ConversationAvatar } from './ChatAvatar';

function TypingDots() {
  return (
    <span className="inline-flex items-end gap-0.5 pb-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="typing-dot h-1 w-1 rounded-full bg-accent"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

function Subline({ conversation }: { conversation: Conversation }) {
  const selfId = useSelfId();
  const other = otherMember(conversation, selfId);
  const presence = useLivePresence(other);
  const typing = typingLabel(useTypingNames(conversation.id));
  const presenceById = useAppSelector((state) => state.presence.byUserId);

  const onlineCount = conversation.members.filter((m) => {
    const status = presenceById[m.userId]?.status ?? m.status;
    return status !== 'offline';
  }).length;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p
        key={typing ?? 'status'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="flex min-w-0 items-center gap-1.5 text-xs"
      >
        {typing ? (
          <span className="flex items-center gap-1.5 font-medium text-accent">
            {typing}
            <TypingDots />
          </span>
        ) : other ? (
          <>
            <span className={presence.status === 'online' ? 'text-online' : 'text-text-muted'}>
              {lastSeenLabel(presence)}
            </span>
            {presence.customStatus && (
              <span className="truncate rounded-full border border-border bg-bg/60 px-2 py-0.5 text-text">
                {presence.customStatus}
              </span>
            )}
          </>
        ) : (
          <span className="truncate text-text-muted">
            {conversation.members.length} members
            {onlineCount > 0 && <span className="text-online"> · {onlineCount} online</span>}
            {conversation.description && ` · ${conversation.description}`}
          </span>
        )}
      </motion.p>
    </AnimatePresence>
  );
}

/** Call everyone in this chat. Broadcasts are one-way, so they don’t get call buttons. */
function CallButtons({ conversation }: { conversation: Conversation }) {
  const selfId = useSelfId();
  const canCall = useCan('meeting:create');
  const { startCall, isStarting } = useStartCall();
  if (!canCall || conversation.type === 'broadcast') return null;

  const others = conversation.members.filter((m) => m.userId !== selfId);
  const tooBig = others.length > MAX_MEETING_PARTICIPANTS - 1;
  const disabled = others.length === 0 || tooBig || isStarting;
  const hint = tooBig
    ? `Calls fit up to ${MAX_MEETING_PARTICIPANTS} people — schedule a meeting instead`
    : undefined;

  const call = (media: MeetingMedia) =>
    void startCall({
      userIds: others.map((m) => m.userId),
      media,
      title: conversation.type === 'direct' ? `Call with ${conversation.name}` : conversation.name,
    });

  return (
    <>
      <button
        type="button"
        onClick={() => call('audio')}
        disabled={disabled}
        title={hint ?? 'Audio call'}
        className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-40"
        aria-label="Start audio call"
      >
        <Phone className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => call('video')}
        disabled={disabled}
        title={hint ?? 'Video call'}
        className="rounded-xl p-2 text-text-muted transition-colors hover:bg-bg-hover hover:text-text disabled:opacity-40"
        aria-label="Start video call"
      >
        <Video className="h-5 w-5" />
      </button>
    </>
  );
}

export function ChatHeader({
  conversation,
  detailsOpen,
  onToggleDetails,
}: {
  conversation: Conversation;
  detailsOpen: boolean;
  onToggleDetails: () => void;
}) {
  const TypeIcon = conversation.type === 'broadcast' ? Megaphone : Users;

  return (
    <header className="relative z-10 px-3 pt-3 sm:px-5">
      <div className="glass-panel flex items-center gap-3 rounded-2xl px-3 py-2.5 shadow-xl shadow-black/10">
        <Link
          href="/chat"
          className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text md:hidden"
          aria-label="Back to chats"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <button
          type="button"
          onClick={onToggleDetails}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <ConversationAvatar conversation={conversation} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-base font-semibold text-text">
                {conversation.name}
              </span>
              {conversation.type !== 'direct' && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-bg-hover px-2 py-0.5 text-[10px] font-semibold tracking-wide text-text-muted uppercase">
                  <TypeIcon className="h-3 w-3" />
                  {conversation.type}
                </span>
              )}
              {conversation.type !== 'direct' && conversation.myRole === 'admin' && (
                <span
                  className="flex shrink-0 items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase"
                  title="You’re an admin here"
                >
                  <ShieldCheck className="h-3 w-3" /> Admin
                </span>
              )}
            </span>
            <Subline conversation={conversation} />
          </span>
        </button>

        <CallButtons conversation={conversation} />
        <button
          type="button"
          onClick={onToggleDetails}
          className={cn(
            'rounded-xl p-2 transition-colors',
            detailsOpen
              ? 'bg-primary/15 text-primary'
              : 'text-text-muted hover:bg-bg-hover hover:text-text',
          )}
          aria-label="Conversation details"
          aria-pressed={detailsOpen}
        >
          <Info className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
