'use client';

import { useSyncExternalStore } from 'react';
import { meetingSession, type SessionSnapshot } from './rtc/MeetingSession';

const serverSnapshot = meetingSession.getSnapshot();
const identity = (snapshot: SessionSnapshot) => snapshot;

/**
 * Subscribes a component to the live call. With a selector, the component re-renders only when
 * the selected value changes — so return a primitive or a field of the snapshot, never a new
 * object or array built inside the selector.
 */
export function useMeetingSession(): SessionSnapshot;
export function useMeetingSession<T>(select: (snapshot: SessionSnapshot) => T): T;
export function useMeetingSession<T>(
  select: (snapshot: SessionSnapshot) => T = identity as (s: SessionSnapshot) => T,
): T {
  return useSyncExternalStore(
    meetingSession.subscribe,
    () => select(meetingSession.getSnapshot()),
    () => select(serverSnapshot),
  );
}

export { meetingSession };
