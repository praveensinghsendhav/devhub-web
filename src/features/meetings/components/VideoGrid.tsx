'use client';

import { useAppSelector } from '../../../store/hooks';
import { cn } from '../../../common/lib/cn';
import { useMeetingSession, meetingSession } from '../useMeetingSession';
import type { RemotePeer } from '../rtc/MeetingSession';
import { VideoTile, type TileProps } from './VideoTile';

function gridColumns(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count <= 4) return 'grid-cols-1 sm:grid-cols-2';
  if (count <= 9) return 'grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
}

/**
 * Picks a layout automatically:
 * - 1:1 — the other person fills the stage, you're a small picture-in-picture.
 * - Someone presenting or pinned — they're the spotlight, everyone else in a strip.
 * - Otherwise — an even grid.
 */
export function VideoGrid() {
  const self = useAppSelector((state) => state.auth.user);
  const peers = useMeetingSession((s) => s.peers);
  const localStream = useMeetingSession((s) => s.localStream);
  const screenStream = useMeetingSession((s) => s.screenStream);
  const audio = useMeetingSession((s) => s.audio);
  const video = useMeetingSession((s) => s.video);
  const screen = useMeetingSession((s) => s.screen);
  const hand = useMeetingSession((s) => s.hand);
  const speaking = useMeetingSession((s) => s.speaking);
  const quality = useMeetingSession((s) => s.quality);
  const myRole = useMeetingSession((s) => s.myRole);
  const pinnedPeerId = useMeetingSession((s) => s.pinnedPeerId);
  const qualityMode = useMeetingSession((s) => s.qualityMode);
  const selfPeerId = useMeetingSession((s) => s.selfPeerId) ?? 'self';

  if (!self) return null;
  const audioOnly = qualityMode === 'audio';

  const selfTile: TileProps & { id: string } = {
    id: selfPeerId,
    name: self.name,
    avatarUrl: self.avatarUrl,
    // When you present, your own tile shows your screen so you can see what others see.
    stream: screen ? screenStream : localStream,
    showVideo: screen || video,
    audio,
    speaking,
    hand,
    screen,
    quality,
    role: myRole,
    isSelf: true,
  };

  const togglePin = (peerId: string) =>
    meetingSession.setPinned(pinnedPeerId === peerId ? null : peerId);

  const peerTile = (peer: RemotePeer): TileProps & { id: string } => ({
    id: peer.peerId,
    name: peer.name,
    avatarUrl: peer.avatarUrl,
    stream: peer.stream,
    // Audio-only mode asks everyone to stop sending video, so show avatars.
    showVideo: !audioOnly && (peer.state.video || peer.state.screen),
    audio: peer.state.audio,
    speaking: peer.speaking,
    hand: peer.state.hand,
    screen: peer.state.screen,
    quality: peer.state.quality,
    role: peer.role,
    connecting: peer.connection === 'new' || peer.connection === 'connecting',
    pinned: pinnedPeerId === peer.peerId,
    onTogglePin: () => togglePin(peer.peerId),
  });

  const presenter = peers.find((p) => p.state.screen);
  const spotlightPeer = peers.find((p) => p.peerId === pinnedPeerId) ?? presenter;

  // Nobody else here yet.
  if (peers.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        <div className="relative aspect-video w-full max-w-3xl">
          <VideoTile {...selfTile} className="h-full w-full" />
          <p className="absolute inset-x-0 -bottom-9 text-center text-sm text-text-muted">
            Waiting for others to join…
          </p>
        </div>
      </div>
    );
  }

  if (spotlightPeer) {
    const rest = [selfTile, ...peers.filter((p) => p !== spotlightPeer).map(peerTile)];
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3 lg:flex-row">
        <VideoTile {...peerTile(spotlightPeer)} className="min-h-0 flex-1" />
        <div className="scrollbar-none flex shrink-0 gap-2 overflow-x-auto lg:w-52 lg:flex-col lg:overflow-y-auto">
          {rest.map(({ id, ...tile }) => (
            <VideoTile
              key={id}
              {...tile}
              compact
              className="aspect-video w-40 shrink-0 lg:w-full"
            />
          ))}
        </div>
      </div>
    );
  }

  if (peers.length === 1) {
    return (
      <div className="relative flex min-h-0 flex-1 p-2 sm:p-3">
        <VideoTile {...peerTile(peers[0]!)} className="h-full w-full" />
        <VideoTile
          {...selfTile}
          compact
          className="absolute right-4 bottom-4 aspect-video w-32 shadow-2xl shadow-black/40 sm:right-6 sm:bottom-6 sm:w-56"
        />
      </div>
    );
  }

  const tiles = [selfTile, ...peers.map(peerTile)];
  return (
    <div
      className={cn(
        'grid min-h-0 flex-1 auto-rows-fr gap-2 overflow-y-auto p-2 sm:p-3',
        gridColumns(tiles.length),
      )}
    >
      {tiles.map(({ id, ...tile }) => (
        <VideoTile key={id} {...tile} compact={tiles.length > 6} className="min-h-32" />
      ))}
    </div>
  );
}
