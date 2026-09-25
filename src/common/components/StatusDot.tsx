import type { PresenceStatus } from '@devhub/shared-types';
import { cn } from '../lib/cn';

const STATUS_COLOR: Record<PresenceStatus, string> = {
  online: 'bg-online',
  away: 'bg-away',
  busy: 'bg-busy',
  dnd: 'bg-busy',
  in_meeting: 'bg-primary',
  offline: 'bg-offline',
};

export function StatusDot({ status, className }: { status: PresenceStatus; className?: string }) {
  return (
    <span
      className={cn(
        'block h-2.5 w-2.5 rounded-full ring-2 ring-[var(--color-bg-elevated)]',
        STATUS_COLOR[status],
        className,
      )}
      title={status}
    />
  );
}
