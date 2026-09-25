import type { ConnectionQuality } from '@devhub/shared-types';

/**
 * Bandwidth policy for calls. Every connection gets its own sending tier, chosen as the lowest of:
 * what the user picked, what the receiver asked for, what the network can carry right now, and a
 * share of the upload budget (in a mesh call you upload one stream per person).
 */

/** What the user picks in the quality menu. */
export type QualityMode = 'auto' | 'high' | 'medium' | 'low' | 'audio';

/** What actually gets sent on one connection, best to worst. */
export type VideoTier = 'high' | 'medium' | 'low' | 'minimal' | 'off';

export const TIER_ORDER: VideoTier[] = ['high', 'medium', 'low', 'minimal', 'off'];

export const QUALITY_MODES: { id: QualityMode; label: string; hint: string }[] = [
  { id: 'auto', label: 'Auto', hint: 'Adjusts to your connection (recommended)' },
  { id: 'high', label: 'High', hint: 'Sharpest video · ~1 Mbps per person' },
  { id: 'medium', label: 'Balanced', hint: 'Good quality · ~450 kbps per person' },
  { id: 'low', label: 'Data saver', hint: 'Low-res video · ~150 kbps per person' },
  { id: 'audio', label: 'Audio only', hint: 'No video in or out · ~30 kbps' },
];

interface EncodingPreset {
  maxBitrate: number;
  scaleResolutionDownBy: number;
  maxFramerate: number;
}

/** Camera encodings, relative to a 640×360 capture (1280×720 in High). */
const CAMERA: Record<Exclude<VideoTier, 'off'>, EncodingPreset> = {
  high: { maxBitrate: 900_000, scaleResolutionDownBy: 1, maxFramerate: 30 },
  medium: { maxBitrate: 450_000, scaleResolutionDownBy: 1, maxFramerate: 24 },
  low: { maxBitrate: 150_000, scaleResolutionDownBy: 2, maxFramerate: 15 },
  minimal: { maxBitrate: 60_000, scaleResolutionDownBy: 4, maxFramerate: 8 },
};

/** Screens favour sharp text over smooth motion: keep resolution, drop frames instead. */
const SCREEN: Record<Exclude<VideoTier, 'off'>, EncodingPreset> = {
  high: { maxBitrate: 1_500_000, scaleResolutionDownBy: 1, maxFramerate: 15 },
  medium: { maxBitrate: 800_000, scaleResolutionDownBy: 1, maxFramerate: 10 },
  low: { maxBitrate: 350_000, scaleResolutionDownBy: 1.5, maxFramerate: 5 },
  minimal: { maxBitrate: 150_000, scaleResolutionDownBy: 2, maxFramerate: 3 },
};

export function encodingFor(tier: Exclude<VideoTier, 'off'>, screen: boolean): EncodingPreset {
  return (screen ? SCREEN : CAMERA)[tier];
}

/** Opus is already efficient; DTX (on by default in browsers) makes silence nearly free. */
export function audioBitrateFor(mode: QualityMode): number {
  return mode === 'high' ? 48_000 : mode === 'auto' || mode === 'medium' ? 32_000 : 20_000;
}

export function captureFor(mode: QualityMode): MediaTrackConstraints {
  return mode === 'high'
    ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }
    : { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24, max: 30 } };
}

export const worse = (a: VideoTier, b: VideoTier): VideoTier =>
  TIER_ORDER[Math.max(TIER_ORDER.indexOf(a), TIER_ORDER.indexOf(b))]!;

export const stepDown = (tier: VideoTier): VideoTier =>
  TIER_ORDER[Math.min(TIER_ORDER.indexOf(tier) + 1, TIER_ORDER.indexOf('minimal'))]!;

export const stepUp = (tier: VideoTier): VideoTier =>
  TIER_ORDER[Math.max(TIER_ORDER.indexOf(tier) - 1, 0)]!;

/** The best tier the user's chosen mode allows. */
export function capForMode(mode: QualityMode): VideoTier {
  switch (mode) {
    case 'high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'low':
      return 'low';
    case 'audio':
      return 'off';
    default:
      return networkHintCap();
  }
}

/** Each extra person is another upload; share the budget out as the call grows. */
export function capForPeerCount(peers: number): VideoTier {
  if (peers <= 1) return 'high';
  if (peers <= 3) return 'medium';
  if (peers <= 7) return 'low';
  return 'minimal';
}

interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
}

export function networkInfo(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
}

/** The browser's own guess (Chrome/Android): data saver or a 2G/3G link caps quality from the start. */
export function networkHintCap(): VideoTier {
  const info = networkInfo();
  if (!info) return 'high';
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') return 'minimal';
  if (info.saveData || info.effectiveType === '3g') return 'low';
  return 'high';
}

/** True when the connection is so weak that audio-only is the sensible default. */
export function suggestsAudioOnly(): boolean {
  const type = networkInfo()?.effectiveType;
  return type === 'slow-2g' || type === '2g';
}

/** One stats sample for one outgoing connection. */
export interface LinkSample {
  lossRatio: number;
  rttMs: number;
  /** Browser's congestion-control estimate, when available. */
  availableBps: number | null;
  /** The encoder itself says it's held back by bandwidth or CPU. */
  limited: boolean;
}

export interface LinkState {
  tier: VideoTier;
  goodStreak: number;
}

/**
 * Adapts one connection's tier with hysteresis: drop fast on trouble, climb slowly (three clean
 * samples ≈ 9s) so quality doesn't flap.
 */
export function adaptLink(state: LinkState, sample: LinkSample, ceiling: VideoTier): LinkState {
  const bad =
    sample.lossRatio > 0.08 ||
    sample.rttMs > 700 ||
    (sample.availableBps !== null && sample.availableBps < 120_000);
  const good =
    sample.lossRatio < 0.02 &&
    sample.rttMs < 300 &&
    !sample.limited &&
    (sample.availableBps === null || sample.availableBps > 600_000);

  if (bad) return { tier: worse(stepDown(state.tier), ceiling), goodStreak: 0 };
  if (good) {
    const streak = state.goodStreak + 1;
    if (streak >= 3) return { tier: worse(stepUp(state.tier), ceiling), goodStreak: 0 };
    return { tier: worse(state.tier, ceiling), goodStreak: streak };
  }
  return { tier: worse(state.tier, ceiling), goodStreak: 0 };
}

export function qualityFromSample(sample: LinkSample | null): ConnectionQuality {
  if (!sample) return 'good';
  if (sample.lossRatio > 0.08 || sample.rttMs > 700) return 'poor';
  if (sample.lossRatio > 0.02 || sample.rttMs > 300) return 'fair';
  return 'good';
}

export function worstQuality(values: ConnectionQuality[]): ConnectionQuality {
  if (values.includes('poor')) return 'poor';
  if (values.includes('fair')) return 'fair';
  return 'good';
}
