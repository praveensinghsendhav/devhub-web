'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarClock,
  Check,
  Copy,
  Crown,
  HelpCircle,
  Lock,
  Pencil,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Meeting, RsvpResponse } from '@devhub/shared-types';
import { Modal } from '../../../common/components/Modal';
import { Button } from '../../../common/components/Button';
import { Avatar } from '../../../common/components/Avatar';
import { copyText } from '../../../common/lib/clipboard';
import { cn } from '../../../common/lib/cn';
import { extractErrorMessage } from '../../../store/apiBase';
import { usePresenceMap, useSelfId } from '../../chat/chatHooks';
import {
  useCancelMeetingMutation,
  useRemoveMeetingParticipantMutation,
  useRespondToMeetingMutation,
} from '../meetingsApi';
import { RSVP_LABELS, durationLabel, isJoinable, meetingLink, timeRange } from '../meetingFormat';
import { InvitePeopleDialog } from './InvitePeopleDialog';
import { ScheduleMeetingDialog } from './ScheduleMeetingDialog';
import { MeetingStatusBadge } from './MeetingCard';

const RSVP_STYLE: Record<RsvpResponse, string> = {
  accepted: 'text-online',
  tentative: 'text-away',
  declined: 'text-busy',
  pending: 'text-text-muted',
};

export function RsvpButtons({ meeting, compact = false }: { meeting: Meeting; compact?: boolean }) {
  const [respond, { isLoading }] = useRespondToMeetingMutation();
  if (meeting.myRole === 'host') return null;

  async function answer(response: Exclude<RsvpResponse, 'pending'>) {
    try {
      await respond({ meetingId: meeting.id, response }).unwrap();
      toast.success(
        response === 'accepted'
          ? 'Added to your calendar'
          : response === 'tentative'
            ? 'Marked as maybe — it’s on your calendar'
            : 'Declined — removed from your calendar',
      );
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  const options = [
    { id: 'accepted', label: 'Going', icon: Check },
    { id: 'tentative', label: 'Maybe', icon: HelpCircle },
    { id: 'declined', label: 'Decline', icon: X },
  ] as const;

  return (
    <div className="flex gap-1.5">
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          disabled={isLoading}
          onClick={() => void answer(id)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50',
            meeting.myRsvp === id
              ? 'border-primary/60 bg-primary/15 text-text'
              : 'border-border text-text-muted hover:bg-bg-hover hover:text-text',
          )}
          aria-pressed={meeting.myRsvp === id}
        >
          <Icon className="h-3.5 w-3.5" />
          {!compact && label}
        </button>
      ))}
    </div>
  );
}

export function MeetingDetailsDialog({
  meeting,
  open,
  onClose,
}: {
  meeting: Meeting | null;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const selfId = useSelfId();
  const presence = usePresenceMap();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelMeeting, cancelState] = useCancelMeetingMutation();
  const [removeParticipant] = useRemoveMeetingParticipantMutation();

  if (!meeting) return null;
  const isHost = meeting.myRole === 'host';
  const isModerator = isHost || meeting.myRole === 'cohost';
  const open_ = meeting.status === 'scheduled' || meeting.status === 'live';
  const going = meeting.participants.filter((p) => p.rsvp === 'accepted').length;

  async function copyLink() {
    try {
      await copyText(meetingLink(meeting!.id));
      toast.success('Link copied — only invited people can join');
    } catch {
      toast.error('Couldn’t copy the link');
    }
  }

  async function cancel() {
    try {
      await cancelMeeting({ meetingId: meeting!.id }).unwrap();
      toast.success('Meeting cancelled — everyone’s been notified');
      setConfirmCancel(false);
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  async function remove(userId: string, name: string) {
    try {
      await removeParticipant({ meetingId: meeting!.id, userId }).unwrap();
      toast.success(`${name} was removed`);
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <>
      {/* Hidden, not stacked, while a sub-dialog is open; it comes back when that closes. */}
      <Modal
        open={open && !inviteOpen && !editOpen}
        onClose={onClose}
        title={meeting.title}
        className="max-w-xl"
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
            <MeetingStatusBadge meeting={meeting} />
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              {timeRange(meeting)} · {durationLabel(meeting)}
            </span>
            {meeting.isLocked && (
              <span className="flex items-center gap-1 text-away">
                <Lock className="h-3.5 w-3.5" /> Locked
              </span>
            )}
          </div>

          {meeting.description && (
            <p className="rounded-xl border border-border bg-bg/60 p-3 text-sm whitespace-pre-wrap text-text">
              {meeting.description}
            </p>
          )}

          {open_ && (
            <div className="flex flex-wrap items-center gap-2">
              {isJoinable(meeting) && (
                <Button onClick={() => router.push(`/meeting/${meeting.id}`)}>
                  <Video className="h-4 w-4" />
                  {meeting.status === 'live' ? 'Join now' : isModerator ? 'Start' : 'Join'}
                </Button>
              )}
              {meeting.canInvite && (
                <Button variant="secondary" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="h-4 w-4" /> Invite
                </Button>
              )}
              <Button variant="ghost" onClick={() => void copyLink()}>
                <Copy className="h-4 w-4" /> Copy link
              </Button>
              {isModerator && meeting.status === 'scheduled' && (
                <Button variant="ghost" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
            </div>
          )}

          {open_ && !isHost && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3">
              <span className="text-sm text-text-muted">Will you join?</span>
              <RsvpButtons meeting={meeting} />
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">
              {meeting.participants.length} invited · {going} going
            </p>
            <ul className="-mx-2 max-h-64 overflow-y-auto">
              {meeting.participants.map((p) => (
                <li key={p.userId} className="group flex items-center gap-3 rounded-xl px-2 py-1.5">
                  <Avatar
                    name={p.name}
                    avatarUrl={p.avatarUrl}
                    status={presence[p.userId]}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium text-text">
                      {p.name}
                      {p.userId === selfId && <span className="text-text-muted">(you)</span>}
                      {p.role === 'host' && (
                        <Crown className="h-3.5 w-3.5 text-away" aria-label="Host" />
                      )}
                      {p.role === 'cohost' && (
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-label="Co-host" />
                      )}
                    </span>
                    <span className={cn('block text-xs', RSVP_STYLE[p.rsvp])}>
                      {p.role === 'host' ? 'Organizer' : RSVP_LABELS[p.rsvp]}
                    </span>
                  </span>
                  {isModerator && open_ && p.role !== 'host' && p.userId !== selfId && (
                    <button
                      type="button"
                      onClick={() => void remove(p.userId, p.name)}
                      className="rounded-lg p-1.5 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-bg-hover hover:text-busy focus:opacity-100"
                      aria-label={`Remove ${p.name}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {isHost && open_ && (
            <div className="border-t border-border pt-4">
              {confirmCancel ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-text">Cancel for everyone?</span>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={cancelState.isLoading}
                    onClick={() => void cancel()}
                  >
                    Yes, cancel meeting
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(false)}>
                    Keep it
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  className="text-sm font-medium text-busy hover:underline"
                >
                  {meeting.status === 'live' ? 'End and cancel meeting' : 'Cancel meeting'}
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>

      <InvitePeopleDialog
        meeting={meeting}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
      <ScheduleMeetingDialog open={editOpen} onClose={() => setEditOpen(false)} meeting={meeting} />
    </>
  );
}
