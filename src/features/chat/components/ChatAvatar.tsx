'use client';

import { Megaphone, Users } from 'lucide-react';
import type { Conversation, ConversationMember } from '@devhub/shared-types';
import { Avatar } from '../../../common/components/Avatar';
import { cn } from '../../../common/lib/cn';
import { otherMember, useLivePresence, useSelfId } from '../chatHooks';

type Size = 'sm' | 'md' | 'lg';

/** A person's avatar with a live status dot. */
export function PresenceAvatar({
  member,
  size = 'md',
  className,
}: {
  member: ConversationMember;
  size?: Size;
  className?: string;
}) {
  const presence = useLivePresence(member);

  return (
    <Avatar
      name={member.name}
      avatarUrl={member.avatarUrl}
      status={presence.status}
      size={size}
      className={className}
    />
  );
}

const TILE_SIZE: Record<Size, string> = {
  sm: 'h-9 w-9 rounded-xl [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-11 w-11 rounded-2xl [&_svg]:h-5 [&_svg]:w-5',
  lg: 'h-16 w-16 rounded-3xl [&_svg]:h-7 [&_svg]:w-7',
};

/** Direct → the other person; group/broadcast → a beveled 3D tile with the type's icon. */
export function ConversationAvatar({
  conversation,
  size = 'md',
}: {
  conversation: Conversation;
  size?: Size;
}) {
  const selfId = useSelfId();
  const other = otherMember(conversation, selfId);
  if (other) return <PresenceAvatar member={other} size={size} />;

  const Icon = conversation.type === 'broadcast' ? Megaphone : Users;
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center text-primary-foreground',
        TILE_SIZE[size],
      )}
      style={{
        background:
          conversation.type === 'broadcast'
            ? 'linear-gradient(145deg, var(--color-away), var(--color-busy))'
            : 'linear-gradient(145deg, var(--color-primary), var(--color-accent))',
        boxShadow:
          'inset 0 1px 0 rgb(255 255 255 / 0.35), inset 0 -3px 0 rgb(0 0 0 / 0.18), 0 8px 18px -8px var(--color-primary)',
      }}
    >
      <Icon strokeWidth={2.2} />
    </span>
  );
}
