'use client';

import { useState } from 'react';
import {
  Crown,
  Hand,
  Lock,
  LockOpen,
  MicOff,
  MonitorUp,
  MoreVertical,
  ShieldCheck,
  UserPlus,
  VideoOff,
  VolumeX,
  WifiLow,
} from 'lucide-react';
import type { HostAction, Meeting, MeetingRole } from '@devhub/shared-types';
import { Avatar } from '../../../common/components/Avatar';
import { Button } from '../../../common/components/Button';
import { cn } from '../../../common/lib/cn';
import { useAppSelector } from '../../../store/hooks';
import type { RemotePeer } from '../rtc/MeetingSession';
import { useMeetingSession, meetingSession } from '../useMeetingSession';
import { InvitePeopleDialog } from './InvitePeopleDialog';

function PeerMenu({ peer, isHost }: { peer: RemotePeer; isHost: boolean }) {
  const [open, setOpen] = useState(false);
  const act = (action: HostAction) => {
    setOpen(false);
    void meetingSession.hostAction(action, peer.peerId);
  };
  const items: { action: HostAction; label: string; show: boolean; danger?: boolean }[] = [
    { action: 'mute', label: 'Mute', show: peer.state.audio },
    { action: 'camera-off', label: 'Turn off camera', show: peer.state.video },
    { action: 'lower-hand', label: 'Lower hand', show: peer.state.hand },
    { action: 'make-cohost', label: 'Make co-host', show: isHost && peer.role === 'participant' },
    { action: 'remove-cohost', label: 'Remove co-host', show: isHost && peer.role === 'cohost' },
    { action: 'remove', label: 'Remove from call', show: peer.role !== 'host', danger: true },
  ];
  const visible = items.filter((i) => i.show);
  if (visible.length === 0) return null;

  return (
    <div
      className="relative"
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-text-muted hover:bg-bg-hover hover:text-text"
        aria-label={`Actions for ${peer.name}`}
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <ul className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-bg-elevated p-1 shadow-xl">
          {visible.map((item) => (
            <li key={item.action}>
              <button
                type="button"
                onClick={() => act(item.action)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-bg-hover',
                  item.danger ? 'text-busy' : 'text-text',
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RoleIcon({ role }: { role: MeetingRole }) {
  if (role === 'host')
    return <Crown className="ml-1 inline h-3.5 w-3.5 text-away" aria-label="Host" />;
  if (role === 'cohost') {
    return <ShieldCheck className="ml-1 inline h-3.5 w-3.5 text-primary" aria-label="Co-host" />;
  }
  return null;
}

function StateIcons(props: {
  audio: boolean;
  video: boolean;
  hand: boolean;
  screen: boolean;
  weak: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-text-muted">
      {props.hand && <Hand className="h-4 w-4 text-away" aria-label="Hand raised" />}
      {props.screen && <MonitorUp className="h-4 w-4 text-accent" aria-label="Presenting" />}
      {props.weak && <WifiLow className="h-4 w-4 text-away" aria-label="Weak connection" />}
      {!props.video && <VideoOff className="h-4 w-4" aria-label="Camera off" />}
      {!props.audio && <MicOff className="h-4 w-4 text-busy" aria-label="Muted" />}
    </span>
  );
}

/** Who's here, who's invited, requests to join, and host controls. */
export function ParticipantsPanel({ meeting }: { meeting: Meeting | undefined }) {
  const self = useAppSelector((state) => state.auth.user);
  const peers = useMeetingSession((s) => s.peers);
  const knocks = useMeetingSession((s) => s.knocks);
  const myRole = useMeetingSession((s) => s.myRole);
  const isLocked = useMeetingSession((s) => s.isLocked);
  const audio = useMeetingSession((s) => s.audio);
  const video = useMeetingSession((s) => s.video);
  const hand = useMeetingSession((s) => s.hand);
  const screen = useMeetingSession((s) => s.screen);
  const [inviteOpen, setInviteOpen] = useState(false);
  const isModerator = myRole === 'host' || myRole === 'cohost';

  // Raised hands float to the top.
  const sorted = [...peers].sort((a, b) => Number(b.state.hand) - Number(a.state.hand));
  const invitedNotHere =
    meeting?.participants.filter(
      (p) => p.userId !== self?.id && !peers.some((peer) => peer.userId === p.userId),
    ) ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {isModerator && knocks.length > 0 && (
          <div className="mb-4 rounded-xl border border-away/40 bg-away/10 p-3">
            <p className="mb-2 text-xs font-semibold tracking-wide text-away uppercase">
              Asking to join
            </p>
            {knocks.map((knock) => (
              <div key={knock.userId} className="flex items-center gap-2 py-1">
                <Avatar name={knock.name} avatarUrl={knock.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-text">{knock.name}</span>
                <Button size="sm" onClick={() => meetingSession.admit(knock.userId, true)}>
                  Admit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => meetingSession.admit(knock.userId, false)}
                >
                  Deny
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="mb-1 px-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
          In the call · {peers.length + 1}
        </p>
        <ul>
          {self && (
            <li className="flex items-center gap-3 rounded-xl px-1 py-2">
              <Avatar name={self.name} avatarUrl={self.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                {self.name} <span className="text-text-muted">(you)</span>
                <RoleIcon role={myRole} />
              </span>
              <StateIcons audio={audio} video={video} hand={hand} screen={screen} weak={false} />
            </li>
          )}
          {sorted.map((peer) => (
            <li key={peer.peerId} className="flex items-center gap-3 rounded-xl px-1 py-2">
              <Avatar name={peer.name} avatarUrl={peer.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                {peer.name}
                <RoleIcon role={peer.role} />
              </span>
              <StateIcons
                audio={peer.state.audio}
                video={peer.state.video}
                hand={peer.state.hand}
                screen={peer.state.screen}
                weak={peer.state.quality !== 'good'}
              />
              {isModerator && <PeerMenu peer={peer} isHost={myRole === 'host'} />}
            </li>
          ))}
        </ul>

        {invitedNotHere.length > 0 && (
          <>
            <p className="mt-4 mb-1 px-1 text-xs font-semibold tracking-wide text-text-muted uppercase">
              Invited · {invitedNotHere.length}
            </p>
            <ul>
              {invitedNotHere.map((p) => (
                <li key={p.userId} className="flex items-center gap-3 px-1 py-1.5 opacity-70">
                  <Avatar name={p.name} avatarUrl={p.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{p.name}</span>
                  <span className="text-xs text-text-muted">
                    {p.rsvp === 'declined' ? 'Declined' : 'Not joined'}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-border p-3">
        {meeting?.canInvite && (
          <Button variant="secondary" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" /> Invite people
          </Button>
        )}
        {isModerator && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void meetingSession.hostAction('mute-all')}
            >
              <VolumeX className="h-4 w-4" /> Mute all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void meetingSession.hostAction(isLocked ? 'unlock' : 'lock')}
            >
              {isLocked ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isLocked ? 'Unlock' : 'Lock'}
            </Button>
          </div>
        )}
      </div>

      {meeting && (
        <InvitePeopleDialog
          meeting={meeting}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </div>
  );
}
