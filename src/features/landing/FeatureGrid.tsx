'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  Building2,
  Laptop,
  MessageSquare,
  PenSquare,
  ShieldCheck,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { TiltCard } from './TiltCard';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  soon?: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: MessageSquare,
    title: 'Realtime chat',
    description:
      'Direct conversations that update instantly over WebSockets, with unread counts that stay in sync across tabs.',
  },
  {
    icon: Activity,
    title: 'Live presence',
    description:
      'See who is online, away, busy or in do-not-disturb, plus a custom status line for everything else.',
  },
  {
    icon: Building2,
    title: 'Private organizations',
    description:
      'Every team gets its own space. Members only see and message people inside their organization.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description:
      'Admins, members and guests each get exactly the permissions they need, enforced on every request.',
  },
  {
    icon: Laptop,
    title: 'Multi-device sessions',
    description:
      'Stay signed in on your laptop and phone at once. Signing out on one device leaves the others alone.',
  },
  {
    icon: PenSquare,
    title: 'Shared whiteboards',
    description: 'Sketch architecture and plan sprints together on an infinite canvas.',
    soon: true,
  },
  {
    icon: Video,
    title: 'Meetings',
    description: 'Jump from a chat thread into an audio or video call without switching tools.',
    soon: true,
  },
];

export function FeatureGrid() {
  return (
    <section id="features" className="relative scroll-mt-20 px-4 py-24 sm:px-6">
      <SectionHeading
        eyebrow="Features"
        title="Everything your team needs to stay in sync"
        description="DevHub brings conversation and presence into one place today, with whiteboards and meetings on the roadmap."
      />

      <div className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
            // Wide first and last cards make 7 items tile a 3-column grid evenly.
            className={index === 0 || index === FEATURES.length - 1 ? 'lg:col-span-2' : undefined}
          >
            <TiltCard>
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-accent/20 text-primary ring-1 ring-primary/20">
                  <feature.icon className="h-5 w-5" />
                </span>
                {feature.soon && (
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-text-muted">
                    Coming soon
                  </span>
                )}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-text">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{feature.description}</p>
            </TiltCard>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
