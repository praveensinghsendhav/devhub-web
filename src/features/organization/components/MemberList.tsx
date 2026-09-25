'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MessageCircle, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { OrganizationMember } from '@devhub/shared-types';
import { useListMembersQuery } from '../organizationApi';
import { Avatar } from '../../../common/components/Avatar';
import { useCan } from '../../../common/rbac/usePermission';
import { extractErrorMessage } from '../../../store/apiBase';
import { useGetStatusesQuery } from '../../presence/presenceApi';
import { useCreateDirectConversationMutation } from '../../chat/chatApi';
import { usePresenceMap } from '../../chat/chatHooks';
import { UserProfileModal, type ProfileUser } from '../../users/UserProfileModal';

function roleText(member: OrganizationMember): string {
  return member.roles
    .map((r) => r.charAt(0) + r.slice(1).toLowerCase().replace('_', ' '))
    .join(', ');
}

export function MemberList({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const { data: members = [], isLoading } = useListMembersQuery();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ProfileUser | null>(null);
  const canMessage = useCan('chat:create');
  const [createDirect] = useCreateDirectConversationMutation();

  // Load everyone's current status once; presence events keep it live afterwards.
  useGetStatusesQuery(
    members.map((m) => m.id),
    { skip: members.length === 0 },
  );
  const presence = usePresenceMap();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, query]);

  async function message(member: OrganizationMember) {
    try {
      const conversation = await createDirect({ userId: member.id }).unwrap();
      router.push(`/chat/${conversation.id}`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-xl bg-bg-hover" />;
  }

  return (
    <>
      {members.length > 5 && (
        <label className="mb-3 flex h-10 items-center gap-2 rounded-lg border border-border bg-bg px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${members.length} members`}
            className="h-full flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          />
        </label>
      )}

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-text-muted">
            No one matches that search.
          </li>
        )}
        {visible.map((member) => {
          const isSelf = member.id === currentUserId;
          return (
            <li
              key={member.id}
              className="flex items-center gap-2 pr-2 transition-colors hover:bg-bg-hover"
            >
              <button
                type="button"
                onClick={() =>
                  setSelected({
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    avatarUrl: member.avatarUrl,
                    roles: member.roles,
                    joinedAt: member.joinedAt,
                  })
                }
                className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left"
                aria-label={`View ${member.name}’s profile`}
              >
                <Avatar
                  name={member.name}
                  avatarUrl={member.avatarUrl}
                  status={presence[member.id] ?? 'offline'}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">
                    {member.name}
                    {isSelf && (
                      <span className="ml-1.5 text-xs font-normal text-text-muted">(you)</span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-text-muted">{member.email}</span>
                </span>
                <span className="hidden text-xs font-medium text-text-muted sm:block">
                  {roleText(member) || '—'}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
              </button>
              {!isSelf && canMessage && (
                <button
                  type="button"
                  onClick={() => void message(member)}
                  className="rounded-lg p-2 text-text-muted transition-colors hover:bg-primary/10 hover:text-primary"
                  aria-label={`Message ${member.name}`}
                  title={`Message ${member.name}`}
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <UserProfileModal user={selected} onClose={() => setSelected(null)} />
    </>
  );
}
