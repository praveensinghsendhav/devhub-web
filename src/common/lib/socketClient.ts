import { io, type Socket } from 'socket.io-client';

/** Connects straight to the API: NEXT_PUBLIC_WS_URL when set, otherwise NEXT_PUBLIC_API_URL. */
function socketUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL!;
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
