'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Meeting } from '@devhub/shared-types';
import { Modal } from '../../../common/components/Modal';
import { Button } from '../../../common/components/Button';
import { extractErrorMessage } from '../../../store/apiBase';
import { UserPicker } from '../../chat/components/UserPicker';
import { useInviteToMeetingMutation } from '../meetingsApi';

/** Anyone in a meeting can add people (unless the host turned it off). Live calls ring them. */
export function InvitePeopleDialog({
  meeting,
  open,
  onClose,
}: {
  meeting: Pick<Meeting, 'id' | 'title' | 'status' | 'participants'>;
  open: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [invite, { isLoading }] = useInviteToMeetingMutation();

  async function submit() {
    try {
      await invite({ meetingId: meeting.id, userIds: selected }).unwrap();
      toast.success(
        meeting.status === 'live'
          ? `Calling ${selected.length === 1 ? '1 person' : `${selected.length} people`}…`
          : `Invited ${selected.length === 1 ? '1 person' : `${selected.length} people`}`,
      );
      setSelected([]);
      onClose();
    } catch (error) {
      toast.error(extractErrorMessage(error));
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setSelected([]);
        onClose();
      }}
      title="Invite people"
      description={
        meeting.status === 'live'
          ? 'They’ll get a call right away.'
          : `They’ll see “${meeting.title}” in their invitations.`
      }
    >
      <div className="flex flex-col gap-4">
        <UserPicker
          selected={selected}
          onChange={setSelected}
          exclude={meeting.participants.map((p) => p.userId)}
        />
        <Button
          size="lg"
          disabled={selected.length === 0 || isLoading}
          onClick={() => void submit()}
        >
          {isLoading
            ? 'Inviting…'
            : selected.length > 0
              ? `Invite ${selected.length}`
              : 'Choose people to invite'}
        </Button>
      </div>
    </Modal>
  );
}
