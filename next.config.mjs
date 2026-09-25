import { loadSharedEnv } from './sharedEnv.mjs';

const { hostIp, apiPort } = loadSharedEnv();
const apiOrigin = process.env.API_INTERNAL_URL || `http://localhost:${apiPort}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev server blocks HMR and dev assets for hosts other than localhost unless listed here.
  allowedDevOrigins: [hostIp],
  // Socket.IO rides on this app's own origin (websocket upgrades included), so another device only
  // needs this one address — and one certificate when it's HTTPS.
  async rewrites() {
    return [{ source: '/socket.io', destination: `${apiOrigin}/socket.io` }];
  },
};

export default nextConfig;
