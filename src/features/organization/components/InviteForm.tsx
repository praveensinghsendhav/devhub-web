'use client';

import { useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { MailPlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { INVITABLE_ROLES, type InvitableRole } from '@devhub/shared-types';
import { useCreateInvitesMutation } from '../organizationApi';
import { extractErrorMessage } from '../../../store/apiBase';
import { Button } from '../../../common/components/Button';

const MAX_EMAILS = 20;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABELS: Record<InvitableRole, string> = {
  ADMIN: 'Admin — can invite and manage',
  MEMBER: 'Member — chat & collaborate',
  GUEST: 'Guest — read-only access',
};

function splitEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function InviteForm() {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [role, setRole] = useState<InvitableRole>('MEMBER');
  const [createInvites, { isLoading }] = useCreateInvitesMutation();

  function addEmails(candidates: string[]) {
    const invalid = candidates.filter((email) => !EMAIL_PATTERN.test(email));
    if (invalid.length > 0) toast.error(`Not a valid email: ${invalid.join(', ')}`);
    const merged = [...new Set([...emails, ...candidates.filter((e) => EMAIL_PATTERN.test(e))])];
    if (merged.length > MAX_EMAILS)
      toast.error(`You can invite up to ${MAX_EMAILS} people at once`);
    setEmails(merged.slice(0, MAX_EMAILS));
  }

  function commitDraft(): string[] {
    const candidates = splitEmails(draft);
    if (candidates.length > 0) addEmails(candidates);
    setDraft('');
    return candidates.filter((e) => EMAIL_PATTERN.test(e));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (['Enter', ',', ' ', 'Tab'].includes(event.key) && draft.trim()) {
      event.preventDefault();
      commitDraft();
    } else if (event.key === 'Backspace' && !draft && emails.length > 0) {
      setEmails((current) => current.slice(0, -1));
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text');
    if (/[\s,;]/.test(text)) {
      event.preventDefault();
      addEmails(splitEmails(text));
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const pending = [...new Set([...emails, ...commitDraft()])].slice(0, MAX_EMAILS);
    if (pending.length === 0) {
      toast.error('Add at least one email address');
      return;
    }

    try {
      const result = await createInvites({ emails: pending, role }).unwrap();
      if (result.invited.length > 0) {
        toast.success(
          `Sent ${result.invited.length} invite${result.invited.length === 1 ? '' : 's'}`,
        );
      }
      result.skipped.forEach((skip) => toast.warning(`${skip.email}: ${skip.reason}`));
      setEmails([]);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">Email addresses</span>
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-border bg-bg px-2 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
          {emails.map((email) => (
            <span
              key={email}
              className="flex items-center gap-1 rounded-md bg-primary/15 py-1 pr-1 pl-2 text-xs font-medium text-text"
            >
              {email}
              <button
                type="button"
                onClick={() => setEmails((current) => current.filter((e) => e !== email))}
                className="rounded p-0.5 text-text-muted hover:bg-bg-hover hover:text-text"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onBlur={() => draft.trim() && commitDraft()}
            placeholder={emails.length === 0 ? 'teammate@company.com, another@company.com' : ''}
            className="h-7 min-w-[180px] flex-1 bg-transparent px-1.5 text-sm text-text outline-none placeholder:text-text-muted"
            type="text"
            inputMode="email"
            autoComplete="off"
          />
        </div>
        <span className="text-xs text-text-muted">
          Press Enter or comma to add. Each person gets a single-use link to set their password.
        </span>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-text-muted">Role</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as InvitableRole)}
            className="h-11 rounded-lg border border-border bg-bg px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            {INVITABLE_ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" size="lg" disabled={isLoading} className="h-11">
          <MailPlus className="h-4 w-4" />
          {isLoading ? 'Sending…' : 'Send invites'}
        </Button>
      </div>
    </form>
  );
}
