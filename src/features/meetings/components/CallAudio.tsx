'use client';

import { useEffect, useRef } from 'react';
import { useMeetingSession } from '../useMeetingSession';

function PeerAudio({ stream, sinkId }: { stream: MediaStream; sinkId: string | null }) {
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.srcObject !== stream) audio.srcObject = stream;
    void audio.play().catch(() => undefined);
  }, [stream]);

  useEffect(() => {
    const audio = ref.current as
      (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (audio?.setSinkId && sinkId) void audio.setSinkId(sinkId).catch(() => undefined);
  }, [sinkId]);

  return <audio ref={ref} autoPlay />;
}

/**
 * Plays everyone's audio. Mounted once for the whole app (not per video tile), so sound keeps
 * going when you leave the call screen and never plays twice.
 */
export function CallAudio() {
  const peers = useMeetingSession((s) => s.peers);
  const phase = useMeetingSession((s) => s.phase);
  const sinkId = useMeetingSession((s) => s.audioOutputId);
  if (phase !== 'in-call') return null;
  return (
    <div className="hidden" aria-hidden="true">
      {peers.map((peer) => (
        <PeerAudio key={peer.peerId} stream={peer.stream} sinkId={sinkId} />
      ))}
    </div>
  );
}
