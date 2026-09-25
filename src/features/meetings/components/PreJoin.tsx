'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic, MicOff, Settings, Video, VideoOff, WifiLow } from 'lucide-react';
import type { Meeting } from '@devhub/shared-types';
import { Button } from '../../../common/components/Button';
import { Avatar } from '../../../common/components/Avatar';
import { cn } from '../../../common/lib/cn';
import { useAppSelector } from '../../../store/hooks';
import { suggestsAudioOnly } from '../rtc/quality';
import { timeRange } from '../meetingFormat';
import { useMeetingSession, meetingSession } from '../useMeetingSession';
import { StreamVideo } from './VideoTile';
import { DeviceSettingsDialog } from './DeviceSettingsDialog';
import { MeetingStatusBadge } from './MeetingCard';

const QUICK_MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'low', label: 'Data saver' },
  { id: 'audio', label: 'Audio only' },
] as const;

/** Check your camera, mic and data mode before walking in. */
export function PreJoin({ meeting }: { meeting: Meeting }) {
  const user = useAppSelector((state) => state.auth.user);
  const localStream = useMeetingSession((s) => s.localStream);
  const audio = useMeetingSession((s) => s.audio);
  const video = useMeetingSession((s) => s.video);
  const mode = useMeetingSession((s) => s.qualityMode);
  const mediaError = useMeetingSession((s) => s.mediaError);
  const phase = useMeetingSession((s) => s.phase);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const joining = phase === 'joining';
  const weakNetwork = suggestsAudioOnly();
  const here = meeting.participants.filter((p) => p.rsvp === 'accepted').length;

  return (
    <div className="flex flex-1 items-center justify-center overflow-y-auto p-4 sm:p-8">
      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-3">
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-bg-hover shadow-2xl shadow-black/30">
            {video && localStream ? (
              <StreamVideo stream={localStream} mirrored />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3">
                {user && <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />}
                <p className="text-sm text-text-muted">
                  {meeting.media === 'audio' ? 'Audio call' : 'Camera is off'}
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => void meetingSession.setAudio(!audio)}
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition-colors',
                  audio ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-busy text-white',
                )}
                aria-label={audio ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
              </button>
              {meeting.media === 'video' && (
                <button
                  type="button"
                  onClick={() => void meetingSession.setVideo(!video)}
                  className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition-colors',
                    video ? 'bg-black/50 text-white hover:bg-black/70' : 'bg-busy text-white',
                  )}
                  aria-label={video ? 'Turn camera off' : 'Turn camera on'}
                >
                  {video ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70"
                aria-label="Audio & video settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
          {mediaError && <p className="text-center text-sm text-busy">{mediaError}</p>}
        </div>

        <div className="flex flex-col gap-5">
          <Link
            href="/meeting"
            className="flex w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text"
            onClick={() => meetingSession.cancelPreview()}
          >
            <ArrowLeft className="h-4 w-4" /> Meetings
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <MeetingStatusBadge meeting={meeting} />
              <span className="text-xs text-text-muted">{timeRange(meeting)}</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-text">{meeting.title}</h1>
            <p className="mt-1 text-sm text-text-muted">
              {meeting.participants.length} invited · {here} going
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text-muted">Data usage</p>
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-bg-hover p-1">
              {QUICK_MODES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => void meetingSession.setQualityMode(option.id)}
                  className={cn(
                    'rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                    mode === option.id
                      ? 'bg-bg-elevated text-text shadow'
                      : 'text-text-muted hover:text-text',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {weakNetwork && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-away">
                <WifiLow className="h-3.5 w-3.5" />
                Your connection looks slow — audio only is recommended.
              </p>
            )}
          </div>

          <Button size="lg" disabled={joining} onClick={() => void meetingSession.join()}>
            {joining
              ? 'Joining…'
              : meeting.status === 'live'
                ? 'Join now'
                : meeting.myRole === 'participant'
                  ? 'Join'
                  : 'Start meeting'}
          </Button>
        </div>
      </div>

      <DeviceSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
