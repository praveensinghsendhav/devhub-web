'use client';

import { useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { MAX_MEETING_PARTICIPANTS, type MeetingMedia } from '@devhub/shared-types';
import { Modal } from '../../../common/components/Modal';
import { Button } from '../../../common/components/Button';
import { UserPicker } from '../../chat/components/UserPicker';
import { useListUsersQuery } from '../../users/usersApi';
import { useStartCall } from '../useStartCall';

function callTitle(names: string[]): string {
  const first = names.map((n) => n.split(' ')[0]);
  if (first.length <= 3) return `Call with ${first.join(', ')}`;
  return `Call with ${first.slice(0, 2).join(', ')} and ${first.length - 2} others`;
}

/** Pick one person for a 1:1, or several for a group call; everyone's phone rings. */
export function StartCallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const { data: users = [] } = useListUsersQuery();
  const { startCall, isStarting } = useStartCall();
  const tooMany = selected.length > MAX_MEETING_PARTICIPANTS - 1;

  async function start(media: MeetingMedia) {
    const names = users.filter((u) => selected.includes(u.id)).map((u) => u.name);
    const meeting = await startCall({ userIds: selected, media, title: callTitle(names) });
    if (meeting) {
      setSelected([]);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setSelected([]);
        onClose();
      }}
      title="Start a call"
      description="Choose one person for a 1:1, or several for a group call."
    >
      <div className="flex flex-col gap-4">
        <UserPicker selected={selected} onChange={setSelected} />
        {tooMany && (
          <p className="text-sm text-busy">
            Calls fit up to {MAX_MEETING_PARTICIPANTS} people. Schedule a meeting to invite more.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="lg"
            disabled={selected.length === 0 || tooMany || isStarting}
            onClick={() => void start('audio')}
          >
            <Phone className="h-4 w-4" /> Audio call
          </Button>
          <Button
            size="lg"
            disabled={selected.length === 0 || tooMany || isStarting}
            onClick={() => void start('video')}
          >
            <Video className="h-4 w-4" /> Video call
          </Button>
        </div>
      </div>
    </Modal>
  );
}
