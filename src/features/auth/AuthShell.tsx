'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Activity, MessageSquare, ShieldCheck } from 'lucide-react';
import { Logo } from '../../common/components/Logo';
import { ThemeToggle } from '../../common/components/ThemeToggle';

const HIGHLIGHTS = [
  { icon: MessageSquare, text: 'Realtime chat for your whole organization' },
  { icon: Activity, text: 'Live presence and custom status' },
  { icon: ShieldCheck, text: 'Role-based access for admins, members and guests' },
];

/** Split layout shared by login, register and invite acceptance: brand panel + form panel. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute right-[-10%] bottom-[-10%] h-[420px] w-[420px] rounded-full bg-accent/15 blur-[120px]" />
          <div className="bg-grid absolute inset-0" />
        </div>

        <Logo className="relative" />

        {/* Stacked 3D panes */}
        <div className="relative mx-auto h-72 w-72 [perspective:900px]">
          <div
            className="preserve-3d absolute inset-0"
            style={{ transform: 'rotateX(60deg) rotateZ(-36deg)' }}
          >
            {[0, 1, 2, 3].map((layer) => (
              <div
                key={layer}
                className="absolute inset-6 rounded-3xl border border-primary/30 backdrop-blur-sm"
                style={{
                  transform: `translateZ(${layer * 34}px)`,
                  background:
                    layer === 3
                      ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
                      : `color-mix(in oklab, var(--color-primary) ${6 + layer * 7}%, transparent)`,
                  boxShadow: layer === 3 ? '0 30px 80px -20px var(--color-primary)' : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <ul className="relative flex flex-col gap-4">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-text-muted">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elevated/80 text-accent ring-1 ring-border">
                <Icon className="h-4 w-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo className="lg:invisible" />
          <ThemeToggle compact />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md"
          >
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">{title}</h1>
            <div className="mt-2 text-sm text-text-muted">{subtitle}</div>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-center text-sm text-text-muted">{footer}</div>}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
