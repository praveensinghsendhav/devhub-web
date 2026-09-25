'use client';

import type { PointerEvent, ReactNode } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { cn } from '../../common/lib/cn';

const MAX_TILT_DEG = 10;

/** A card that tilts toward the pointer in 3D, with a soft glare that follows it. */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 220, damping: 20, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [0, 1], [MAX_TILT_DEG, -MAX_TILT_DEG]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-MAX_TILT_DEG, MAX_TILT_DEG]), spring);
  const glareX = useTransform(px, (v) => `${v * 100}%`);
  const glareY = useTransform(py, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(420px circle at ${glareX} ${glareY}, color-mix(in oklab, var(--color-primary) 22%, transparent), transparent 60%)`;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  }

  function reset() {
    px.set(0.5);
    py.set(0.5);
  }

  return (
    <div className="[perspective:1000px]">
      <motion.div
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
        style={reduceMotion ? undefined : { rotateX, rotateY }}
        className={cn(
          'preserve-3d group relative h-full rounded-2xl border border-border bg-bg-elevated/70 p-6 backdrop-blur transition-shadow duration-300 hover:shadow-2xl hover:shadow-primary/15',
          className,
        )}
      >
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glare }}
        />
        <div className="relative [transform:translateZ(40px)]">{children}</div>
      </motion.div>
    </div>
  );
}
