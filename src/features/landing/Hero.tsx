'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { ArrowRight, MessageSquare, PenSquare, Video } from 'lucide-react';

// WebGL only runs in the browser, and keeping three.js out of the first chunk keeps the hero text instant.
const HeroScene = dynamic(() => import('./HeroScene'), { ssr: false });

const PILLARS = [
  { icon: MessageSquare, label: 'Realtime chat' },
  { icon: PenSquare, label: 'Whiteboards' },
  { icon: Video, label: 'Meetings' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { resolvedTheme } = useTheme();

  return (
    <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden pt-16">
      {/* Backdrop: glow + grid sit behind the WebGL canvas so the hero still looks right without it */}
      <div className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute -top-40 right-[-10%] h-[640px] w-[640px] rounded-full bg-primary/25 blur-[140px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[520px] w-[520px] rounded-full bg-accent/15 blur-[140px]" />
        <div className="bg-grid absolute inset-0" />
      </div>
      {/* On narrow screens the hub sits behind the copy, so it's dimmed to keep text readable */}
      <div className="absolute inset-0 -z-10 opacity-45 lg:opacity-100">
        {/* Keyed by theme: the scene reads theme colors once, so it rebuilds when the theme flips */}
        <HeroScene key={resolvedTheme ?? 'pending'} />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <motion.div
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-bg-elevated/60 px-3 py-1 text-xs font-medium text-text-muted backdrop-blur"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-online shadow-[0_0_8px] shadow-online" />
            Built for developer teams
          </motion.div>

          <motion.h1
            custom={1}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="text-gradient">Your whole team,</span>
            <br />
            <span className="text-text">orbiting one hub.</span>
          </motion.h1>

          <motion.p
            custom={2}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-6 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg"
          >
            DevHub gives your organization a private space to chat in real time, see who&apos;s
            around, and — soon — sketch on shared whiteboards and jump into meetings. Register your
            organization, invite teammates by email, and you&apos;re live.
          </motion.p>

          <motion.div
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href={isAuthenticated ? '/chat' : '/register'}
              className="btn-3d group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-base font-medium text-primary-foreground hover:bg-primary-hover"
            >
              {isAuthenticated ? 'Open your dashboard' : 'Register your organization'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {!isAuthenticated && (
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-bg-elevated/60 px-6 text-base font-medium text-text backdrop-blur transition-colors hover:bg-bg-hover"
              >
                I have an account
              </Link>
            )}
          </motion.div>

          <motion.ul
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-12 flex flex-wrap gap-x-6 gap-y-3"
          >
            {PILLARS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-text-muted">
                <Icon className="h-4 w-4 text-accent" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>
      </div>

      <a
        href="#preview"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-text-muted sm:flex"
        aria-label="Scroll to product preview"
      >
        <span className="flex h-9 w-5 justify-center rounded-full border border-border pt-1.5">
          <motion.span
            className="h-1.5 w-1 rounded-full bg-text-muted"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </a>
    </section>
  );
}
