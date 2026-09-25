'use client';

import { useMemo } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import type {
  Conversation,
  ConversationMember,
  Message,
  PresenceStatus,
} from '@devhub/shared-types';
import { useAppSelector } from '../../store/hooks';
import { useListConversationsQuery } from './chatApi';

export const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  dnd: 'Do not disturb',
  in_meeting: 'In a meeting',
  offline: 'Offline',
};

export function useSelfId(): string | undefined {
  return useAppSelector((state) => state.auth.user?.id);
}

export function useConversation(conversationId: string | undefined): Conversation | undefined {
  const { data } = useListConversationsQuery();
  return useMemo(() => data?.find((c) => c.id === conversationId), [data, conversationId]);
}

export interface LivePresence {
  status: PresenceStatus;
  customStatus: string | null;
  lastSeenAt: string | null;
}

/** The member's snapshot from the API, overridden by any live presence event since. */
export function useLivePresence(member: ConversationMember | undefined): LivePresence {
  const live = useAppSelector((state) =>
    member ? state.presence.byUserId[member.userId] : undefined,
  );
  return {
    status: live?.status ?? member?.status ?? 'offline',
    customStatus: live ? live.customStatus : (member?.customStatus ?? null),
    lastSeenAt: live?.lastSeenAt ?? member?.lastSeenAt ?? null,
  };
}

export function usePresenceMap(): Record<string, PresenceStatus> {
  const byUserId = useAppSelector((state) => state.presence.byUserId);
  return useMemo(
    () => Object.fromEntries(Object.entries(byUserId).map(([id, p]) => [id, p.status])),
    [byUserId],
  );
}

const EMPTY: Record<string, string> = {};

/** Names of other people typing in a conversation right now. */
export function useTypingNames(conversationId: string | undefined): string[] {
  const selfId = useSelfId();
  const room = useAppSelector((state) =>
    conversationId ? (state.chat.typing[conversationId] ?? EMPTY) : EMPTY,
  );
  return useMemo(
    () =>
      Object.entries(room)
        .filter(([userId]) => userId !== selfId)
        .map(([, name]) => name),
    [room, selfId],
  );
}

export function typingLabel(names: string[]): string | null {
  if (names.length === 0) return null;
  const first = (n: string) => n.split(' ')[0];
  if (names.length === 1) return `${first(names[0]!)} is typing`;
  if (names.length === 2) return `${first(names[0]!)} and ${first(names[1]!)} are typing`;
  return `${names.length} people are typing`;
}

export function lastSeenLabel(presence: LivePresence): string {
  if (presence.status !== 'offline') return STATUS_LABELS[presence.status];
  if (!presence.lastSeenAt) return 'Offline';
  return `Last seen ${formatDistanceToNowStrict(new Date(presence.lastSeenAt), { addSuffix: true })}`;
}

export type ReceiptState = 'sent' | 'delivered' | 'seen';

type Stamped = Pick<Message, 'senderId' | 'createdAt'>;

/** Receipt for my own message: the weakest state across everyone else in the conversation. */
export function receiptFor(message: Stamped, conversation: Conversation): ReceiptState {
  const others = conversation.members.filter((m) => m.userId !== message.senderId);
  if (others.length === 0) return 'sent';
  if (others.every((m) => m.lastReadAt >= message.createdAt)) return 'seen';
  if (others.every((m) => m.lastDeliveredAt >= message.createdAt)) return 'delivered';
  return 'sent';
}

export function seenBy(message: Stamped, conversation: Conversation): ConversationMember[] {
  return conversation.members.filter(
    (m) => m.userId !== message.senderId && m.lastReadAt >= message.createdAt,
  );
}

export function otherMember(
  conversation: Conversation | undefined,
  selfId: string | undefined,
): ConversationMember | undefined {
  if (!conversation || conversation.type !== 'direct') return undefined;
  return conversation.members.find((m) => m.userId !== selfId);
}
