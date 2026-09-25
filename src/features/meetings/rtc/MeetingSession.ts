import {
  SOCKET_EVENTS,
  type ConnectionQuality,
  type HostAction,
  type IceServerConfig,
  type MeetingAdmittedPayload,
  type MeetingChatMessage,
  type MeetingDeclinedPayload,
  type MeetingHostCommandPayload,
  type MeetingJoinResponse,
  type MeetingKnockPayload,
  type MeetingMedia,
  type MeetingPeer,
  type MeetingPeerLeftPayload,
  type MeetingPeerUpdatedPayload,
  type MeetingReaction,
  type MeetingReactionPayload,
  type MeetingRemovedPayload,
  type MeetingRole,
  type MeetingRoomStatePayload,
  type MeetingSignalPayload,
  type PeerMediaState,
  type SignalData,
  type SocketAck,
} from '@devhub/shared-types';
import type { Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { getSocket } from '../../../common/lib/socketClient';
import {
  adaptLink,
  audioBitrateFor,
  capForMode,
  capForPeerCount,
  captureFor,
  encodingFor,
  qualityFromSample,
  suggestsAudioOnly,
  worse,
  worstQuality,
  type LinkSample,
  type LinkState,
  type QualityMode,
  type VideoTier,
} from './quality';

/**
 * One live call, independent of React. It owns the camera/mic, one RTCPeerConnection per other
 * person (mesh), signaling over the app's socket, and the bandwidth policy. Components read it
 * through `useMeetingSession` (useSyncExternalStore), so the call survives navigating around
 * the app — the dock keeps it going while you check chat.
 */

export type SessionPhase =
  'idle' | 'preview' | 'joining' | 'locked' | 'knocking' | 'in-call' | 'ended' | 'error';

export type EndReason = 'left' | 'removed' | 'ended';

export interface RemotePeer extends MeetingPeer {
  stream: MediaStream;
  connection: RTCPeerConnectionState;
  speaking: boolean;
}

export interface FloatingReaction {
  id: string;
  peerId: string;
  name: string;
  emoji: MeetingReaction;
}

export interface DeviceLists {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export interface SessionSnapshot {
  phase: SessionPhase;
  meetingId: string | null;
  title: string;
  media: MeetingMedia;
  myRole: MeetingRole;
  isLocked: boolean;
  selfPeerId: string | null;
  /** Camera + mic, for self-view and the pre-join preview. */
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  audio: boolean;
  video: boolean;
  screen: boolean;
  hand: boolean;
  speaking: boolean;
  /** You're talking with the mic off — the UI nudges you. */
  mutedWhileTalking: boolean;
  quality: ConnectionQuality;
  qualityMode: QualityMode;
  /** Best video tier currently being sent to anyone (for the quality badge). */
  sendTier: VideoTier;
  peers: RemotePeer[];
  activeSpeakerId: string | null;
  pinnedPeerId: string | null;
  chat: MeetingChatMessage[];
  chatOpen: boolean;
  unreadChat: number;
  reactions: FloatingReaction[];
  knocks: MeetingKnockPayload[];
  error: { code: string; message: string } | null;
  mediaError: string | null;
  endReason: EndReason | null;
  joinedAt: number | null;
  devices: DeviceLists;
  audioInputId: string | null;
  videoInputId: string | null;
  audioOutputId: string | null;
}

type VideoPref = NonNullable<SignalData['videoPref']>;

interface PeerLink {
  peerId: string;
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  /** Signals for one peer are handled strictly in order. */
  queue: Promise<void>;
  stream: MediaStream;
  link: LinkState;
  /** What this peer asked us to send them. */
  remotePref: VideoPref;
  /** What we last asked this peer to send us. */
  sentPref: VideoPref | null;
  appliedTier: VideoTier | null;
  lastSample: LinkSample | null;
  downlinkPoor: boolean;
  inbound: { lost: number; received: number };
}

const PREFS_KEY = 'devhub:meeting-prefs';
const STATS_INTERVAL_MS = 3_000;
const LEVEL_INTERVAL_MS = 300;
const SPEAKING_LEVEL = 0.03;
const MAX_CHAT = 200;

interface StoredPrefs {
  qualityMode?: QualityMode;
  audioInputId?: string | null;
  videoInputId?: string | null;
  audioOutputId?: string | null;
}

function loadPrefs(): StoredPrefs {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') as StoredPrefs;
  } catch {
    return {};
  }
}

function savePrefs(patch: StoredPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
  } catch {
    // Private mode or storage blocked — preferences just won't persist.
  }
}

function initialSnapshot(): SessionSnapshot {
  const prefs = typeof window === 'undefined' ? {} : loadPrefs();
  return {
    phase: 'idle',
    meetingId: null,
    title: '',
    media: 'video',
    myRole: 'participant',
    isLocked: false,
    selfPeerId: null,
    localStream: null,
    screenStream: null,
    audio: true,
    video: true,
    screen: false,
    hand: false,
    speaking: false,
    mutedWhileTalking: false,
    quality: 'good',
    qualityMode: prefs.qualityMode ?? (suggestsAudioOnly() ? 'audio' : 'auto'),
    sendTier: 'medium',
    peers: [],
    activeSpeakerId: null,
    pinnedPeerId: null,
    chat: [],
    chatOpen: false,
    unreadChat: 0,
    reactions: [],
    knocks: [],
    error: null,
    mediaError: null,
    endReason: null,
    joinedAt: null,
    devices: { audioInputs: [], videoInputs: [], audioOutputs: [] },
    audioInputId: prefs.audioInputId ?? null,
    videoInputId: prefs.videoInputId ?? null,
    audioOutputId: prefs.audioOutputId ?? null,
  };
}

