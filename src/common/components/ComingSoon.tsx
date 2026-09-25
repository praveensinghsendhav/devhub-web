import type { LucideIcon } from 'lucide-react';

export function ComingSoon({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Icon className="h-8 w-8" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-text">{title}</h2>
        <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>
      </div>
    </div>
  );
}
