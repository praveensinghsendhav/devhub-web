'use client';

import { motion } from 'framer-motion';

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl text-center"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-text-muted">{description}</p>
    </motion.div>
  );
}
