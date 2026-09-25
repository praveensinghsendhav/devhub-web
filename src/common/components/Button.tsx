import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
  {
    variants: {
      variant: {
        primary: 'btn-3d bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary:
          'btn-3d bg-bg-hover text-text hover:bg-border [--btn-edge:var(--color-border)] [--btn-glow:transparent]',
        ghost:
          'bg-transparent text-text-muted transition-colors duration-150 hover:bg-bg-hover hover:text-text',
        danger:
          'btn-3d bg-busy text-white hover:opacity-90 [--btn-edge:color-mix(in_oklab,var(--color-busy)_55%,black)] [--btn-glow:color-mix(in_oklab,var(--color-busy)_40%,transparent)]',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
});
