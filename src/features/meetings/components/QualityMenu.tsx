'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Gauge, Signal, SignalLow, SignalMedium } from 'lucide-react';
import { cn } from '../../../common/lib/cn';
import { QUALITY_MODES, type VideoTier } from '../rtc/quality';
import { useMeetingSession, meetingSession } from '../useMeetingSession';

const TIER_LABEL: Record<VideoTier, string> = {
  high: 'HD',
  medium: 'SD',
  low: 'Low',
  minimal: 'Very low',
  off: 'Off',
};

/** Connection + data-usage control: pick a mode, see what's actually being sent. */
export function QualityMenu({ placement = 'up' }: { placement?: 'up' | 'down' }) {
  const [open, setOpen] = useState(false);
  const mode = useMeetingSession((s) => s.qualityMode);
  const quality = useMeetingSession((s) => s.quality);
  const sendTier = useMeetingSession((s) => s.sendTier);
  const Icon = quality === 'poor' ? SignalLow : quality === 'fair' ? SignalMedium : Signal;

  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
          open ? 'bg-primary/20 text-text' : 'bg-bg-hover text-text hover:bg-border',
        )}
        aria-label="Video quality and data usage"
        aria-expanded={open}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            quality === 'poor' ? 'text-busy' : quality === 'fair' ? 'text-away' : 'text-online',
          )}
        />
        <span className="hidden sm:inline">{QUALITY_MODES.find((m) => m.id === mode)?.label}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: placement === 'up' ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === 'up' ? 6 : -6 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute left-1/2 z-30 w-72 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-bg-elevated p-1.5 shadow-2xl',
              placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
            )}
          >
            <div className="flex items-center gap-2 px-3 pt-2 pb-2.5 text-xs text-text-muted">
              <Gauge className="h-3.5 w-3.5" />
              Connection{' '}
              <span
                className={cn(
                  'font-semibold',
                  quality === 'poor'
                    ? 'text-busy'
                    : quality === 'fair'
                      ? 'text-away'
                      : 'text-online',
                )}
              >
                {quality}
              </span>
              · sending {TIER_LABEL[sendTier]}
            </div>
            {QUALITY_MODES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  void meetingSession.setQualityMode(option.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-bg-hover',
                  mode === option.id && 'bg-bg-hover',
                )}
              >
                <span className="mt-0.5 flex h-4 w-4 items-center justify-center">
                  {mode === option.id && <Check className="h-4 w-4 text-primary" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-text">{option.label}</span>
                  <span className="block text-xs text-text-muted">{option.hint}</span>
                </span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
