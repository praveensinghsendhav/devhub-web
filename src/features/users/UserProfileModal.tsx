'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Calendar, Mail, MessageCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Role } from '@devhub/shared-types';
import { Modal } from '../../common/components/Modal';
import { Avatar } from '../../common/components/Avatar';
import { Button } from '../../common/components/Button';
import { useCan } from '../../common/rbac/usePermission';
import { cn } from '../../common/lib/cn';
import { useAppSelector } from '../../store/hooks';
import { extractErrorMessage } from '../../store/apiBase';
import { useGetStatusesQuery } from '../presence/presenceApi';
import { useCreateDirectConversationMutation } from '../chat/chatApi';
import { lastSeenLabel, useSelfId } from '../chat/chatHooks';

export interface ProfileUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  roles?: Role[];
  joinedAt?: string;
}

function roleLabel(role: Role): string {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** A teammate's profile: live status, contact details, and a shortcut to message them. */
export function UserProfileModal({
  user,
  onClose,
}: {
  user: ProfileUser | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const selfId = useSelfId();
  const canMessage = useCan('chat:create');
  const [createDirect, { isLoading }] = useCreateDirectConversationMutation();

  // Loads this person's current status into the presence store; live updates keep it fresh.
  useGetStatusesQuery(user ? [user.id] : [], { skip: !user });
  const presence = useAppSelector((state) => (user ? state.presence.byUserId[user.id] : undefined));
  const live = {
    status: presence?.status ?? 'offline',
    customStatus: presence?.customStatus ?? null,
    lastSeenAt: presence?.lastSeenAt ?? null,
  } as const;

  const isSelf = user?.id === selfId;

  async function message() {
    if (!user) return;
    try {
      const conversation = await createDirect({ userId: user.id }).unwrap();
      onClose();
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <Modal open={Boolean(user)} onClose={onClose} title="Profile" className="max-w-md">
      {user && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-center text-center">
            <Avatar name={user.name} avatarUrl={user.avatarUrl} status={live.status} size="lg" />
            <h3 className="mt-3 text-lg font-semibold text-text">
              {user.name}
              {isSelf && <span className="ml-1.5 text-sm font-normal text-text-muted">(you)</span>}
            </h3>
            <p
              className={cn(
                'text-sm',
                live.status === 'online' ? 'text-online' : 'text-text-muted',
              )}
            >
              {lastSeenLabel(live)}
            </p>
            {live.customStatus && (
              <p className="mt-2 rounded-full border border-border bg-bg px-3 py-1 text-sm text-text">
                {live.customStatus}
              </p>
            )}
          </div>

          <dl className="space-y-2.5 rounded-xl border border-border p-4 text-sm">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0 text-text-muted" />
              <dt className="sr-only">Email</dt>
              <dd className="min-w-0 truncate">
                <a href={`mailto:${user.email}`} className="text-text hover:text-primary">
                  {user.email}
                </a>
              </dd>
            </div>
            {user.roles && user.roles.length > 0 && (
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-text-muted" />
                <dt className="sr-only">Role</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {user.roles.map((role) => (
                    <span
                      key={role}
                      className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {roleLabel(role)}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {user.joinedAt && (
              <div className="flex items-center gap-2.5 text-text-muted">
                <Calendar className="h-4 w-4 shrink-0" />
                <dt className="sr-only">Joined</dt>
                <dd>Joined {format(new Date(user.joinedAt), 'MMM d, yyyy')}</dd>
              </div>
            )}
          </dl>

          {!isSelf && canMessage && (
            <Button size="lg" onClick={() => void message()} disabled={isLoading}>
              <MessageCircle className="h-4 w-4" />
              {isLoading ? 'Opening chat…' : `Message ${user.name.split(' ')[0]}`}
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}
