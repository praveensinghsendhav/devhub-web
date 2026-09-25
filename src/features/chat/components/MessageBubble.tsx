'use client';

import { memo, useState } from 'react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { Ban, Copy, CornerUpLeft, Pencil, SmilePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  REACTION_EMOJIS,
  type Conversation,
  type Message,
  type ReactionEmoji,
} from '@devhub/shared-types';
import { Avatar } from '../../../common/components/Avatar';
import { copyText } from '../../../common/lib/clipboard';
import { cn } from '../../../common/lib/cn';
import { extractErrorMessage } from '../../../store/apiBase';
import { useDeleteMessageMutation, useToggleReactionMutation } from '../chatApi';
import { receiptFor } from '../chatHooks';
import { ReceiptTicks } from './ReceiptTicks';

export function scrollToMessage(messageId: string) {
  const el = document.getElementById(`msg-${messageId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.animate(
    [
      { transform: 'scale(1)', filter: 'brightness(1)' },
      { transform: 'scale(1.03)', filter: 'brightness(1.35)' },
      { transform: 'scale(1)', filter: 'brightness(1)' },
    ],
    { duration: 700, easing: 'ease-out' },
  );
}

function ToolbarButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-hover',
        danger ? 'hover:text-busy' : 'hover:text-text',
      )}
    >
      {children}
    </button>
  );
}

interface MessageBubbleProps {
  message: Message;
  conversation: Conversation;
  selfId: string;
  /** First message of a run by the same sender. */
  isRunStart: boolean;
  /** Last message of a run by the same sender. */
  isRunEnd: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  conversation,
  selfId,
  isRunStart,
  isRunEnd,
  onReply,
  onEdit,
}: MessageBubbleProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toggleReaction] = useToggleReactionMutation();
  const [deleteMessage] = useDeleteMessageMutation();

  const isOwn = message.senderId === selfId;
  const isDeleted = Boolean(message.deletedAt);
  const isGroupLike = conversation.type !== 'direct';
  const canModerate = isGroupLike && conversation.myRole === 'admin';
  const showIdentity = !isOwn && isGroupLike;
  const nameById = new Map(conversation.members.map((m) => [m.userId, m.name]));

  async function react(emoji: ReactionEmoji) {
    setPickerOpen(false);
    try {
      await toggleReaction({
        conversationId: message.conversationId,
        messageId: message.id,
        emoji,
      }).unwrap();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  async function remove() {
    if (
      !window.confirm(isOwn ? 'Delete this message for everyone?' : 'Delete this member’s message?')
    )
      return;
    try {
      await deleteMessage({
        conversationId: message.conversationId,
        messageId: message.id,
      }).unwrap();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  function copy() {
    copyText(message.body).then(
      () => toast.success('Copied'),
      () => toast.error('Couldn’t copy the message'),
    );
  }

  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'group relative flex gap-2',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        isRunStart ? 'mt-3' : 'mt-0.5',
      )}
    >
      {showIdentity && (
        <div className="w-8 shrink-0 self-end">
          {isRunEnd && (
            <Avatar name={message.senderName} avatarUrl={message.senderAvatarUrl} size="sm" />
          )}
        </div>
      )}

      <div
        className={cn('flex max-w-[min(34rem,78%)] flex-col', isOwn ? 'items-end' : 'items-start')}
      >
        {showIdentity && isRunStart && (
          <span className="mb-1 ml-3 text-xs font-semibold text-accent">{message.senderName}</span>
        )}

        <div className="relative">
          <div
            className={cn(
              'relative rounded-3xl px-4 py-2.5 text-sm leading-relaxed',
              isOwn ? 'bubble-own' : 'bubble-other',
              isOwn && isRunEnd && 'rounded-br-md',
              !isOwn && isRunEnd && 'rounded-bl-md',
              isDeleted && 'opacity-70',
            )}
          >
            {message.replyTo && !isDeleted && (
              <button
                type="button"
                onClick={() => scrollToMessage(message.replyTo!.id)}
                className={cn(
                  'mb-1.5 block w-full rounded-xl border-l-[3px] px-2.5 py-1.5 text-left text-xs',
                  isOwn ? 'border-white/60 bg-black/10' : 'border-accent bg-bg-hover/70',
                )}
              >
                <span className="block font-semibold">
                  {message.replyTo.senderId === selfId ? 'You' : message.replyTo.senderName}
                </span>
                <span className="line-clamp-2 opacity-80">
                  {message.replyTo.deleted ? 'Message deleted' : message.replyTo.body}
                </span>
              </button>
            )}

            {isDeleted ? (
              <span className="flex items-center gap-1.5 italic">
                <Ban className="h-3.5 w-3.5" /> This message was deleted
              </span>
            ) : (
              <p className="break-words whitespace-pre-wrap">{message.body}</p>
            )}

            <span
              className={cn(
                'mt-1 flex items-center justify-end gap-1 text-[10px]',
                isOwn ? 'opacity-75' : 'text-text-muted',
              )}
            >
              {message.editedAt && !isDeleted && <span>edited ·</span>}
              {format(new Date(message.createdAt), 'p')}
              {isOwn && !isDeleted && <ReceiptTicks state={receiptFor(message, conversation)} />}
            </span>
          </div>

          {/* Hover toolbar */}
          {!isDeleted && (
            <div
              className={cn(
                'pointer-events-none absolute -top-9 z-20 flex items-center gap-0.5 rounded-xl border border-border bg-bg-elevated p-0.5 opacity-0 shadow-xl transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100',
                isOwn ? 'right-2' : 'left-2',
                pickerOpen && 'pointer-events-auto opacity-100',
              )}
            >
              <ToolbarButton label="React" onClick={() => setPickerOpen((v) => !v)}>
                <SmilePlus className="h-4 w-4" />
              </ToolbarButton>
              {conversation.canPost && (
                <ToolbarButton label="Reply" onClick={() => onReply(message)}>
                  <CornerUpLeft className="h-4 w-4" />
                </ToolbarButton>
              )}
              <ToolbarButton label="Copy" onClick={copy}>
                <Copy className="h-4 w-4" />
              </ToolbarButton>
              {isOwn && (
                <ToolbarButton label="Edit" onClick={() => onEdit(message)}>
                  <Pencil className="h-4 w-4" />
                </ToolbarButton>
              )}
              {(isOwn || canModerate) && (
                <ToolbarButton label="Delete" onClick={() => void remove()} danger>
                  <Trash2 className="h-4 w-4" />
                </ToolbarButton>
              )}
            </div>
          )}

          <AnimatePresence>
            {pickerOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'absolute -top-[5.25rem] z-30 flex gap-0.5 rounded-2xl border border-border bg-bg-elevated p-1 shadow-2xl',
                  isOwn ? 'right-0' : 'left-0',
                )}
                onMouseLeave={() => setPickerOpen(false)}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void react(emoji)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xl transition-colors hover:bg-bg-hover"
                    aria-label={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {message.reactions.length > 0 && (
          <div
            className={cn(
              '-mt-2 flex flex-wrap gap-1 px-2',
              isOwn ? 'justify-end' : 'justify-start',
            )}
          >
            {message.reactions.map((reaction) => {
              const mine = reaction.userIds.includes(selfId);
              const names = reaction.userIds
                .map((id) => (id === selfId ? 'You' : (nameById.get(id) ?? 'Someone')))
                .join(', ');
              return (
                <button
                  key={reaction.emoji}
                  type="button"
                  onClick={() => void react(reaction.emoji)}
                  title={names}
                  className={cn(
                    'relative z-10 flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs shadow-md',
                    mine
                      ? 'border-primary/60 bg-primary/20 text-text'
                      : 'border-border bg-bg-elevated text-text-muted',
                  )}
                >
                  <span>{reaction.emoji}</span>
                  <span className="font-semibold">{reaction.userIds.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export function SystemMessage({ message }: { message: Message }) {
  return (
    <motion.div
      id={`msg-${message.id}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="my-3 flex justify-center"
    >
      <span className="glass-panel rounded-full px-3 py-1 text-center text-xs text-text-muted">
        {message.body}
      </span>
    </motion.div>
  );
}
