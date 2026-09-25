'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { SendHorizontal } from 'lucide-react';
import { MEETING_CHAT_MAX_LENGTH } from '@devhub/shared-types';
import { cn } from '../../../common/lib/cn';
import { useMeetingSession, meetingSession } from '../useMeetingSession';

/** In-call chat. Relayed live and never stored, so it's gone when the call ends. */
export function MeetingChatPanel() {
  const chat = useMeetingSession((s) => s.chat);
  const selfPeerId = useMeetingSession((s) => s.selfPeerId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat.length]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    if (await meetingSession.sendChat(body)) setText('');
    setSending(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <p className="rounded-lg bg-bg-hover px-3 py-2 text-center text-xs text-text-muted">
          Messages are only visible during the call and are not saved.
        </p>
        {chat.map((message, i) => {
          const mine = message.peerId === selfPeerId;
          const grouped = chat[i - 1]?.peerId === message.peerId;
          return (
            <div
              key={message.id}
              className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}
            >
              {!grouped && (
                <span className="mb-0.5 text-[11px] text-text-muted">
                  {mine ? 'You' : message.name} · {format(new Date(message.sentAt), 'HH:mm')}
                </span>
              )}
              <span
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-1.5 text-sm break-words whitespace-pre-wrap',
                  mine ? 'bubble-own' : 'bubble-other',
                )}
              >
                {message.text}
              </span>
            </div>
          );
        })}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message"
          maxLength={MEETING_CHAT_MAX_LENGTH}
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-bg px-4 text-sm text-text outline-none placeholder:text-text-muted focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