const prefToTier = (pref: VideoPref): VideoTier =>
  pref === 'off' ? 'off' : pref === 'low' ? 'low' : 'high';

function describeMediaError(err: unknown): string {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError') return 'Camera/mic access is blocked — allow it in your browser';
  if (name === 'NotFoundError') return 'No camera or microphone found';
  if (name === 'NotReadableError') return 'Your camera or mic is in use by another app';
  return 'Couldn’t start your camera or mic';
}

class MeetingSession {
  private snapshot: SessionSnapshot = initialSnapshot();
  private listeners = new Set<() => void>();
  private links = new Map<string, PeerLink>();
  private socket: Socket | null = null;
  private iceServers: RTCIceServer[] = [];
  private micTrack: MediaStreamTrack | null = null;
  private cameraTrack: MediaStreamTrack | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  /** Always-enabled copy of the mic, so we can hear you talking while muted. */
  private meterTrack: MediaStreamTrack | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private timers: ReturnType<typeof setInterval>[] = [];
  private detachSocket: (() => void) | null = null;
  private detachEnvironment: (() => void) | null = null;
  private wakeLock: { release: () => Promise<void> } | null = null;
  private lastSpokeAt = new Map<string, number>();
  private talkingWhileMutedSince: number | null = null;
  /** Camera state to restore when leaving audio-only mode. */
  private videoBeforeAudioOnly = false;

  // ── Store plumbing ───────────────────────────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SessionSnapshot => this.snapshot;

