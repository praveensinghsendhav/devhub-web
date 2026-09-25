'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDistanceToNowStrict, isToday, format } from 'date-fns';
import { Megaphone, Plus, Search } from 'lucide-react';
import type { Conversation, ConversationType } from '@devhub/shared-types';
import { useListConversationsQuery } from '../chatApi';
import { receiptFor, typingLabel, useSelfId, useTypingNames } from '../chatHooks';
import { cn } from '../../../common/lib/cn';
import { MyStatusCard } from '../../presence/MyStatusCard';
import { ConversationAvatar } from './ChatAvatar';
import { NewChatDialog } from './NewChatDialog';
import { ReceiptTicks } from './ReceiptTicks';

type Filter = 'all' | 'unread' | ConversationType;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'direct', label: 'Direct' },
  { id: 'group', label: 'Groups' },
  { id: 'broadcast', label: 'Broadcasts' },
];

function timeLabel(iso: string): string {
  const date = new Date(iso);
  return isToday(date) ? format(date, 'p') : formatDistanceToNowStrict(date);
}

function Preview({ conversation }: { conversation: Conversation }) {
  const selfId = useSelfId();
  const typing = typingLabel(useTypingNames(conversation.id));
  const last = conversation.lastMessage;

  if (typing) {
    return <span className="truncate text-xs font-medium text-accent">{typing}…</span>;
  }
  if (!last) return <span className="truncate text-xs text-text-muted">No messages yet</span>;

  const mine = last.senderId === selfId;
  const prefix =
    last.type === 'system'
      ? ''
      : mine
        ? 'You: '
        : conversation.type !== 'direct'
          ? `${last.senderName.split(' ')[0]}: `
          : '';
  const body = last.deleted ? 'Message deleted' : last.body;

  return (
    <span className="flex min-w-0 items-center gap-1 text-xs text-text-muted">
      {mine && last.type === 'text' && !last.deleted && (
        <ReceiptTicks state={receiptFor(last, conversation)} />
      )}
      <span className={cn('truncate', (last.deleted || last.type === 'system') && 'italic')}>
        {prefix}
        {body}
      </span>
    </span>
  );
}

export function ConversationList() {
  const { data: conversations = [], isLoading } = useListConversationsQuery();
  const params = useParams<{ conversationId?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === 'unread' && c.unreadCount === 0) return false;
      if (filter !== 'all' && filter !== 'unread' && c.type !== filter) return false;
      return !q || c.name.toLowerCase().includes(q);
    });
  }, [conversations, query, filter]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <div
      className={cn(
        'flex h-full w-full shrink-0 flex-col border-r border-border bg-bg-elevated/40 md:w-[340px]',
        params.conversationId && 'hidden md:flex',
      )}
    >
      <div className="flex flex-col gap-3 p-3">
        <MyStatusCard />

        <div className="flex items-center gap-2">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-border bg-bg px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
            <Search className="h-4 w-4 text-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
            />
          </label>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="btn-3d flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-primary-foreground"
            aria-label="New conversation"
            title="New conversation"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                filter === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-text-muted hover:bg-bg-hover hover:text-text',
              )}
            >
              <span>
                {label}
                {id === 'unread' && totalUnread > 0 && ` · ${totalUnread}`}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {isLoading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="mx-1 mb-2 h-16 animate-pulse rounded-2xl bg-bg-hover" />
          ))}

        {!isLoading && visible.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Megaphone className="h-6 w-6 text-text-muted" />
            <p className="text-sm text-text-muted">
              {conversations.length === 0
                ? 'No conversations yet. Start one with the + button.'
                : 'Nothing matches this filter.'}
            </p>
          </div>
        )}

        {visible.map((conversation) => {
          const active = params.conversationId === conversation.id;
          return (
            <div key={conversation.id} className="mb-1">
              <Link
                href={`/chat/${conversation.id}`}
                className={cn(
                  'relative flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors',
                  active
                    ? 'border-primary/40 bg-gradient-to-r from-primary/15 to-accent/5 shadow-lg shadow-primary/10'
                    : 'border-transparent hover:border-border hover:bg-bg-elevated',
                )}
              >
                {active && (
                  <span className="absolute top-3 bottom-3 left-0 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
                )}
                <ConversationAvatar conversation={conversation} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        'truncate text-sm text-text',
                        conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium',
                      )}
                    >
                      {conversation.name}
                    </p>
                    {conversation.lastMessage && (
                      <span
                        className={cn(
                          'shrink-0 text-[11px]',
                          conversation.unreadCount > 0 ? 'text-primary' : 'text-text-muted',
                        )}
                      >
                        {timeLabel(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <Preview conversation={conversation} />
                    {conversation.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent px-1.5 text-[11px] font-bold text-primary-foreground shadow shadow-primary/40">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      <NewChatDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
