'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { CalendarDays, MessageSquare, PenSquare, Video, LogOut, Users } from 'lucide-react';
import type { Permission } from '@devhub/shared-types';
import { cn } from '../lib/cn';
import { useCan } from '../rbac/usePermission';
import { useAuth } from '../../features/auth/useAuth';
import { Avatar } from './Avatar';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { useListConversationsQuery } from '../../features/chat/chatApi';
import { StatusPicker } from '../../features/presence/StatusPicker';
import { useListMeetingInvitationsQuery } from '../../features/meetings/meetingsApi';
import { useMeetingSession } from '../../features/meetings/useMeetingSession';

export interface NavItem {
  href: string;
  label: string;
  icon: typeof MessageSquare;
  permission: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/chat', label: 'Chat', icon: MessageSquare, permission: 'chat:read' },
  { href: '/whiteboard', label: 'Whiteboard', icon: PenSquare, permission: 'whiteboard:read' },
  { href: '/meeting', label: 'Meetings', icon: Video, permission: 'meeting:read' },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays, permission: 'meeting:read' },
  { href: '/team', label: 'Team', icon: Users, permission: 'users:read' },
];

function useTotalUnread(enabled: boolean): number {
  const { data } = useListConversationsQuery(undefined, { skip: !enabled });
  return data?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
}

/** Invitations you haven’t answered yet — they aren’t on your calendar until you do. */
function usePendingInvitations(enabled: boolean): number {
  const { data } = useListMeetingInvitationsQuery(undefined, { skip: !enabled });
  return data?.length ?? 0;
}

/** Shared by the desktop sidebar and the mobile tab bar. */
export function useNavItemState(item: NavItem) {
  const pathname = usePathname();
  const allowed = useCan(item.permission);
  const active = pathname.startsWith(item.href);
  const unreadChat = useTotalUnread(allowed && item.href === '/chat');
  const invitations = usePendingInvitations(allowed && item.href === '/calendar');
  const unread = item.href === '/chat' ? unreadChat : item.href === '/calendar' ? invitations : 0;
  const inCall = useMeetingSession((s) => s.phase === 'in-call') && item.href === '/meeting';
  return { allowed, active, unread, inCall };
}

function NavLink({ item }: { item: NavItem }) {
  const { allowed, active, unread, inCall } = useNavItemState(item);

  if (!allowed) return null;

  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
        active ? 'text-primary-foreground' : 'text-text-muted hover:bg-bg-hover hover:text-text',
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-xl bg-primary"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <item.icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={2} />
      <span className="relative z-10">{item.label}</span>
      {inCall && (
        <span
          className="relative z-10 ml-auto h-2 w-2 animate-pulse rounded-full bg-online"
          title="You’re in a call"
        />
      )}
      {unread > 0 && (
        <span
          className={cn(
            'relative z-10 ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold',
            active ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground',
          )}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-bg-elevated px-3 py-4 md:flex">
      <div className="px-2 pb-6">
        <Logo href="/chat" />
        {user.organization && (
          <p className="mt-2 truncate pl-10 text-xs text-text-muted">{user.organization.name}</p>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} status={user.status} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{user.name}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>
        </div>
        <StatusPicker current={user.status} />
        <ThemeToggle />

        <button
          type="button"
          onClick={() => void logout()}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-busy"
        >
          <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
