'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { format, isSameDay, isToday, isYesterday } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Loader2, Sparkles } from 'lucide-react';
import type { Conversation, Message } from '@devhub/shared-types';
import { Avatar } from '../../../common/components/Avatar';
import { useGetMessagesQuery, useMarkConversationReadMutation } from '../chatApi';
import { seenBy, receiptFor, typingLabel, useTypingNames } from '../chatHooks';
import { MessageBubble, SystemMessage } from './MessageBubble';

const RUN_GAP_MS = 5 * 60 * 1000;
const NEAR_BOTTOM_PX = 140;

function dayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

function DaySeparator({ date }: { date: Date }) {
  return (
    <div className="sticky top-2 z-10 my-4 flex justify-center">
      <span className="glass-panel rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide text-text-muted uppercase shadow-lg">
        {dayLabel(date)}
      </span>
    </div>
  );
}

function TypingBubble({ names }: { names: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="mt-3 flex items-end gap-2"
    >
      <Avatar name={names[0] ?? '?'} size="sm" />
      <div className="bubble-other flex items-center gap-2 rounded-3xl rounded-bl-md px-4 py-3">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot h-2 w-2 rounded-full bg-accent"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
        <span className="text-xs text-text-muted">{typingLabel(names)}</span>
      </div>
    </motion.div>
  );
}

function SeenByRow({ message, conversation }: { message: Message; conversation: Conversation }) {
  const viewers = seenBy(message, conversation);
  const others = conversation.members.length - 1;
  if (receiptFor(message, conversation) !== 'seen' && viewers.length === 0) return null;

  if (conversation.type === 'direct') {
    return <p className="mt-1 mr-1 text-right text-[11px] font-medium text-accent">Seen</p>;
  }

  return (
    <div
      className="mt-1 flex items-center justify-end gap-1.5"
      title={viewers.map((v) => v.name).join(', ')}
    >
      <span className="text-[11px] text-text-muted">
        {viewers.length === others ? 'Seen by everyone' : `Seen by ${viewers.length}`}
      </span>
      <span className="flex -space-x-1.5">
        {viewers.slice(0, 5).map((viewer) => (
          <span key={viewer.userId} className="rounded-full ring-2 ring-bg">
            <Avatar name={viewer.name} avatarUrl={viewer.avatarUrl} size="xs" />
          </span>
        ))}
      </span>
    </div>
  );
}

