'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerUpLeft, Lock, Pencil, Send, Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  MESSAGE_MAX_LENGTH,
  SOCKET_EVENTS,
  type Conversation,
  type Message,
  type TypingRequest,
} from '@devhub/shared-types';
import { getSocket } from '../../../common/lib/socketClient';
import { cn } from '../../../common/lib/cn';
import { extractErrorMessage } from '../../../store/apiBase';
import { useEditMessageMutation, useSendMessageMutation } from '../chatApi';

const TYPING_IDLE_MS = 2_500;
const QUICK_EMOJIS = ['😀', '😂', '😍', '🤔', '👍', '🙏', '🎉', '🔥', '🚀', '✅', '👀', '💯'];

export function MessageComposer({
  conversation,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
}: {
  conversation: Conversation;
  replyTo: Message | null;
  editing: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
}) {
  const conversationId = conversation.id;
  const [body, setBody] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [sendMessage, { isLoading: sending }] = useSendMessageMutation();
  const [editMessage, { isLoading: saving }] = useEditMessageMutation();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingRef = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (typingRef.current === isTyping) return;
      typingRef.current = isTyping;
      const payload: TypingRequest = { conversationId, isTyping };
      getSocket()?.emit(SOCKET_EVENTS.TYPING, payload);
    },
    [conversationId],
  );

  // Always clear "typing…" when leaving the conversation.
  useEffect(
    () => () => {
      clearTimeout(idleTimer.current);
      setTyping(false);
    },
    [setTyping],
  );

  useEffect(() => {
    if (editing) {
      setBody(editing.body);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [editing]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  // Auto-grow up to ~6 lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [body]);

  if (!conversation.canPost) {
    return (
      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="glass-panel flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm text-text-muted">
          <Lock className="h-4 w-4" />
          {conversation.type === 'broadcast'
            ? 'This is a broadcast — only admins can post. You can still react to messages.'
            : 'Only admins can send messages in this group.'}
        </div>
      </div>
    );
  }

  function onChange(value: string) {
    setBody(value);
    if (editing) return;
    setTyping(value.trim().length > 0);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setTyping(false), TYPING_IDLE_MS);
  }

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || sending || saving) return;

    clearTimeout(idleTimer.current);
    setTyping(false);

    if (editing) {
      try {
        await editMessage({ conversationId, messageId: editing.id, body: trimmed }).unwrap();
        setBody('');
        onCancelEdit();
      } catch (error) {
        toast.error(extractErrorMessage(error));
      }
      return;
    }

    setBody('');
    const replyToId = replyTo?.id;
    onCancelReply();
    try {
      await sendMessage({ conversationId, body: trimmed, replyToId }).unwrap();
    } catch (error) {
      toast.error(extractErrorMessage(error));
      setBody(trimmed);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit();
    } else if (event.key === 'Escape') {
      if (editing) {
        setBody('');
        onCancelEdit();
      } else if (replyTo) onCancelReply();
    }
  }

  function insertEmoji(emoji: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const next = body.slice(0, start) + emoji + body.slice(end);
    setBody(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  }

  const banner = editing
    ? {
        icon: Pencil,
        title: 'Editing message',
        text: editing.body,
        cancel: () => {
          setBody('');
          onCancelEdit();
        },
      }
    : replyTo
      ? {
          icon: CornerUpLeft,
          title: `Replying to ${replyTo.senderName}`,
          text: replyTo.body,
          cancel: onCancelReply,
        }
      : null;
  const remaining = MESSAGE_MAX_LENGTH - body.length;

  return (
    <div className="px-3 pb-3 sm:px-5 sm:pb-5">
      <div className="glass-panel relative rounded-3xl shadow-2xl shadow-black/20 focus-within:border-primary/50 focus-within:shadow-primary/15">
        <AnimatePresence initial={false}>
          {banner && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 border-b border-border px-4 py-2.5">
                <banner.icon className="h-4 w-4 shrink-0 text-accent" />
                <div className="min-w-0 flex-1 border-l-2 border-accent pl-2.5">
                  <p className="text-xs font-semibold text-accent">{banner.title}</p>
                  <p className="truncate text-xs text-text-muted">{banner.text}</p>
                </div>
                <button
                  type="button"
                  onClick={banner.cancel}
                  className="rounded-lg p-1 text-text-muted hover:bg-bg-hover hover:text-text"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-2 p-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmojiOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl text-text-muted transition-colors hover:bg-bg-hover hover:text-text"
              aria-label="Insert emoji"
            >
              <Smile className="h-5 w-5" />
            </button>
            <AnimatePresence>
              {emojiOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-12 left-0 z-30 grid w-64 grid-cols-6 gap-1 rounded-2xl border border-border bg-bg-elevated p-2 shadow-2xl"
                  onMouseLeave={() => setEmojiOpen(false)}
                >
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="flex h-9 items-center justify-center rounded-xl text-xl transition-colors hover:bg-bg-hover"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MESSAGE_MAX_LENGTH}
            placeholder={
              conversation.type === 'broadcast'
                ? 'Write an announcement…'
                : `Message ${conversation.type === 'direct' ? conversation.name.split(' ')[0] : conversation.name}…`
            }
            className="max-h-[168px] min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-sm leading-relaxed text-text outline-none placeholder:text-text-muted"
          />

          {remaining < 200 && (
            <span
              className={cn(
                'self-center text-[11px]',
                remaining < 0 ? 'text-busy' : 'text-text-muted',
              )}
            >
              {remaining}
            </span>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={!body.trim() || sending || saving}
            className="btn-3d flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground disabled:opacity-40"
            aria-label={editing ? 'Save edit' : 'Send message'}
          >
            {editing ? <Pencil className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <p className="mt-1.5 hidden text-center text-[11px] text-text-muted sm:block">
        <kbd className="font-sans">Enter</kbd> to send ·{' '}
        <kbd className="font-sans">Shift + Enter</kbd> for a new line
        {(editing || replyTo) && ' · Esc to cancel'}
      </p>
    </div>
  );
}
