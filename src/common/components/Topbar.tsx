import type { ReactNode } from 'react';

export function Topbar({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
      <h1 className="text-lg font-semibold text-text">{title}</h1>
      <div className="flex items-center gap-3">{children}</div>
    </header>
  );
}
