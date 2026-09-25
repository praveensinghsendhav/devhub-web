'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { MessageSquareOff } from 'lucide-react';
import type { Conversation, Message } from '@devhub/shared-types';
import { useAppDispatch } from '../../../../store/hooks';
import { useListConversationsQuery } from '../../../../features/chat/chatApi';
import { activeConversationChanged } from '../../../../features/chat/chatSlice';
import { useConversation, useSelfId } from '../../../../features/chat/chatHooks';
import { ChatHeader } from '../../../../features/chat/components/ChatHeader';
import { MessageThread } from '../../../../features/chat/components/MessageThread';
import { MessageComposer } from '../../../../features/chat/components/MessageComposer';
import { ConversationDetails } from '../../../../features/chat/components/ConversationDetails';

function ConversationView({
  conversation,
  selfId,
}: {
  conversation: Conversation;
  selfId: string;
}) {
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const startReply = useCallback((message: Message) => {
    setEditing(null);
    setReplyTo(message);
  }, []);
  const startEdit = useCallback((message: Message) => {
    setReplyTo(null);
    setEditing(message);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <div className="chat-stage flex min-w-0 flex-1 flex-col">
        <ChatHeader
          conversation={conversation}
          detailsOpen={detailsOpen}
          onToggleDetails={() => setDetailsOpen((v) => !v)}
        />
        <MessageThread
          conversation={conversation}
          selfId={selfId}
          onReply={startReply}
          onEdit={startEdit}
        />
        <MessageComposer
          conversation={conversation}
          replyTo={replyTo}
          editing={editing}
          onCancelReply={() => setReplyTo(null)}
          onCancelEdit={() => setEditing(null)}
        />
      </div>
      <AnimatePresence>
        {detailsOpen && (
          <ConversationDetails
            conversation={conversation}
            selfId={selfId}
            onClose={() => setDetailsOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const dispatch = useAppDispatch();
  const selfId = useSelfId();
  const { isLoading } = useListConversationsQuery();
  const conversation = useConversation(conversationId);

  useEffect(() => {
    dispatch(activeConversationChanged(conversationId));
    return () => {
      dispatch(activeConversationChanged(null));
    };
  }, [conversationId, dispatch]);

  if (isLoading || !selfId) {
    return <div className="chat-stage flex-1" />;
  }

  if (!conversation) {
    return (
      <div className="chat-stage flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <MessageSquareOff className="h-8 w-8 text-text-muted" />
        <p className="text-sm text-text-muted">
          This conversation doesn’t exist or you’re no longer in it.
        </p>
        <Link href="/chat" className="text-sm font-medium text-primary hover:underline">
          Back to chats
        </Link>
      </div>
    );
  }

  // Keyed so reply/edit drafts and scroll state never leak between conversations.
  return <ConversationView key={conversation.id} conversation={conversation} selfId={selfId} />;
}
