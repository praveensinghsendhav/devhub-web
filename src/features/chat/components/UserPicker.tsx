'use client';

import { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useListUsersQuery, type DirectoryUser } from '../../users/usersApi';
import { Avatar } from '../../../common/components/Avatar';
import { cn } from '../../../common/lib/cn';
import { usePresenceMap, useSelfId } from '../chatHooks';

/** Searchable list of people in your organization. `multiple` switches between pick-one and pick-many. */
export function UserPicker({
  selected,
  onChange,
  multiple = true,
  exclude = [],
  onPick,
}: {
  selected: string[];
  onChange?: (ids: string[]) => void;
  multiple?: boolean;
  exclude?: string[];
  /** Single-select shortcut: fires immediately on click. */
  onPick?: (user: DirectoryUser) => void;
}) {
  const [query, setQuery] = useState('');
  const selfId = useSelfId();
  const presence = usePresenceMap();
  const { data: users = [], isLoading } = useListUsersQuery();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.id !== selfId &&
        !exclude.includes(u.id) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  }, [users, query, selfId, exclude]);

  function toggle(user: DirectoryUser) {
    if (onPick) return onPick(user);
    if (!onChange) return;
    if (!multiple) return onChange([user.id]);
    onChange(
      selected.includes(user.id) ? selected.filter((id) => id !== user.id) : [...selected, user.id],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex h-10 items-center gap-2 rounded-lg border border-border bg-bg px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        <Search className="h-4 w-4 text-text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people…"
          className="h-full flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
          autoFocus
        />
      </label>

      <ul className="-mx-2 max-h-72 overflow-y-auto">
        {isLoading && <li className="px-2 py-3 text-sm text-text-muted">Loading people…</li>}
        {!isLoading && visible.length === 0 && (
          <li className="px-2 py-3 text-sm text-text-muted">
            {users.length <= 1
              ? 'No teammates yet — invite people from the Team page.'
              : 'No one matches that search.'}
          </li>
        )}
        {visible.map((user) => {
          const isSelected = selected.includes(user.id);
          return (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => toggle(user)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors',
                  isSelected ? 'bg-primary/10' : 'hover:bg-bg-hover',
                )}
              >
                <Avatar
                  name={user.name}
                  avatarUrl={user.avatarUrl}
                  status={presence[user.id]}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-text">{user.name}</span>
                  <span className="block truncate text-xs text-text-muted">{user.email}</span>
                </span>
                {(multiple || onChange) && !onPick && (
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-md border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border',
                    )}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
