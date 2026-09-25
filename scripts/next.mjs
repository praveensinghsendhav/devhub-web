// Runs `next <command>` with the local-run settings from .env, e.g.
// `node scripts/next.mjs dev`: listens on WEB_PORT and, when HTTPS is on, serves a local
// certificate that covers localhost and HOST_IP.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { loadSharedEnv } from '../sharedEnv.mjs';

const require = createRequire(import.meta.url);
const { hostIp, webPort, https } = loadSharedEnv();
const [command = 'dev', ...rest] = process.argv.slice(2);
const args = [command, ...rest, '--port', webPort];

let scheme = 'http';
if (command === 'dev' && https) {
  // Next's own mkcert helper: creates (or reuses) certificates/localhost*.pem for localhost + HOST_IP.
  const { createSelfSignedCertificate } = require('next/dist/lib/mkcert');
  const cert = await createSelfSignedCertificate(hostIp === 'localhost' ? undefined : hostIp);
  if (cert) {
    scheme = 'https';
    args.push('--experimental-https', '--experimental-https-key', cert.key);
    args.push('--experimental-https-cert', cert.cert);
    if (cert.rootCA) args.push('--experimental-https-ca', cert.rootCA);
  } else {
    console.warn('[devhub] Could not create an HTTPS certificate (see error above) — using http.');
  }
}

if (command === 'dev') {
  console.log(`[devhub] HOST_IP=${hostIp} HTTPS=${scheme === 'https' ? 'on' : 'off'}`);
  console.log(`[devhub] This machine:  ${scheme}://localhost:${webPort}`);
  if (hostIp !== 'localhost')
    console.log(`[devhub] Other devices: ${scheme}://${hostIp}:${webPort}`);
  if (scheme === 'http' && hostIp !== 'localhost') {
    console.warn('[devhub] Other devices get no camera/mic over http — they need HTTPS.');
  }
  if (hostIp === 'localhost') {
    console.log(
      '[devhub] To open from other devices, set HOST_IP=<LAN IP> in .env here and in devhub-api.',
    );
  }
}

const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), ...args], {
  stdio: 'inherit',
});
child.on('exit', (code) => process.exit(code ?? 1));
