import { Check, CheckCheck } from 'lucide-react';
import { cn } from '../../../common/lib/cn';
import type { ReceiptState } from '../chatHooks';

const LABEL: Record<ReceiptState, string> = {
  sent: 'Sent',
  delivered: 'Delivered',
  seen: 'Seen',
};

export function ReceiptTicks({ state, className }: { state: ReceiptState; className?: string }) {
  const Icon = state === 'sent' ? Check : CheckCheck;
  return (
    <Icon
      aria-label={LABEL[state]}
      className={cn(
        'h-3.5 w-3.5 shrink-0',
        state === 'seen' ? 'text-accent drop-shadow-[0_0_4px_var(--color-accent)]' : 'opacity-70',
        className,
      )}
      strokeWidth={2.5}
    />
  );
}
