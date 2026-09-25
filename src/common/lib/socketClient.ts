import { io, type Socket } from 'socket.io-client';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * By default the socket connects to this app's own origin; Next forwards /socket.io to the API
 * (next.config.mjs). That works the same on localhost, a LAN IP and HTTPS. Set NEXT_PUBLIC_WS_URL
 * to a non-localhost URL (e.g. wss://api.example.com) only when the API is reached directly.
 */
function socketUrl(): string {
  const configured = process.env.NEXT_PUBLIC_WS_URL;
  if (configured && !LOOPBACK_HOSTS.has(new URL(configured).hostname)) return configured;
  return window.location.origin;
}

let socket: Socket | null = null;

/** One socket connection for the whole app; feature hooks attach/detach their own listeners on it. */
export function connectSocket(accessToken: string): Socket {
  if (socket) {
    // Keep the handshake token fresh so automatic reconnects use the latest access token.
    socket.auth = { token: accessToken };
    if (!socket.connected && !socket.active) socket.connect();
    return socket;
  }

  socket = io(socketUrl(), {
    // "/socket.io" rather than "/socket.io/": Next would redirect the trailing slash away.
    addTrailingSlash: false,
    auth: { token: accessToken },
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
