'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { useAuth } from '../../features/auth/useAuth';
import { StatusPicker } from '../../features/presence/StatusPicker';
import { Avatar } from './Avatar';
import { ThemeToggle } from './ThemeToggle';
import { NAV_ITEMS, useNavItemState, type NavItem } from './Sidebar';

// Screens with their own header and controls (an open chat, a call) get the full height.
const FULL_SCREEN_ROUTES = /^\/(chat|meeting)\/[^/]+/;

function TabLink({ item }: { item: NavItem }) {
  const { allowed, active, unread, inCall } = useNavItemState(item);
  if (!allowed) return null;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
        active ? 'text-primary' : 'text-text-muted',
      )}
    >
      <span className="relative">
        <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
        {inCall && (
          <span className="absolute -top-0.5 -right-1 h-2 w-2 animate-pulse rounded-full bg-online" />
        )}
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}

function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Account"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
            // No overflow clipping here: the status menu opens upward past the sheet's edge.
            className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-3xl border-t border-border bg-bg-elevated px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl"
          >
            <span className="mx-auto h-1 w-10 rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <Avatar name={user.name} avatarUrl={user.avatarUrl} status={user.status} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">{user.name}</p>
                <p className="truncate text-xs text-text-muted">{user.email}</p>
                {user.organization && (
                  <p className="truncate text-xs text-text-muted">{user.organization.name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-text-muted hover:bg-bg-hover hover:text-text"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <StatusPicker current={user.status} />
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void logout()}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-bg-hover hover:text-busy"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
              Sign out
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Bottom tab bar for phones; the sidebar takes over from `md` up. */
export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  if (!user || FULL_SCREEN_ROUTES.test(pathname)) return null;

  return (
    <>
      <nav
        aria-label="Main"
        className="flex shrink-0 items-stretch border-t border-border bg-bg-elevated/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <TabLink key={item.href} item={item} />
        ))}
        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-text-muted"
          aria-label="Account"
        >
          <Avatar name={user.name} avatarUrl={user.avatarUrl} status={user.status} size="xs" />
          <span>Me</span>
        </button>
      </nav>
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </>
  );
}
