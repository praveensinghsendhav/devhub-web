'use client';

import { motion } from 'framer-motion';
import { Building2, KeyRound, MailPlus, type LucideIcon } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

interface Step {
  icon: LucideIcon;
  title: string;
  description: string;
  detail: string;
}

const STEPS: Step[] = [
  {
    icon: Building2,
    title: 'Register your organization',
    description:
      'Add your organization details and your work email. That email becomes both the organization’s main contact and your admin login.',
    detail: 'You become the first admin',
  },
  {
    icon: MailPlus,
    title: 'Invite your team by email',
    description:
      'From the Team page in your dashboard, add teammates’ emails and pick a role. Each person gets a secure, single-use invite link.',
    detail: 'Links expire automatically',
  },
  {
    icon: KeyRound,
    title: 'Teammates set a password & join',
    description:
      'Invitees open the link, choose their own password, and land straight in your organization — signed in with the invited email.',
    detail: 'No shared passwords, ever',
  },
];

function StepVisual({ icon: Icon, index }: { icon: LucideIcon; index: number }) {
  return (
    <div className="relative mx-auto h-40 w-40 [perspective:700px]">
      <motion.div
        className="preserve-3d absolute inset-0"
        initial={{ rotateX: 60, rotateZ: -45 }}
        whileInView={{ rotateX: 55, rotateZ: -45 + index * 8 }}
        whileHover={{ rotateX: 35, rotateZ: -30 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 80, damping: 14 }}
      >
        {[0, 1, 2].map((layer) => (
          <div
            key={layer}
            className="absolute inset-4 rounded-2xl border border-primary/30"
            style={{
              transform: `translateZ(${layer * 22}px)`,
              background:
                layer === 2
                  ? 'linear-gradient(135deg, var(--color-primary), var(--color-accent))'
                  : `color-mix(in oklab, var(--color-primary) ${8 + layer * 8}%, transparent)`,
              boxShadow: layer === 2 ? '0 20px 50px -10px var(--color-primary)' : undefined,
            }}
          >
            {layer === 2 && (
              <div className="flex h-full items-center justify-center text-primary-foreground">
                <Icon className="h-10 w-10 [transform:rotateZ(45deg)]" strokeWidth={1.75} />
              </div>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 mx-auto h-[420px] max-w-4xl -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <SectionHeading
        eyebrow="How it works"
        title="From sign-up to standup in three steps"
        description="Organizations own their space. Admins decide who gets in, and every teammate joins with their own credentials."
      />

      <div className="relative mx-auto mt-16 max-w-6xl">
        <div
          aria-hidden="true"
          className="absolute top-20 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent md:block"
        />
        <ol className="grid gap-10 md:grid-cols-3 md:gap-6">
          {STEPS.map((step, index) => (
            <motion.li
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <StepVisual icon={step.icon} index={index} />
              <span className="mt-4 text-xs font-semibold tracking-widest text-accent">
                STEP {index + 1}
              </span>
              <h3 className="mt-2 text-xl font-semibold text-text">{step.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-muted">
                {step.description}
              </p>
              <span className="mt-4 rounded-full border border-border bg-bg-elevated/70 px-3 py-1 text-xs text-text-muted">
                {step.detail}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
