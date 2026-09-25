import type { PresenceStatus } from '@devhub/shared-types';
import { cn } from '../lib/cn';
import { StatusDot } from './StatusDot';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  status?: PresenceStatus;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function Avatar({ name, avatarUrl, status, size = 'md', className }: AvatarProps) {
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className={cn('rounded-full object-cover', SIZE_CLASSES[size])}
        />
      ) : (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-primary font-medium text-primary-foreground',
            SIZE_CLASSES[size],
          )}
        >
          {initials(name) || '?'}
        </span>
      )}
      {status && <StatusDot status={status} className="absolute right-0 bottom-0" />}
    </span>
  );
}
