const DEVICE_ID_KEY = 'devhub_device_id';

/**
 * RFC 4122 v4 UUID. `crypto.randomUUID` only exists in secure contexts (HTTPS or localhost), so on
 * plain http://<LAN IP> it's built from `crypto.getRandomValues`, which works everywhere.
 */
function randomUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** One stable id per browser/device, persisted in localStorage — lets the API track this device's session independently of others. */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = randomUuid();
    window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'server';
  return `${window.navigator.platform || 'Unknown device'}`;
}
