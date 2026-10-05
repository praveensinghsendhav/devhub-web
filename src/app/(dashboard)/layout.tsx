'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { Sidebar } from '../../common/components/Sidebar';
import { MobileNav } from '../../common/components/MobileNav';
import { FullScreenSpinner } from '../../common/components/FullScreenSpinner';
import { IncomingCallDialog } from '../../features/meetings/components/IncomingCallDialog';
import { ActiveCallDock } from '../../features/meetings/components/ActiveCallDock';
import { MeetingReminders } from '../../features/meetings/components/MeetingReminders';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login');
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return <FullScreenSpinner />;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        <MobileNav />
      </div>
      {/* Calls follow you around the app: ringing, the in-call dock and reminders. */}
      <IncomingCallDialog />
      <ActiveCallDock />
      <MeetingReminders />
    </div>
  );
}
