'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '../lib/cn';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

/**
 * Light / Dark / System switch. `compact` renders a single icon button that cycles themes
 * (for headers); the default is a small segmented control (for menus and sidebars).
 */
export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // The chosen theme is only known on the client; render a stable placeholder until then.
  useEffect(() => setMounted(true), []);

  if (compact) {
    const Icon = !mounted ? Sun : resolvedTheme === 'dark' ? Moon : Sun;
    return (
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-hover hover:text-text',
          className,
        )}
        aria-label={
          mounted ? `Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'
        }
        title="Toggle theme"
      >
        <Icon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn('grid grid-cols-3 gap-0.5 rounded-lg bg-bg-hover p-0.5', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            title={label}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
              active ? 'bg-bg-elevated text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
