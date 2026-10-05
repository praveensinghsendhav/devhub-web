import type { ReactNode } from 'react';

export function Topbar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 sm:h-16 sm:px-6">
      <h1 className="truncate text-lg font-semibold text-text">{title}</h1>
      <div className="flex shrink-0 items-center gap-3">{children}</div>
    </header>
  );
}
