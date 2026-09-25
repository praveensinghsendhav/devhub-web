'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export function CtaSection({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="px-4 py-24 sm:px-6">
      <motion.div
        initial={{ opacity: 0, rotateX: 18, y: 40 }}
        whileInView={{ opacity: 1, rotateX: 0, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformPerspective: 1200 }}
        className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-bg-elevated to-accent/15 px-6 py-16 text-center sm:px-16"
      >
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/40 blur-[100px]" />

        <div className="relative">
          <h2 className="text-3xl font-semibold tracking-tight text-text sm:text-5xl">
            Bring your team into orbit
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-text-muted sm:text-lg">
            Register your organization, send a few invites, and start the conversation.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={isAuthenticated ? '/team' : '/register'}
              className="btn-3d group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-medium text-primary-foreground hover:bg-primary-hover"
            >
              {isAuthenticated ? 'Invite your team' : 'Register your organization'}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            {!isAuthenticated && (
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-bg/60 px-7 text-base font-medium text-text backdrop-blur transition-colors hover:bg-bg-hover"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
