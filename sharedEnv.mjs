// Local-run settings from this repo's .env: HOST_IP, API_PORT, WEB_PORT, HTTPS (keep HOST_IP,
// WEB_PORT and HTTPS equal to devhub-api's .env). Used by next.config.mjs and scripts/next.mjs,
// which runs before Next loads .env itself. Values already set (shell, Vercel) win.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1']);

export function loadSharedEnv() {
  const file = fileURLToPath(new URL('./.env', import.meta.url));
  if (existsSync(file)) {
    for (const [key, value] of Object.entries(parseEnv(readFileSync(file, 'utf8')))) {
      process.env[key] ??= value;
    }
  }

  const hostIp = process.env.HOST_IP?.trim() || 'localhost';
  const https = process.env.HTTPS?.trim().toLowerCase();
  return {
    hostIp,
    apiPort: process.env.API_PORT || '4000',
    webPort: process.env.WEB_PORT || '3000',
    // Camera and mic need HTTPS on anything but localhost, so a LAN IP turns it on by default.
    https: https === 'true' || (https !== 'false' && !LOOPBACK.has(hostIp)),
  };
}
