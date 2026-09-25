'use client';

import { motion } from 'framer-motion';
import { Cookie, Fingerprint, Gauge, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

// Each item describes a mechanism the platform actually implements today.
const ITEMS = [
  {
    icon: KeyRound,
    title: 'argon2 password hashing',
    description: 'Passwords are hashed with argon2 and never stored or logged in plain text.',
  },
  {
    icon: Cookie,
    title: 'httpOnly refresh cookies',
    description:
      'Short-lived access tokens stay in memory; the long-lived refresh token is never readable by scripts.',
  },
  {
    icon: Fingerprint,
    title: 'Per-device sessions',
    description:
      'Each device gets its own rotating session, so revoking one never disrupts the others.',
  },
  {
    icon: Lock,
    title: 'Single-use invite links',
    description:
      'Invite tokens are stored hashed, expire automatically, and stop working the moment they are used.',
  },
  {
    icon: ShieldCheck,
    title: 'Enforced permissions',
    description: 'Every API route checks the caller’s role-based permissions server-side.',
  },
  {
    icon: Gauge,
    title: 'Rate limiting',
    description:
      'Sign-in, registration and invite endpoints are rate-limited to blunt brute-force attempts.',
  },
];

export function SecuritySection() {
  return (
    <section id="security" className="relative scroll-mt-20 px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow="Security"
        title="Secure by default, not as an add-on"
        description="Your organization’s conversations are protected by the same safeguards on every request."
      />
      <div className="mx-auto mt-14 grid max-w-5xl gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.06 }}
            className="group bg-bg p-6 transition-colors hover:bg-bg-elevated"
          >
            <item.icon className="h-5 w-5 text-accent transition-transform group-hover:scale-110" />
            <h3 className="mt-4 text-base font-semibold text-text">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