export function MessageThread({
  conversation,
  selfId,
  onReply,
  onEdit,
}: {
  conversation: Conversation;
  selfId: string;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
}) {
  const conversationId = conversation.id;
  const [before, setBefore] = useState<string | undefined>();
  const { data, isLoading, isFetching } = useGetMessagesQuery({ conversationId, before });
  const [markRead] = useMarkConversationReadMutation();
  const typingNames = useTypingNames(conversationId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const pendingPrependHeight = useRef<number | null>(null);
  const didInitialScroll = useRef(false);
  const lastSeenTailId = useRef<string | undefined>(undefined);
  const [unseenCount, setUnseenCount] = useState(0);

  const messages = useMemo(() => data?.items ?? [], [data]);
  const firstId = messages[0]?.id;
  const tail = messages[messages.length - 1];
  const lastOwnMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((m) => m.senderId === selfId && m.type === 'text' && !m.deletedAt),
    [messages, selfId],
  );

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    return !el || el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((smooth: boolean) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    setUnseenCount(0);
  }, []);

  // Load older history when the top sentinel scrolls into view.
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel || !data?.hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetching && firstId && didInitialScroll.current) {
          pendingPrependHeight.current = scrollRef.current?.scrollHeight ?? null;
          setBefore(firstId);
        }
      },
      { root: scrollRef.current, rootMargin: '200px 0px 0px 0px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [data?.hasMore, isFetching, firstId]);

  // Keep the viewport anchored when older messages are prepended.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pendingPrependHeight.current !== null) {
      el.scrollTop += el.scrollHeight - pendingPrependHeight.current;
      pendingPrependHeight.current = null;
    }
  }, [firstId]);

  // New messages at the tail: follow if you're at the bottom (or sent it), otherwise count them.
  useLayoutEffect(() => {
    if (!tail) return;
    if (!didInitialScroll.current) {
      scrollToBottom(false);
      didInitialScroll.current = true;
      lastSeenTailId.current = tail.id;
      return;
    }
    if (tail.id === lastSeenTailId.current) return;
    lastSeenTailId.current = tail.id;
    if (tail.senderId === selfId || isNearBottom()) scrollToBottom(true);
    else setUnseenCount((n) => n + 1);
  }, [tail, selfId, isNearBottom, scrollToBottom]);

  useEffect(() => {
    if (typingNames.length > 0 && isNearBottom()) scrollToBottom(true);
  }, [typingNames.length, isNearBottom, scrollToBottom]);

  // Read receipts: mark read whenever there's something newer than my last read and the tab is visible.
  const myLastReadAt = conversation.members.find((m) => m.userId === selfId)?.lastReadAt ?? '';
  useEffect(() => {
    const maybeMarkRead = () => {
      if (document.hidden || !tail) return;
      if (tail.senderId !== selfId && tail.createdAt > myLastReadAt) {
        void markRead({ conversationId });
      } else if (conversation.unreadCount > 0) {
        void markRead({ conversationId });
      }
    };
    maybeMarkRead();
    document.addEventListener('visibilitychange', maybeMarkRead);
    return () => document.removeEventListener('visibilitychange', maybeMarkRead);
  }, [tail, selfId, myLastReadAt, conversation.unreadCount, conversationId, markRead]);

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={() => unseenCount > 0 && isNearBottom() && setUnseenCount(0)}
        className="h-full overflow-y-auto px-3 pt-4 pb-6 sm:px-6"
      >
        <div ref={topSentinelRef} />

        {isFetching && before && (
          <div className="flex justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
          </div>
        )}

        {!isLoading && data && !data.hasMore && (
          <div className="mx-auto my-6 flex max-w-sm flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/20 text-primary shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-text">
              This is the beginning of {conversation.name}
            </p>
            {conversation.description && (
              <p className="text-xs text-text-muted">{conversation.description}</p>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col gap-3 py-6">
            {[40, 64, 52, 30].map((w, i) => (
              <div
                key={i}
                className={`h-10 animate-pulse rounded-3xl bg-bg-hover ${i % 2 ? 'self-end' : ''}`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        )}

        {messages.map((message, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];
          const date = new Date(message.createdAt);
          const newDay = !prev || !isSameDay(new Date(prev.createdAt), date);
          const sameRun = (a?: Message, b?: Message) =>
            Boolean(
              a &&
              b &&
              a.type === 'text' &&
              b.type === 'text' &&
              a.senderId === b.senderId &&
              Math.abs(new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) <
                RUN_GAP_MS &&
              isSameDay(new Date(a.createdAt), new Date(b.createdAt)),
            );

          return (
            <Fragment key={message.id}>
              {newDay && <DaySeparator date={date} />}
              {message.type === 'system' ? (
                <SystemMessage message={message} />
              ) : (
                <MessageBubble
                  message={message}
                  conversation={conversation}
                  selfId={selfId}
                  isRunStart={newDay || !sameRun(prev, message)}
                  isRunEnd={!sameRun(message, next)}
                  onReply={onReply}
                  onEdit={onEdit}
                />
              )}
              {message.id === lastOwnMessage?.id && (
                <SeenByRow message={message} conversation={conversation} />
              )}
            </Fragment>
          );
        })}

        <AnimatePresence>
          {typingNames.length > 0 && <TypingBubble names={typingNames} />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {unseenCount > 0 && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xl shadow-primary/40"
          >
            <ArrowDown className="h-4 w-4" />
            {unseenCount} new message{unseenCount === 1 ? '' : 's'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
