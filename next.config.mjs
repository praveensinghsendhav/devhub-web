import { loadSharedEnv } from './sharedEnv.mjs';

const { hostIp, apiPort } = loadSharedEnv();
const apiUrl = (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${apiPort}`).replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev server blocks HMR and dev assets for hosts other than localhost unless listed here.
  allowedDevOrigins: [hostIp],
  // The browser calls the API directly. Locally it defaults to the API on this machine.
  env: { NEXT_PUBLIC_API_URL: apiUrl },
  // Auth calls go through this app's own origin so the refresh cookie is first-party; browsers
  // block it as a third-party cookie when the API is on another site (e.g. onrender.com).
  async rewrites() {
    return [{ source: '/api/auth/:path*', destination: `${apiUrl}/api/auth/:path*` }];
  },
};

export default nextConfig;
