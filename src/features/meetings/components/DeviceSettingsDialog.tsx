'use client';

import { useEffect } from 'react';
import { Modal } from '../../../common/components/Modal';
import { useMeetingSession, meetingSession } from '../useMeetingSession';

function DeviceSelect({
  label,
  devices,
  value,
  onChange,
  empty,
}: {
  label: string;
  devices: MediaDeviceInfo[];
  value: string | null;
  onChange: (id: string) => void;
  empty: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-text-muted">{label}</span>
      <select
        value={value ?? devices[0]?.deviceId ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={devices.length === 0}
        className="h-11 rounded-lg border border-border bg-bg px-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
      >
        {devices.length === 0 && <option value="">{empty}</option>}
        {devices.map((device, i) => (
          <option key={device.deviceId || i} value={device.deviceId}>
            {device.label || `${label} ${i + 1}`}
          </option>
        ))}
      </select>
    </label>
  );
}

const canPickSpeaker =
  typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

export function DeviceSettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const devices = useMeetingSession((s) => s.devices);
  const audioInputId = useMeetingSession((s) => s.audioInputId);
  const videoInputId = useMeetingSession((s) => s.videoInputId);
  const audioOutputId = useMeetingSession((s) => s.audioOutputId);

  useEffect(() => {
    if (open) void meetingSession.refreshDevices();
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Audio & video"
      description="Changes apply instantly."
    >
      <div className="flex flex-col gap-4">
        <DeviceSelect
          label="Microphone"
          devices={devices.audioInputs}
          value={audioInputId}
          onChange={(id) => void meetingSession.switchMic(id)}
          empty="No microphone found"
        />
        <DeviceSelect
          label="Camera"
          devices={devices.videoInputs}
          value={videoInputId}
          onChange={(id) => void meetingSession.switchCamera(id)}
          empty="No camera found"
        />
        {canPickSpeaker && (
          <DeviceSelect
            label="Speaker"
            devices={devices.audioOutputs}
            value={audioOutputId}
            onChange={(id) => meetingSession.setAudioOutput(id)}
            empty="Default speaker"
          />
        )}
        <p className="text-xs text-text-muted">
          Echo cancellation and noise suppression are always on.
        </p>
      </div>
    </Modal>
  );
}
