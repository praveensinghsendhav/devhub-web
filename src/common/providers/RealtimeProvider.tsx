'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  SOCKET_EVENTS,
  type ConversationEventPayload,
  type MeetingEventPayload,
  type MeetingRingPayload,
  type Message,
  type PresenceUpdatePayload,
  type ReceiptUpdatePayload,
  type TypingUpdatePayload,
} from '@devhub/shared-types';
import { useAppDispatch, useAppSelector, useAppStore } from '../../store/hooks';
import { connectSocket, disconnectSocket } from '../lib/socketClient';
import { presenceUpdated } from '../../features/presence/presenceSlice';
import { applyOwnPresenceUpdate } from '../../features/auth/authSlice';
import {
  applyReceiptInCache,
  bumpUnreadInCache,
  chatApi,
  upsertMessageInCache,
} from '../../features/chat/chatApi';
import { typingChanged } from '../../features/chat/chatSlice';
import { meetingsApi } from '../../features/meetings/meetingsApi';
import { ringStarted, ringStopped } from '../../features/meetings/meetingsSlice';
import { meetingSession } from '../../features/meetings/rtc/MeetingSession';

/** A typing signal that isn't refreshed within this window is treated as stopped. */
const TYPING_TTL_MS = 6_000;

/**
 * The single place the app opens its realtime connection and fans socket events out to Redux/RTK Query.
 * Feature components never call `io()` themselves — they just read the store this keeps in sync.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const router = useRouter();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const status = useAppSelector((state) => state.auth.status);

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) return;

    const socket = connectSocket(accessToken);
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const onPresenceUpdate = (payload: PresenceUpdatePayload) => {
      dispatch(presenceUpdated(payload));
      dispatch(applyOwnPresenceUpdate(payload));
    };

    const onMessageNew = (message: Message) => {
      const state = store.getState();
      const selfId = state.auth.user?.id;
      const isKnownConversation = chatApi.endpoints.listConversations
        .select()(state)
        .data?.some((c) => c.id === message.conversationId);

      if (!isKnownConversation) {
        dispatch(chatApi.util.invalidateTags(['Conversations']));
      }
      upsertMessageInCache(dispatch, message);

      if (message.senderId !== selfId) {
        socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { conversationId: message.conversationId });
        // A message landing means that person has stopped typing.
        dispatch(
          typingChanged({
            conversationId: message.conversationId,
            userId: message.senderId,
            name: message.senderName,
            isTyping: false,
          }),
        );
        const isOpen = state.chat.activeConversationId === message.conversationId;
        if (message.type === 'text' && (!isOpen || document.hidden)) {
          bumpUnreadInCache(dispatch, message.conversationId);
        }
      }
    };

    const onMessageUpdated = (message: Message) => upsertMessageInCache(dispatch, message);
    const onReceipt = (receipt: ReceiptUpdatePayload) => applyReceiptInCache(dispatch, receipt);
    const onConversationUpdated = () => dispatch(chatApi.util.invalidateTags(['Conversations']));

    const onConversationRemoved = ({ conversationId }: ConversationEventPayload) => {
      dispatch(chatApi.util.invalidateTags(['Conversations']));
      if (store.getState().chat.activeConversationId === conversationId) {
        toast.info('You’re no longer a member of that conversation');
        router.replace('/chat');
      }
    };

    const onTyping = (payload: TypingUpdatePayload) => {
      const key = `${payload.conversationId}:${payload.userId}`;
      clearTimeout(typingTimers.get(key));
      dispatch(typingChanged(payload));
      if (payload.isTyping) {
        typingTimers.set(
          key,
          setTimeout(() => dispatch(typingChanged({ ...payload, isTyping: false })), TYPING_TTL_MS),
        );
      }
    };

    const onMeetingChanged = () => dispatch(meetingsApi.util.invalidateTags(['Meetings']));

    const onRing = (ring: MeetingRingPayload) => {
      // Already in that call on this device — nothing to answer.
      const call = meetingSession.getSnapshot();
      if (call.meetingId === ring.meetingId && meetingSession.isActive()) return;
      dispatch(ringStarted(ring));
    };

    const onRingCancel = ({ meetingId }: MeetingEventPayload) => dispatch(ringStopped(meetingId));

    // Resync anything missed while the connection was down.
    const onReconnect = () => {
      dispatch(chatApi.util.invalidateTags(['Conversations', 'Messages']));
      dispatch(meetingsApi.util.invalidateTags(['Meetings']));
    };

    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, onPresenceUpdate);
    socket.on(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, onMessageUpdated);
    socket.on(SOCKET_EVENTS.RECEIPT_UPDATE, onReceipt);
    socket.on(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
    socket.on(SOCKET_EVENTS.CONVERSATION_REMOVED, onConversationRemoved);
    socket.on(SOCKET_EVENTS.TYPING_UPDATE, onTyping);
    socket.on(SOCKET_EVENTS.MEETING_CHANGED, onMeetingChanged);
    socket.on(SOCKET_EVENTS.MEETING_RING, onRing);
    socket.on(SOCKET_EVENTS.MEETING_RING_CANCEL, onRingCancel);
    socket.io.on('reconnect', onReconnect);

    return () => {
      typingTimers.forEach(clearTimeout);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, onPresenceUpdate);
      socket.off(SOCKET_EVENTS.MESSAGE_NEW, onMessageNew);
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATED, onMessageUpdated);
      socket.off(SOCKET_EVENTS.RECEIPT_UPDATE, onReceipt);
      socket.off(SOCKET_EVENTS.CONVERSATION_UPDATED, onConversationUpdated);
      socket.off(SOCKET_EVENTS.CONVERSATION_REMOVED, onConversationRemoved);
      socket.off(SOCKET_EVENTS.TYPING_UPDATE, onTyping);
      socket.off(SOCKET_EVENTS.MEETING_CHANGED, onMeetingChanged);
      socket.off(SOCKET_EVENTS.MEETING_RING, onRing);
      socket.off(SOCKET_EVENTS.MEETING_RING_CANCEL, onRingCancel);
      socket.io.off('reconnect', onReconnect);
    };
  }, [accessToken, status, dispatch, store, router]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      meetingSession.leave();
      disconnectSocket();
    }
  }, [status]);

  return <>{children}</>;
}
