import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, id, ...props },
  ref,
) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-text-muted">{label}</span>}
      <input
        ref={ref}
        id={id}
        className={cn(
          'h-11 rounded-lg border border-border bg-bg px-3.5 text-sm text-text outline-none transition-colors',
          'placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/30',
          error && 'border-busy focus:border-busy focus:ring-busy/30',
          className,
        )}
        {...props}
      />
      {error && <span className="text-xs text-busy">{error}</span>}
    </label>
  );
});
