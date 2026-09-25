'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { PresenceStatus } from '@devhub/shared-types';
import { PRESENCE_STATUSES } from '@devhub/shared-types';
import { StatusDot } from '../../common/components/StatusDot';
import { useUpdateStatusMutation } from './presenceApi';
import { cn } from '../../common/lib/cn';

const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  dnd: 'Do not disturb',
  in_meeting: 'In a meeting',
  offline: 'Offline',
};

// Offline and in-a-meeting are set automatically, never by hand.
const PICKABLE_STATUSES = PRESENCE_STATUSES.filter((s) => s !== 'offline' && s !== 'in_meeting');

export function StatusPicker({ current }: { current: PresenceStatus }) {
  const [open, setOpen] = useState(false);
  const [updateStatus] = useUpdateStatusMutation();

  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-text-muted transition-colors hover:bg-bg-hover"
      >
        <StatusDot status={current} />
        {STATUS_LABELS[current]}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-48 overflow-hidden rounded-xl border border-border bg-bg-elevated p-1 shadow-lg"
          >
            {PICKABLE_STATUSES.map((status) => (
              <li key={status}>
                <button
                  type="button"
                  onClick={() => {
                    void updateStatus({ status });
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text transition-colors hover:bg-bg-hover',
                    current === status && 'bg-bg-hover',
                  )}
                >
                  <StatusDot status={status} />
                  {STATUS_LABELS[status]}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
