'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import { PRESENCE_STATUSES, type PresenceStatus } from '@devhub/shared-types';
import { useAppSelector } from '../../store/hooks';
import { extractErrorMessage } from '../../store/apiBase';
import { StatusDot } from '../../common/components/StatusDot';
import { cn } from '../../common/lib/cn';
import { useUpdateStatusMutation } from './presenceApi';
import { PresenceAvatar } from '../chat/components/ChatAvatar';
import { STATUS_LABELS } from '../chat/chatHooks';

const PICKABLE = PRESENCE_STATUSES.filter((s) => s !== 'offline');
const SUGGESTIONS = [
  '🎯 Focusing',
  '🍕 Lunch break',
  '📞 In a meeting',
  '🚀 Shipping',
  '🌴 Out today',
];

/** "You" card at the top of the chat list — status + custom status, editable in place. */
export function MyStatusCard() {
  const user = useAppSelector((state) => state.auth.user);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [updateStatus, { isLoading }] = useUpdateStatusMutation();

  useEffect(() => {
    if (open) setDraft(user?.customStatus ?? '');
  }, [open, user?.customStatus]);

  if (!user) return null;

  const self = {
    userId: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    role: 'member' as const,
    joinedAt: '',
    lastReadAt: '',
    lastDeliveredAt: '',
    status: user.status,
    customStatus: user.customStatus,
    lastSeenAt: null,
  };

  async function save(status: PresenceStatus, customStatus: string | null) {
    try {
      await updateStatus({ status, customStatus }).unwrap();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await save(
      user!.status === 'offline' ? 'online' : user!.status,
      draft.trim().slice(0, 120) || null,
    );
    setOpen(false);
  }

  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="glass-panel flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors hover:bg-bg-hover"
      >
        <PresenceAvatar member={self} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-text">{user.name}</span>
          <span className="block truncate text-xs text-text-muted">
            {user.customStatus || STATUS_LABELS[user.status]}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-border bg-bg-elevated p-2 shadow-2xl shadow-black/30"
          >
            <div className="grid grid-cols-2 gap-1">
              {PICKABLE.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => void save(status, user.customStatus)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-text hover:bg-bg-hover',
                    user.status === status && 'bg-bg-hover ring-1 ring-primary/40',
                  )}
                >
                  <StatusDot status={status} />
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-2 border-t border-border pt-2">
              <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-bg px-2.5 focus-within:border-primary">
                <Smile className="h-4 w-4 text-text-muted" />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={120}
                  placeholder="What’s your status?"
                  className="h-full flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
                />
                {draft && (
                  <button
                    type="button"
                    onClick={() => setDraft('')}
                    className="text-text-muted hover:text-text"
                    aria-label="Clear status"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </label>
              <div className="mt-2 flex flex-wrap gap-1">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setDraft(suggestion)}
                    className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted hover:border-primary/50 hover:text-text"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 h-9 w-full rounded-lg bg-primary text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                Save status
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
