import type {
  Conversation,
  ConversationRole,
  CreateBroadcastRequest,
  CreateGroupRequest,
  Message,
  MessagePage,
  ReactionEmoji,
  ReceiptUpdatePayload,
  SendMessageRequest,
  UpdateConversationRequest,
} from '@devhub/shared-types';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';
import { baseApi, OVERRIDE_ON_HMR } from '../../store/apiBase';
import { unwrap } from '../../store/unwrap';

type ConversationArg = { conversationId: string };

export const chatApi = baseApi.injectEndpoints({
  overrideExisting: OVERRIDE_ON_HMR,
  endpoints: (builder) => ({
    listConversations: builder.query<Conversation[], void>({
      query: () => ({ url: '/chat/conversations' }),
      transformResponse: unwrap<Conversation[]>,
      providesTags: ['Conversations'],
    }),

    /**
     * One cache entry per conversation (keyed by id only). Passing `before` loads older history
     * and prepends it; a plain refetch refreshes the newest page without dropping loaded history.
     */
    getMessages: builder.query<MessagePage, { conversationId: string; before?: string }>({
      query: ({ conversationId, before }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        params: before ? { before, limit: 40 } : { limit: 40 },
      }),
      transformResponse: unwrap<MessagePage>,
      serializeQueryArgs: ({ queryArgs }) => queryArgs.conversationId,
      merge: (current, incoming, { arg }) => {
        const known = new Set(current.items.map((m) => m.id));
        if (arg.before) {
          current.items.unshift(...incoming.items.filter((m) => !known.has(m.id)));
          current.hasMore = incoming.hasMore;
          return;
        }
        const newestStart = incoming.items[0]?.createdAt;
        const older = newestStart ? current.items.filter((m) => m.createdAt < newestStart) : [];
        current.items = [...older, ...incoming.items];
        if (older.length === 0) current.hasMore = incoming.hasMore;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg?.before !== previousArg?.before,
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Messages', id: conversationId },
      ],
    }),

    createDirectConversation: builder.mutation<Conversation, { userId: string }>({
      query: (body) => ({ url: '/chat/conversations/direct', method: 'POST', body }),
      transformResponse: unwrap<Conversation>,
      invalidatesTags: ['Conversations'],
    }),
    createGroup: builder.mutation<Conversation, CreateGroupRequest>({
      query: (body) => ({ url: '/chat/conversations/group', method: 'POST', body }),
      transformResponse: unwrap<Conversation>,
      invalidatesTags: ['Conversations'],
    }),
    createBroadcast: builder.mutation<Conversation, CreateBroadcastRequest>({
      query: (body) => ({ url: '/chat/conversations/broadcast', method: 'POST', body }),
      transformResponse: unwrap<Conversation>,
      invalidatesTags: ['Conversations'],
    }),
    updateConversation: builder.mutation<Conversation, ConversationArg & UpdateConversationRequest>(
      {
        query: ({ conversationId, ...body }) => ({
          url: `/chat/conversations/${conversationId}`,
          method: 'PATCH',
          body,
        }),
        transformResponse: unwrap<Conversation>,
        invalidatesTags: ['Conversations'],
      },
    ),
    addMembers: builder.mutation<Conversation, ConversationArg & { userIds: string[] }>({
      query: ({ conversationId, userIds }) => ({
        url: `/chat/conversations/${conversationId}/members`,
        method: 'POST',
        body: { userIds },
      }),
      transformResponse: unwrap<Conversation>,
      invalidatesTags: ['Conversations'],
    }),
    setMemberRole: builder.mutation<
      Conversation,
      ConversationArg & { userId: string; role: ConversationRole }
    >({
      query: ({ conversationId, userId, role }) => ({
        url: `/chat/conversations/${conversationId}/members/${userId}`,
        method: 'PATCH',
        body: { role },
      }),
      transformResponse: unwrap<Conversation>,
      invalidatesTags: ['Conversations'],
    }),
    removeMember: builder.mutation<null, ConversationArg & { userId: string }>({
      query: ({ conversationId, userId }) => ({
        url: `/chat/conversations/${conversationId}/members/${userId}`,
        method: 'DELETE',
      }),
      transformResponse: unwrap<null>,
      invalidatesTags: ['Conversations'],
    }),

    sendMessage: builder.mutation<Message, ConversationArg & SendMessageRequest>({
      query: ({ conversationId, ...body }) => ({
        url: `/chat/conversations/${conversationId}/messages`,
        method: 'POST',
        body,
      }),
      transformResponse: unwrap<Message>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        upsertMessageInCache(dispatch, data);
      },
    }),
    editMessage: builder.mutation<Message, ConversationArg & { messageId: string; body: string }>({
      query: ({ conversationId, messageId, body }) => ({
        url: `/chat/conversations/${conversationId}/messages/${messageId}`,
        method: 'PATCH',
        body: { body },
      }),
      transformResponse: unwrap<Message>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        upsertMessageInCache(dispatch, (await queryFulfilled).data);
      },
    }),
    deleteMessage: builder.mutation<Message, ConversationArg & { messageId: string }>({
      query: ({ conversationId, messageId }) => ({
        url: `/chat/conversations/${conversationId}/messages/${messageId}`,
        method: 'DELETE',
      }),
      transformResponse: unwrap<Message>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        upsertMessageInCache(dispatch, (await queryFulfilled).data);
      },
    }),
    toggleReaction: builder.mutation<
      Message,
      ConversationArg & { messageId: string; emoji: ReactionEmoji }
    >({
      query: ({ conversationId, messageId, emoji }) => ({
        url: `/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
        method: 'POST',
        body: { emoji },
      }),
      transformResponse: unwrap<Message>,
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        upsertMessageInCache(dispatch, (await queryFulfilled).data);
      },
    }),

    markConversationRead: builder.mutation<null, ConversationArg>({
      query: ({ conversationId }) => ({
        url: `/chat/conversations/${conversationId}/read`,
        method: 'POST',
      }),
      // Clear the badge immediately; the receipt event syncs everyone else.
      async onQueryStarted({ conversationId }, { dispatch }) {
        dispatch(
          chatApi.util.updateQueryData('listConversations', undefined, (draft) => {
            const conversation = draft.find((c) => c.id === conversationId);
            if (conversation) conversation.unreadCount = 0;
          }),
        );
      },
    }),
  }),
});

// ── Cache helpers shared by mutations and the realtime provider ─────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDispatch = ThunkDispatch<any, unknown, UnknownAction>;

function byTime(a: Message, b: Message): number {
  return a.createdAt === b.createdAt
    ? a.id.localeCompare(b.id)
    : a.createdAt.localeCompare(b.createdAt);
}

/** Inserts or replaces a message in its thread cache and refreshes the conversation's preview. */
export function upsertMessageInCache(dispatch: AnyDispatch, message: Message): void {
  dispatch(
    chatApi.util.updateQueryData(
      'getMessages',
      { conversationId: message.conversationId },
      (draft) => {
        const index = draft.items.findIndex((m) => m.id === message.id);
        if (index >= 0) draft.items[index] = message;
        else {
          draft.items.push(message);
          draft.items.sort(byTime);
        }
      },
    ),
  );

  dispatch(
    chatApi.util.updateQueryData('listConversations', undefined, (draft) => {
      const conversation = draft.find((c) => c.id === message.conversationId);
      if (!conversation) return;
      const last = conversation.lastMessage;
      if (!last || last.id === message.id || last.createdAt <= message.createdAt) {
        conversation.lastMessage = {
          id: message.id,
          body: message.body,
          type: message.type,
          senderId: message.senderId,
          senderName: message.senderName,
          deleted: Boolean(message.deletedAt),
          createdAt: message.createdAt,
        };
        if (message.createdAt > conversation.updatedAt) conversation.updatedAt = message.createdAt;
        draft.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      }
    }),
  );
}

export function bumpUnreadInCache(dispatch: AnyDispatch, conversationId: string): void {
  dispatch(
    chatApi.util.updateQueryData('listConversations', undefined, (draft) => {
      const conversation = draft.find((c) => c.id === conversationId);
      if (conversation) conversation.unreadCount += 1;
    }),
  );
}

export function applyReceiptInCache(dispatch: AnyDispatch, receipt: ReceiptUpdatePayload): void {
  dispatch(
    chatApi.util.updateQueryData('listConversations', undefined, (draft) => {
      const member = draft
        .find((c) => c.id === receipt.conversationId)
        ?.members.find((m) => m.userId === receipt.userId);
      if (!member) return;
      if (receipt.lastReadAt > member.lastReadAt) member.lastReadAt = receipt.lastReadAt;
      if (receipt.lastDeliveredAt > member.lastDeliveredAt) {
        member.lastDeliveredAt = receipt.lastDeliveredAt;
      }
    }),
  );
}

export const {
  useListConversationsQuery,
  useGetMessagesQuery,
  useLazyGetMessagesQuery,
  useCreateDirectConversationMutation,
  useCreateGroupMutation,
  useCreateBroadcastMutation,
  useUpdateConversationMutation,
  useAddMembersMutation,
  useSetMemberRoleMutation,
  useRemoveMemberMutation,
  useSendMessageMutation,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useToggleReactionMutation,
  useMarkConversationReadMutation,
} = chatApi;
