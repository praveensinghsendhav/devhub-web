'use client';

import { formatDistanceToNow } from 'date-fns';
import { Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { InviteStatus } from '@devhub/shared-types';
import { useListInvitesQuery, useRevokeInviteMutation } from '../organizationApi';
import { extractErrorMessage } from '../../../store/apiBase';
import { cn } from '../../../common/lib/cn';

const STATUS_STYLES: Record<InviteStatus, string> = {
  pending: 'bg-away/15 text-away',
  accepted: 'bg-online/15 text-online',
  revoked: 'bg-bg-hover text-text-muted',
  expired: 'bg-busy/15 text-busy',
};

export function InviteList() {
  const { data: invites = [], isLoading } = useListInvitesQuery();
  const [revokeInvite, { isLoading: isRevoking }] = useRevokeInviteMutation();

  async function handleRevoke(id: string, email: string) {
    try {
      await revokeInvite(id).unwrap();
      toast.success(`Invite for ${email} revoked`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  if (isLoading) {
    return <div className="h-24 animate-pulse rounded-xl bg-bg-hover" />;
  }

  if (invites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
        <Mail className="h-6 w-6 text-text-muted" />
        <p className="text-sm text-text-muted">No invites yet — add your teammates above.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
      {invites.map((invite) => (
        <li key={invite.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text">{invite.email}</p>
            <p className="text-xs text-text-muted">
              {invite.role.charAt(0) + invite.role.slice(1).toLowerCase()}
              {invite.invitedBy && ` · invited by ${invite.invitedBy.name}`} ·{' '}
              {invite.status === 'pending'
                ? `expires ${formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}`
                : `sent ${formatDistanceToNow(new Date(invite.createdAt), { addSuffix: true })}`}
            </p>
          </div>
          <span
            className={cn(
              'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
              STATUS_STYLES[invite.status],
            )}
          >
            {invite.status}
          </span>
          {invite.status === 'pending' && (
            <button
              type="button"
              disabled={isRevoking}
              onClick={() => void handleRevoke(invite.id, invite.email)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-busy/10 hover:text-busy disabled:opacity-50"
              aria-label={`Revoke invite for ${invite.email}`}
              title="Revoke invite"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