  private set(patch: Partial<SessionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private patchPeer(peerId: string, patch: Partial<RemotePeer>): void {
    const index = this.snapshot.peers.findIndex((p) => p.peerId === peerId);
    if (index < 0) return;
    const peers = [...this.snapshot.peers];
    peers[index] = { ...peers[index]!, ...patch };
    this.set({ peers });
  }

  private get meetingId(): string | null {
    return this.snapshot.meetingId;
  }

  isActive(): boolean {
    return ['joining', 'locked', 'knocking', 'in-call'].includes(this.snapshot.phase);
  }

  // ── Local media ──────────────────────────────────────────────────

  private rebuildLocalStream(): void {
    const tracks = [this.micTrack, this.cameraTrack].filter(Boolean) as MediaStreamTrack[];
    this.set({ localStream: tracks.length > 0 ? new MediaStream(tracks) : null });
  }

  private audioConstraints(deviceId: string | null): MediaTrackConstraints {
    return {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };
  }

  private videoConstraints(deviceId: string | null): MediaTrackConstraints {
    return {
      ...captureFor(this.snapshot.qualityMode),
      deviceId: deviceId ? { exact: deviceId } : undefined,
    };
  }

  private adoptMic(track: MediaStreamTrack | null): void {
    this.micTrack?.stop();
    this.meterTrack?.stop();
    this.micTrack = track;
    this.meterTrack = null;
    if (!track) return;
    track.enabled = this.snapshot.audio;
    this.meterTrack = track.clone();
    this.meterTrack.enabled = true;
    this.startMeter(this.meterTrack);
  }

  private adoptCamera(track: MediaStreamTrack | null): void {
    this.cameraTrack?.stop();
    this.cameraTrack = track;
    if (track) track.contentHint = 'motion';
  }

  private async openMic(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: this.audioConstraints(this.snapshot.audioInputId),
      });
      this.adoptMic(stream.getAudioTracks()[0] ?? null);
      return true;
    } catch (err) {
      // A remembered device that's been unplugged: fall back to the default one.
      if (
        (err as { name?: string }).name === 'OverconstrainedError' &&
        this.snapshot.audioInputId
      ) {
        this.set({ audioInputId: null });
        return this.openMic();
      }
      this.set({ mediaError: describeMediaError(err) });
      return false;
    }
  }

  private async openCamera(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: this.videoConstraints(this.snapshot.videoInputId),
      });
      this.adoptCamera(stream.getVideoTracks()[0] ?? null);
      return true;
    } catch (err) {
      if (
        (err as { name?: string }).name === 'OverconstrainedError' &&
        this.snapshot.videoInputId
      ) {
        this.set({ videoInputId: null });
        return this.openCamera();
      }
      this.set({ mediaError: describeMediaError(err) });
      return false;
    }
  }

  private startMeter(track: MediaStreamTrack): void {
    try {
      this.audioContext ??= new AudioContext();
      const source = this.audioContext.createMediaStreamSource(new MediaStream([track]));
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
    } catch {
      this.analyser = null;
    }
  }

  private localLevel(): number {
    if (!this.analyser) return 0;
    const samples = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(samples);
    let sum = 0;
    for (const s of samples) sum += s * s;
    return Math.sqrt(sum / samples.length);
  }

  async refreshDevices(): Promise<void> {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const all = await navigator.mediaDevices.enumerateDevices();
    this.set({
      devices: {
        audioInputs: all.filter((d) => d.kind === 'audioinput'),
        videoInputs: all.filter((d) => d.kind === 'videoinput'),
        audioOutputs: all.filter((d) => d.kind === 'audiooutput'),
      },
    });
  }

  // ── Lifecycle ────────────────────────────────────────────────────

  /**
   * Opens camera/mic for the pre-join screen. Already in this call? Nothing to do. In another
   * one? The caller must leave it first (the UI asks).
   */
  async prepare(meetingId: string, options: { title: string; media: MeetingMedia }): Promise<void> {
    if (this.meetingId === meetingId && this.isActive()) return;
    if (this.snapshot.phase === 'preview' && this.meetingId === meetingId) return;
    this.teardown();
    const fresh = initialSnapshot();
    const audioOnly = fresh.qualityMode === 'audio' || options.media === 'audio';
    this.snapshot = {
      ...fresh,
      phase: 'preview',
      meetingId,
      title: options.title,
      media: options.media,
      video: !audioOnly,
    };
    this.set({});

    if (!navigator.mediaDevices?.getUserMedia) {
      // Browsers hide the camera API entirely on plain http:// (anything but localhost).
      this.set({
        mediaError: window.isSecureContext
          ? 'This browser can’t make calls — try Chrome, Edge, Firefox or Safari'
          : `Camera and mic need a secure connection — open https://${window.location.host} instead`,
      });
      return;
    }

    // One prompt for both when we can; fall back to whatever is available.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: this.audioConstraints(this.snapshot.audioInputId),
        video: audioOnly ? false : this.videoConstraints(this.snapshot.videoInputId),
      });
      this.adoptMic(stream.getAudioTracks()[0] ?? null);
      this.adoptCamera(stream.getVideoTracks()[0] ?? null);
    } catch {
      await this.openMic();
      if (!audioOnly && !(await this.openCamera())) this.set({ video: false });
    }
    if (!this.micTrack) this.set({ audio: false });
    if (!this.cameraTrack) this.set({ video: false });
    this.rebuildLocalStream();
    await this.refreshDevices();
  }

  async join(): Promise<void> {
    const meetingId = this.meetingId;
    if (!meetingId || !['preview', 'locked', 'knocking', 'error'].includes(this.snapshot.phase)) {
      return;
    }
    const socket = getSocket();
    if (!socket) {
      this.set({
        phase: 'error',
        error: { code: 'offline', message: 'Not connected — retrying…' },
      });
      return;
    }
    this.socket = socket;
    this.attachSocket(socket);
    this.set({ phase: 'joining', error: null });

    if (!socket.connected) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 8_000);
        socket.once('connect', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    let response: MeetingJoinResponse | SocketAck;
    try {
      response = (await socket.timeout(10_000).emitWithAck(SOCKET_EVENTS.MEETING_JOIN, {
        meetingId,
        state: { audio: this.snapshot.audio, video: this.snapshot.video },
      })) as MeetingJoinResponse | SocketAck;
    } catch {
      this.set({
        phase: 'error',
        error: { code: 'timeout', message: 'Couldn’t reach the call — check your connection' },
      });
      return;
    }

    if (!response.ok) {
      const code = 'code' in response ? response.code : 'error';
      this.set({
        phase: code === 'locked' ? 'locked' : 'error',
        error: { code, message: response.message },
      });
      return;
    }
    if (!('selfPeerId' in response)) return;
    this.enterCall(response);
  }

  private enterCall(response: Extract<MeetingJoinResponse, { ok: true }>): void {
    this.iceServers = response.iceServers as IceServerConfig[] as RTCIceServer[];
    // Answered calls skip the pre-join screen, so a camera/mic problem would otherwise go unseen.
    if (this.snapshot.mediaError) toast.error(this.snapshot.mediaError, { duration: 10_000 });
    const forcedMute = response.meeting.muteOnJoin && response.meeting.myRole === 'participant';
    if (forcedMute && this.snapshot.audio) {
      if (this.micTrack) this.micTrack.enabled = false;
      toast.info('The host mutes everyone on entry — unmute when you’re ready');
    }

    this.set({
      phase: 'in-call',
      selfPeerId: response.selfPeerId,
      title: response.meeting.title,
      media: response.meeting.media,
      myRole: response.meeting.myRole,
      isLocked: response.meeting.isLocked,
      audio: forcedMute ? false : this.snapshot.audio,
      joinedAt: this.snapshot.joinedAt ?? Date.now(),
      peers: response.peers.map((peer) => ({
        ...peer,
        stream: new MediaStream(),
        connection: 'new',
        speaking: false,
      })),
      error: null,
    });

    // We're the newcomer, so we make the offers.
    for (const peer of response.peers) this.createLink(peer.peerId, true);
    this.startLoops();
    this.attachEnvironment();
    void this.requestWakeLock();
    this.publishState();
  }

  async knock(): Promise<void> {
    if (!this.socket || !this.meetingId) return;
    const ack = (await this.socket
      .timeout(10_000)
      .emitWithAck(SOCKET_EVENTS.MEETING_KNOCK, { meetingId: this.meetingId })
      .catch(() => ({ ok: false, message: 'Couldn’t reach the call' }))) as SocketAck;
    if (ack.ok) this.set({ phase: 'knocking' });
    else toast.error(ack.message);
  }

  /** Leave on purpose. The call keeps going for everyone else. */
  leave(): void {
    if (this.socket && this.snapshot.phase === 'in-call') {
      this.socket.emit(SOCKET_EVENTS.MEETING_LEAVE, {});
    }
    this.teardown();
    this.snapshot = { ...initialSnapshot() };
    this.set({});
  }

  /** Back to idle from the pre-join screen or an error, releasing the camera. */
  cancelPreview(): void {
    if (this.isActive()) return;
    this.teardown();
    this.snapshot = initialSnapshot();
    this.set({});
  }

  private end(reason: EndReason, message?: string): void {
    const { meetingId, title } = this.snapshot;
    this.teardown();
    this.snapshot = { ...initialSnapshot(), phase: 'ended', meetingId, title, endReason: reason };
    this.set({});
    if (message) toast.info(message);
  }

  private teardown(): void {
    for (const link of this.links.values()) link.pc.close();
    this.links.clear();
    this.timers.forEach(clearInterval);
    this.timers = [];
    this.detachSocket?.();
    this.detachSocket = null;
    this.detachEnvironment?.();
    this.detachEnvironment = null;
    this.adoptMic(null);
    this.adoptCamera(null);
    this.screenTrack?.stop();
    this.screenTrack = null;
    this.analyser = null;
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
    void this.wakeLock?.release().catch(() => undefined);
    this.wakeLock = null;
    this.lastSpokeAt.clear();
    this.talkingWhileMutedSince = null;
  }

  // ── Controls ─────────────────────────────────────────────────────

  async setAudio(on: boolean): Promise<void> {
    if (on && !this.micTrack) {
      this.set({ mediaError: null });
      if (!(await this.openMic())) return;
      this.rebuildLocalStream();
      this.attachAll();
    }
    if (this.micTrack) this.micTrack.enabled = on;
    this.set({ audio: on && Boolean(this.micTrack), mutedWhileTalking: false });
    this.publishState();
  }

  async setVideo(on: boolean): Promise<void> {
    if (on) {
      if (this.snapshot.qualityMode === 'audio') this.set({ qualityMode: 'auto' });
      this.set({ mediaError: null });
      if (!this.cameraTrack && !(await this.openCamera())) return;
    } else {
      this.adoptCamera(null);
    }
    this.set({ video: on && Boolean(this.cameraTrack) });
    this.rebuildLocalStream();
    this.attachAll();
    this.publishState();
  }

  canShareScreen(): boolean {
    return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);
  }

  async setScreen(on: boolean): Promise<void> {
    if (!on) {
      this.screenTrack?.stop();
      this.screenTrack = null;
      this.set({ screen: false, screenStream: null });
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { max: 15 }, width: { max: 1920 }, height: { max: 1080 } },
          audio: false,
        });
        const track = stream.getVideoTracks()[0];
        if (!track) return;
        track.contentHint = 'detail';
        // The browser's own "Stop sharing" button.
        track.addEventListener('ended', () => void this.setScreen(false));
        this.screenTrack?.stop();
        this.screenTrack = track;
        this.set({ screen: true, screenStream: stream });
      } catch {
        return; // Picker dismissed.
      }
    }
    this.attachAll();
    this.publishState();
  }

  setHand(raised: boolean): void {
    this.set({ hand: raised });
    this.publishState();
  }

  setPinned(peerId: string | null): void {
    this.set({ pinnedPeerId: peerId });
    this.sendPrefs();
  }

  setChatOpen(open: boolean): void {
    this.set({ chatOpen: open, unreadChat: open ? 0 : this.snapshot.unreadChat });
  }

  async setQualityMode(mode: QualityMode): Promise<void> {
    const previous = this.snapshot.qualityMode;
    if (previous === mode) return;
    savePrefs({ qualityMode: mode });

    if (mode === 'audio') {
      this.videoBeforeAudioOnly = this.snapshot.video;
      this.set({ qualityMode: mode });
      if (this.snapshot.video) await this.setVideo(false);
    } else {
      this.set({ qualityMode: mode });
      if (previous === 'audio' && this.videoBeforeAudioOnly) await this.setVideo(true);
      // Capture size only changes between High and everything else.
      if (this.cameraTrack && (mode === 'high' || previous === 'high')) {
        await this.cameraTrack.applyConstraints(captureFor(mode)).catch(() => undefined);
      }
    }
    for (const link of this.links.values()) link.link = { tier: capForMode(mode), goodStreak: 0 };
    this.attachAll();
    this.sendPrefs();
  }

  async switchMic(deviceId: string): Promise<void> {
    this.set({ audioInputId: deviceId });
    savePrefs({ audioInputId: deviceId });
    if (!(await this.openMic())) return;
    this.rebuildLocalStream();
    this.attachAll();
  }

  async switchCamera(deviceId: string): Promise<void> {
    this.set({ videoInputId: deviceId });
    savePrefs({ videoInputId: deviceId });
    if (!this.snapshot.video) return;
    if (!(await this.openCamera())) return;
    this.rebuildLocalStream();
    this.attachAll();
  }

  setAudioOutput(deviceId: string): void {
    this.set({ audioOutputId: deviceId });
    savePrefs({ audioOutputId: deviceId });
  }

  async sendChat(text: string): Promise<boolean> {
    if (!this.socket || !this.meetingId) return false;
    const ack = (await this.socket
      .timeout(8_000)
      .emitWithAck(SOCKET_EVENTS.MEETING_CHAT, { meetingId: this.meetingId, text })
      .catch(() => ({
        ok: false,
        message: 'Message not sent — check your connection',
      }))) as SocketAck;
    if (!ack.ok) toast.error(ack.message);
    return ack.ok;
  }

  react(emoji: MeetingReaction): void {
    this.socket?.emit(SOCKET_EVENTS.MEETING_REACTION, { meetingId: this.meetingId, emoji });
  }

  async hostAction(action: HostAction, peerId?: string): Promise<boolean> {
    if (!this.socket || !this.meetingId) return false;
    const ack = (await this.socket
      .timeout(10_000)
      .emitWithAck(SOCKET_EVENTS.MEETING_HOST_ACTION, { meetingId: this.meetingId, action, peerId })
      .catch(() => ({ ok: false, message: 'Couldn’t reach the call' }))) as SocketAck;
    if (!ack.ok) toast.error(ack.message);
    return ack.ok;
  }

  admit(userId: string, allow: boolean): void {
    this.set({ knocks: this.snapshot.knocks.filter((k) => k.userId !== userId) });
    this.socket?.emit(SOCKET_EVENTS.MEETING_ADMIT, { meetingId: this.meetingId, userId, allow });
  }

  private publishState(): void {
    if (this.snapshot.phase !== 'in-call' || !this.socket) return;
    const { audio, video, screen, hand, quality } = this.snapshot;
    const state: PeerMediaState = { audio, video, screen, hand, quality };
    this.socket.emit(SOCKET_EVENTS.MEETING_MEDIA, { meetingId: this.meetingId, state });
  }

  // ── Peer connections (perfect negotiation) ───────────────────────

  private signal(to: string, data: SignalData): void {
    this.socket?.emit(SOCKET_EVENTS.MEETING_SIGNAL, { meetingId: this.meetingId, to, data });
  }

  private createLink(peerId: string, initiator: boolean): PeerLink {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers, bundlePolicy: 'max-bundle' });
    const link: PeerLink = {
      peerId,
      pc,
      // Deterministic tie-break so exactly one side yields when offers cross.
      polite: (this.snapshot.selfPeerId ?? '') > peerId,
      makingOffer: false,
      ignoreOffer: false,
      queue: Promise.resolve(),
      stream: new MediaStream(),
      link: { tier: worse('medium', capForMode(this.snapshot.qualityMode)), goodStreak: 0 },
      remotePref: 'high',
      sentPref: null,
      appliedTier: null,
      lastSample: null,
      downlinkPoor: false,
      inbound: { lost: 0, received: 0 },
    };
    this.links.set(peerId, link);

    pc.onicecandidate = ({ candidate }) => {
      this.signal(peerId, {
        candidate: candidate
          ? {
              candidate: candidate.candidate,
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex,
              usernameFragment: candidate.usernameFragment,
            }
          : null,
      });
    };

    pc.onnegotiationneeded = async () => {
      try {
        link.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.signal(peerId, {
            description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
          });
        }
      } catch (err) {
        console.warn('[meeting] negotiation failed', err);
      } finally {
        link.makingOffer = false;
      }
    };

    pc.ontrack = ({ track }) => {
      for (const existing of link.stream.getTracks()) {
        if (existing.kind === track.kind && existing !== track) link.stream.removeTrack(existing);
      }
      link.stream.addTrack(track);
      // A new stream object so <video>/<audio> elements pick up the change.
      this.patchPeer(peerId, { stream: new MediaStream(link.stream.getTracks()) });
    };

    pc.onconnectionstatechange = () => {
      this.patchPeer(peerId, { connection: pc.connectionState });
      if (pc.connectionState === 'connected') {
        link.sentPref = null;
        this.sendPrefs();
        void this.applyEncodings(link);
      }
      // Network changed (Wi-Fi → mobile data): renegotiate new routes instead of dropping.
      if (pc.connectionState === 'failed') pc.restartIce();
    };

    if (initiator) {
      // Always offer both kinds, even without a camera/mic, so we can still receive —
      // and so turning them on later is a track swap, not a new negotiation.
      pc.addTransceiver(this.micTrack ?? 'audio', {
        direction: this.micTrack ? 'sendrecv' : 'recvonly',
      });
      const video = this.outgoingVideo(link);
      pc.addTransceiver(video ?? 'video', { direction: video ? 'sendrecv' : 'recvonly' });
    }
    return link;
  }

  private closeLink(peerId: string): void {
    this.links.get(peerId)?.pc.close();
    this.links.delete(peerId);
  }

  private async handleSignal(link: PeerLink, data: SignalData): Promise<void> {
    const { pc } = link;
    if (data.videoPref) {
      link.remotePref = data.videoPref;
      this.attach(link);
    }

    if (data.description) {
      const description = data.description as RTCSessionDescriptionInit;
      const collision =
        description.type === 'offer' && (link.makingOffer || pc.signalingState !== 'stable');
      link.ignoreOffer = !link.polite && collision;
      if (link.ignoreOffer) return;

      await pc.setRemoteDescription(description);
      if (description.type === 'offer') {
        // Put our camera/mic on the transceivers the offer just created, then answer.
        this.attach(link);
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.signal(link.peerId, {
            description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
          });
        }
      }
    }

    if (data.candidate !== undefined) {
      try {
        await pc.addIceCandidate(data.candidate ?? undefined);
      } catch (err) {
        if (!link.ignoreOffer) console.warn('[meeting] bad ICE candidate', err);
      }
    }
  }

  /** The camera or screen track this connection should carry right now, or none. */
  private outgoingVideo(link: PeerLink): MediaStreamTrack | null {
    const track = this.screenTrack ?? this.cameraTrack;
    if (!track) return null;
    return this.tierFor(link) === 'off' ? null : track;
  }

  private tierFor(link: PeerLink): VideoTier {
    const { qualityMode, peers } = this.snapshot;
    // Screen shares aren't dropped by the audio-only toggle — that setting is about cameras.
    const modeCap = this.screenTrack && qualityMode === 'audio' ? 'low' : capForMode(qualityMode);
    return [capForPeerCount(peers.length), prefToTier(link.remotePref), link.link.tier].reduce(
      worse,
      modeCap,
    );
  }

  /** Syncs one connection's senders with the current tracks and tier. */
  private attach(link: PeerLink): void {
    const { pc } = link;
    if (pc.signalingState === 'closed') return;
    const seen = new Set<string>();
    for (const transceiver of pc.getTransceivers()) {
      if (transceiver.direction === 'stopped' || transceiver.currentDirection === 'stopped')
        continue;
      const kind = transceiver.receiver.track.kind;
      // One audio and one video line per connection; anything extra stays silent.
      const track = seen.has(kind)
        ? null
        : kind === 'audio'
          ? this.micTrack
          : this.outgoingVideo(link);
      seen.add(kind);
      if (transceiver.sender.track !== track) {
        void transceiver.sender.replaceTrack(track).catch(() => undefined);
      }
      // Upgrading recvonly → sendrecv renegotiates once; turning off never does (null track).
      if (track && (transceiver.direction === 'recvonly' || transceiver.direction === 'inactive')) {
        transceiver.direction = 'sendrecv';
      }
    }
    void this.applyEncodings(link);
  }

  private attachAll(): void {
    for (const link of this.links.values()) this.attach(link);
    this.updateSendTier();
  }

  private async applyEncodings(link: PeerLink): Promise<void> {
    if (link.pc.connectionState !== 'connected') return;
    const tier = this.tierFor(link);
    const screen = Boolean(this.screenTrack);
    for (const sender of link.pc.getSenders()) {
      if (!sender.track) continue;
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) continue;
      const encoding = params.encodings[0]!;
      if (sender.track.kind === 'audio') {
        encoding.maxBitrate = audioBitrateFor(this.snapshot.qualityMode);
      } else if (tier !== 'off') {
        const preset = encodingFor(tier, screen);
        encoding.maxBitrate = preset.maxBitrate;
        encoding.scaleResolutionDownBy = preset.scaleResolutionDownBy;
        encoding.maxFramerate = preset.maxFramerate;
      }
      try {
        await sender.setParameters(params);
      } catch {
        // Mid-renegotiation; the next stats tick retries.
      }
    }
    link.appliedTier = tier;
  }

  private updateSendTier(): void {
    const tiers = [...this.links.values()].map((link) => this.tierFor(link));
    const best =
      tiers.length === 0
        ? capForMode(this.snapshot.qualityMode)
        : tiers.reduce((a, b) => (worse(a, b) === a ? b : a));
    if (best !== this.snapshot.sendTier) this.set({ sendTier: best });
  }

  /** What we ask each person to send us, based on what we can show and afford. */
  private prefFor(peerId: string, link: PeerLink): VideoPref {
    const { qualityMode, pinnedPeerId, activeSpeakerId, peers } = this.snapshot;
    if (qualityMode === 'audio' || document.hidden) return 'off';
    if (qualityMode === 'low' || link.downlinkPoor) return 'low';
    if (pinnedPeerId) return pinnedPeerId === peerId ? 'high' : 'low';
    // In a big grid tiles are small: only the current speaker needs full quality.
    if (peers.length > 4 && activeSpeakerId !== peerId) return 'low';
    return 'high';
  }

  private sendPrefs(): void {
    for (const [peerId, link] of this.links) {
      if (link.pc.connectionState !== 'connected') continue;
      const pref = this.prefFor(peerId, link);
      if (pref === link.sentPref) continue;
      link.sentPref = pref;
      this.signal(peerId, { videoPref: pref });
    }
  }

  // ── Periodic work: stats, adaptation, speaking ───────────────────

  private startLoops(): void {
    this.timers.push(setInterval(() => void this.sampleStats(), STATS_INTERVAL_MS));
    this.timers.push(setInterval(() => this.sampleLevels(), LEVEL_INTERVAL_MS));
  }

  private async sampleStats(): Promise<void> {
    const qualities: ConnectionQuality[] = [];
    for (const link of this.links.values()) {
      if (link.pc.connectionState !== 'connected') continue;
      let report: RTCStatsReport;
      try {
        report = await link.pc.getStats();
      } catch {
        continue;
      }
      let videoLoss: number | null = null;
      let audioLoss: number | null = null;
      let rtt = 0;
      let available: number | null = null;
      let limited = false;
      let lost = 0;
      let received = 0;
      report.forEach((stat: Record<string, unknown>) => {
        if (stat.type === 'remote-inbound-rtp') {
          const loss = Number(stat.fractionLost ?? 0);
          if (stat.kind === 'video') videoLoss = loss;
          else audioLoss = loss;
          if (typeof stat.roundTripTime === 'number')
            rtt = Math.max(rtt, stat.roundTripTime * 1000);
        } else if (stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded') {
          if (typeof stat.availableOutgoingBitrate === 'number') {
            available = stat.availableOutgoingBitrate;
          }
          if (!rtt && typeof stat.currentRoundTripTime === 'number') {
            rtt = stat.currentRoundTripTime * 1000;
          }
        } else if (stat.type === 'outbound-rtp' && stat.kind === 'video') {
          limited ||= stat.qualityLimitationReason === 'bandwidth';
        } else if (stat.type === 'inbound-rtp') {
          lost += Number(stat.packetsLost ?? 0);
          received += Number(stat.packetsReceived ?? 0);
        }
      });

      const sample: LinkSample = {
        lossRatio: videoLoss ?? audioLoss ?? 0,
        rttMs: rtt,
        availableBps: available,
        limited,
      };
      link.lastSample = sample;
      qualities.push(qualityFromSample(sample));

      // Downlink: how much of what this person sends us is getting lost.
      const lostDelta = lost - link.inbound.lost;
      const receivedDelta = received - link.inbound.received;
      link.inbound = { lost, received };
      const downLoss = lostDelta + receivedDelta > 0 ? lostDelta / (lostDelta + receivedDelta) : 0;
      link.downlinkPoor = this.snapshot.qualityMode === 'auto' && downLoss > 0.1;

      if (this.snapshot.qualityMode === 'auto') {
        const ceiling = worse(capForMode('auto'), capForPeerCount(this.snapshot.peers.length));
        link.link = adaptLink(link.link, sample, ceiling);
      }
      if (this.tierFor(link) !== link.appliedTier) this.attach(link);
    }

    this.updateSendTier();
    this.sendPrefs();
    const quality = worstQuality(qualities);
    if (quality !== this.snapshot.quality) {
      this.set({ quality });
      this.publishState();
    }
  }

  private sampleLevels(): void {
    const now = Date.now();
    let loudest: { peerId: string; level: number } | null = null;

    for (const [peerId, link] of this.links) {
      const receiver = link.pc.getReceivers().find((r) => r.track.kind === 'audio');
      const source = receiver?.getSynchronizationSources?.()[0];
      // Sources linger after someone stops talking; ignore stale readings. Browsers disagree on
      // the clock (epoch vs. page-relative), so accept either.
      const fresh =
        source &&
        (Math.abs(now - source.timestamp) < 1_000 ||
          Math.abs(performance.now() - source.timestamp) < 1_000);
      const level = fresh ? (source.audioLevel ?? 0) : 0;
      const speaking = level > SPEAKING_LEVEL;
      if (speaking) {
        this.lastSpokeAt.set(peerId, now);
        if (!loudest || level > loudest.level) loudest = { peerId, level };
      }
      const peer = this.snapshot.peers.find((p) => p.peerId === peerId);
      if (peer && peer.speaking !== speaking) this.patchPeer(peerId, { speaking });
    }

    // The main speaker only changes when someone else actually talks, so the view doesn't jump.
    if (loudest && loudest.peerId !== this.snapshot.activeSpeakerId) {
      this.set({ activeSpeakerId: loudest.peerId });
      this.sendPrefs();
    }

    const localLevel = this.localLevel();
    const talking = localLevel > 0.02;
    const speaking = this.snapshot.audio && talking;
    if (speaking !== this.snapshot.speaking) this.set({ speaking });

    if (!this.snapshot.audio && talking) {
      this.talkingWhileMutedSince ??= now;
      if (now - this.talkingWhileMutedSince > 1_200 && !this.snapshot.mutedWhileTalking) {
        this.set({ mutedWhileTalking: true });
      }
    } else if (!talking) {
      this.talkingWhileMutedSince = null;
      if (this.snapshot.mutedWhileTalking) this.set({ mutedWhileTalking: false });
    }
  }

  // ── Socket events ────────────────────────────────────────────────

  private attachSocket(socket: Socket): void {
    if (this.detachSocket) return;
    const mine = (payload: { meetingId: string }) =>
      payload.meetingId === this.meetingId && this.snapshot.phase === 'in-call';

    const onSignal = (payload: MeetingSignalPayload) => {
      if (!mine(payload)) return;
      let link = this.links.get(payload.from);
      if (!link) {
        // Only an offer can open a connection with someone new.
        if (payload.data.description?.type !== 'offer') return;
        link = this.createLink(payload.from, false);
      }
      const target = link;
      target.queue = target.queue
        .then(() => this.handleSignal(target, payload.data))
        .catch((err) => console.warn('[meeting] signal failed', err));
    };

    const onPeerJoined = ({ meetingId, peer }: MeetingPeerUpdatedPayload) => {
      if (!mine({ meetingId }) || peer.peerId === this.snapshot.selfPeerId) return;
      if (this.snapshot.peers.some((p) => p.peerId === peer.peerId)) return;
      this.set({
        peers: [
          ...this.snapshot.peers,
          { ...peer, stream: new MediaStream(), connection: 'new', speaking: false },
        ],
      });
      // They make the offer; we answer when it arrives. Everyone's share of upload just shrank.
      this.attachAll();
    };

    const onPeerLeft = ({ meetingId, peerId }: MeetingPeerLeftPayload) => {
      if (!mine({ meetingId })) return;
      this.closeLink(peerId);
      this.set({
        peers: this.snapshot.peers.filter((p) => p.peerId !== peerId),
        pinnedPeerId: this.snapshot.pinnedPeerId === peerId ? null : this.snapshot.pinnedPeerId,
        activeSpeakerId:
          this.snapshot.activeSpeakerId === peerId ? null : this.snapshot.activeSpeakerId,
      });
      this.attachAll();
    };

    const onPeerUpdated = ({ meetingId, peer }: MeetingPeerUpdatedPayload) => {
      if (!mine({ meetingId })) return;
      if (peer.peerId === this.snapshot.selfPeerId) {
        if (peer.role !== this.snapshot.myRole) {
          this.set({ myRole: peer.role });
          toast.success(
            peer.role === 'cohost' ? 'You’re now a co-host' : 'You’re no longer a co-host',
          );
        }
        return;
      }
      const { role, state, name, avatarUrl } = peer;
      this.patchPeer(peer.peerId, { role, state, name, avatarUrl });
    };

    const onRoomState = ({ meetingId, isLocked }: MeetingRoomStatePayload) => {
      if (!mine({ meetingId })) return;
      this.set({ isLocked });
      toast.info(isLocked ? 'Meeting locked — new people must ask to join' : 'Meeting unlocked');
    };

    const onHostCommand = ({ meetingId, command, byName }: MeetingHostCommandPayload) => {
      if (!mine({ meetingId })) return;
      if (command === 'mute' && this.snapshot.audio) {
        void this.setAudio(false);
        toast.info(`${byName} muted you`);
      } else if (command === 'camera-off' && this.snapshot.video) {
        void this.setVideo(false);
        toast.info(`${byName} turned off your camera`);
      } else if (command === 'lower-hand' && this.snapshot.hand) {
        this.setHand(false);
        toast.info(`${byName} lowered your hand`);
      }
    };

    const onRemoved = ({ meetingId, reason }: MeetingRemovedPayload) => {
      if (meetingId !== this.meetingId) return;
      const message =
        reason === 'removed'
          ? 'A host removed you from the call'
          : this.snapshot.myRole === 'host'
            ? 'You ended the call for everyone'
            : 'The host ended the call';
      this.end(reason, message);
    };

    const onChat = (message: MeetingChatMessage) => {
      if (!mine(message)) return;
      if (this.snapshot.chat.some((m) => m.id === message.id)) return;
      const chat = [...this.snapshot.chat, message].slice(-MAX_CHAT);
      const fromMe = message.peerId === this.snapshot.selfPeerId;
      this.set({
        chat,
        unreadChat: this.snapshot.chatOpen || fromMe ? 0 : this.snapshot.unreadChat + 1,
      });
    };

    const onReaction = (payload: MeetingReactionPayload) => {
      if (!mine(payload)) return;
      const reaction: FloatingReaction = { ...payload, id: `${Date.now()}-${Math.random()}` };
      this.set({ reactions: [...this.snapshot.reactions, reaction].slice(-20) });
      setTimeout(() => {
        this.set({ reactions: this.snapshot.reactions.filter((r) => r.id !== reaction.id) });
      }, 4_000);
    };

    const onKnock = (payload: MeetingKnockPayload) => {
      if (!mine(payload)) return;
      if (this.snapshot.knocks.some((k) => k.userId === payload.userId)) return;
      this.set({ knocks: [...this.snapshot.knocks, payload] });
      toast(`${payload.name} is asking to join`, {
        duration: 15_000,
        action: { label: 'Admit', onClick: () => this.admit(payload.userId, true) },
      });
    };

    const onAdmitted = ({ meetingId, allow }: MeetingAdmittedPayload) => {
      if (meetingId !== this.meetingId || this.snapshot.phase !== 'knocking') return;
      if (allow) void this.join();
      else
        this.set({
          phase: 'error',
          error: { code: 'denied', message: 'The host declined your request' },
        });
    };

    const onDeclined = ({ meetingId, name }: MeetingDeclinedPayload) => {
      if (mine({ meetingId })) toast.info(`${name} declined the call`);
    };

    // A dropped socket takes us out of the room server-side; come straight back in.
    const onReconnect = () => {
      if (this.snapshot.phase !== 'in-call') return;
      for (const peerId of [...this.links.keys()]) this.closeLink(peerId);
      this.timers.forEach(clearInterval);
      this.timers = [];
      this.set({ phase: 'preview', peers: [] });
      void this.join();
    };

    // Each handler validates its own payload shape; the socket client types listeners loosely.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: [string, (...args: any[]) => void][] = [
      [SOCKET_EVENTS.MEETING_SIGNAL, onSignal],
      [SOCKET_EVENTS.MEETING_PEER_JOINED, onPeerJoined],
      [SOCKET_EVENTS.MEETING_PEER_LEFT, onPeerLeft],
      [SOCKET_EVENTS.MEETING_PEER_UPDATED, onPeerUpdated],
      [SOCKET_EVENTS.MEETING_ROOM_STATE, onRoomState],
      [SOCKET_EVENTS.MEETING_HOST_COMMAND, onHostCommand],
      [SOCKET_EVENTS.MEETING_REMOVED, onRemoved],
      [SOCKET_EVENTS.MEETING_CHAT, onChat],
      [SOCKET_EVENTS.MEETING_REACTION, onReaction],
      [SOCKET_EVENTS.MEETING_KNOCK, onKnock],
      [SOCKET_EVENTS.MEETING_ADMITTED, onAdmitted],
      [SOCKET_EVENTS.MEETING_DECLINED, onDeclined],
    ];
    for (const [event, handler] of handlers) socket.on(event, handler);
    socket.on('connect', onReconnect);

    this.detachSocket = () => {
      for (const [event, handler] of handlers) socket.off(event, handler);
      socket.off('connect', onReconnect);
    };
  }

  /** Tab visibility and device changes. */
  private attachEnvironment(): void {
    if (this.detachEnvironment) return;
    // Hidden tab: stop receiving video entirely — nobody's watching it.
    const onVisibility = () => this.sendPrefs();
    const onDevices = () => void this.refreshDevices();
    document.addEventListener('visibilitychange', onVisibility);
    navigator.mediaDevices?.addEventListener?.('devicechange', onDevices);
    this.detachEnvironment = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      navigator.mediaDevices?.removeEventListener?.('devicechange', onDevices);
    };
  }

  /** Keeps phones from sleeping mid-call. Best effort. */
  private async requestWakeLock(): Promise<void> {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
      };
      this.wakeLock = (await nav.wakeLock?.request('screen')) ?? null;
    } catch {
      this.wakeLock = null;
    }
  }
}

/** The one call this tab can be in. */
export const meetingSession = new MeetingSession();
