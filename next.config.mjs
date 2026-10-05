import { loadSharedEnv } from './sharedEnv.mjs';

const { hostIp, apiPort } = loadSharedEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The dev server blocks HMR and dev assets for hosts other than localhost unless listed here.
  allowedDevOrigins: [hostIp],
  // The browser calls the API directly. Locally it defaults to the API on this machine.
  env: {
    NEXT_PUBLIC_API_URL: (process.env.NEXT_PUBLIC_API_URL || `http://localhost:${apiPort}`).replace(
      /\/+$/,
      '',
    ),
  },
};

export default nextConfig;
