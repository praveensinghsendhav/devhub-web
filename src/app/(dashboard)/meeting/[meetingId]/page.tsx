'use client';

import { use } from 'react';
import { MeetingRoom } from '../../../../features/meetings/components/MeetingRoom';

export default function MeetingRoomPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = use(params);
  // Keyed so switching meetings starts from a clean screen.
  return <MeetingRoom key={meetingId} meetingId={meetingId} />;
}
