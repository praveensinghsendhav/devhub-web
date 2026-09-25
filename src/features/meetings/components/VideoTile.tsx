'use client';

import { memo, useEffect, useRef } from 'react';
import { Crown, Hand, MicOff, MonitorUp, Pin, PinOff, ShieldCheck, WifiLow } from 'lucide-react';
import type { ConnectionQuality, MeetingRole } from '@devhub/shared-types';
import { Avatar } from '../../../common/components/Avatar';
import { cn } from '../../../common/lib/cn';

/** Binds a MediaStream to a (always muted) <video>. Sound plays through <CallAudio />. */
export function StreamVideo({
  stream,
  mirrored,
  fit = 'cover',
  className,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  fit?: 'cover' | 'contain';
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (video && video.srcObject !== stream) video.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn(
        'h-full w-full bg-black',
        fit === 'cover' ? 'object-cover' : 'object-contain',
        mirrored && '-scale-x-100',
        className,
      )}
    />
  );
}

export interface TileProps {
  name: string;
  avatarUrl: string | null;
  stream: MediaStream | null;
  showVideo: boolean;
  audio: boolean;
  speaking: boolean;
  hand: boolean;
  screen: boolean;
  quality: ConnectionQuality;
  role: MeetingRole;
  isSelf?: boolean;
  connecting?: boolean;
  pinned?: boolean;
  onTogglePin?: () => void;
  compact?: boolean;
  className?: string;
}

export const VideoTile = memo(function VideoTile({
  name,
  avatarUrl,
  stream,
  showVideo,
  audio,
  speaking,
  hand,
  screen,
  quality,
  role,
  isSelf,
  connecting,
  pinned,
  onTogglePin,
  compact,
  className,
}: TileProps) {
  const hasVideo = showVideo && stream !== null && stream.getVideoTracks().length > 0;

  return (
    <div
      className={cn(
        'group relative isolate flex items-center justify-center overflow-hidden rounded-2xl bg-bg-hover ring-2 transition-shadow',
        speaking ? 'ring-accent shadow-lg shadow-accent/20' : 'ring-transparent',
        className,
      )}
    >
      {hasVideo ? (
        <StreamVideo
          stream={stream}
          mirrored={isSelf && !screen}
          fit={screen ? 'contain' : 'cover'}
        />
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Avatar
            name={name}
            avatarUrl={avatarUrl}
            size={compact ? 'md' : 'lg'}
            className={cn(speaking && 'animate-pulse')}
          />
        </div>
      )}

      {connecting && (
        <span className="absolute inset-x-0 top-2 mx-auto w-fit rounded-full bg-black/60 px-2.5 py-1 text-[11px] text-white">
          Connecting…
        </span>
      )}

      {hand && (
        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-away px-2 py-1 text-[11px] font-semibold text-black shadow">
          <Hand className="h-3.5 w-3.5" /> {!compact && 'Hand raised'}
        </span>
      )}

      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          className="absolute top-2 right-2 rounded-full bg-black/55 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
        >
          {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
        </button>
      )}

      <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5">
        <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur">
          {!audio && <MicOff className="h-3.5 w-3.5 shrink-0 text-busy" aria-label="Muted" />}
          {screen && (
            <MonitorUp className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Presenting" />
          )}
          {role === 'host' && (
            <Crown className="h-3.5 w-3.5 shrink-0 text-away" aria-label="Host" />
          )}
          {role === 'cohost' && (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Co-host" />
          )}
          <span className="truncate">{isSelf ? `${name} (you)` : name}</span>
        </span>
        {quality !== 'good' && (
          <span
            className={cn(
              'rounded-full bg-black/60 p-1',
              quality === 'poor' ? 'text-busy' : 'text-away',
            )}
            title={quality === 'poor' ? 'Weak connection' : 'Unstable connection'}
          >
            <WifiLow className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
});
