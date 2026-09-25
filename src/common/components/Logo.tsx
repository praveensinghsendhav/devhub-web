import Link from 'next/link';
import { cn } from '../lib/cn';

export function Logo({ href = '/', className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn('flex items-center gap-2', className)} aria-label="DevHub home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent font-bold text-primary-foreground shadow-lg shadow-primary/30">
        D
      </span>
      <span className="text-base font-semibold tracking-tight text-text">DevHub</span>
    </Link>
  );
}
