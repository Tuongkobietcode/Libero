import { io, type Socket } from 'socket.io-client';

import type { NotificationListItem } from '../types/models';

export interface RealtimeNotificationPayload {
  notification: NotificationListItem;
}

export interface RealtimeDomainEvent {
  type: string;
  resource: string;
  action: string;
  referenceId?: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
}

interface ServerToClientEvents {
  'notification:new': (payload: RealtimeNotificationPayload) => void;
  'library:event': (payload: RealtimeDomainEvent) => void;
}

interface ClientToServerEvents {
  ping: (callback?: (payload: { ok: boolean; at: string }) => void) => void;
}

export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: RealtimeSocket | null = null;

function getRealtimeUrl(): string {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

  if (apiBaseUrl.startsWith('http')) {
    return apiBaseUrl.replace(/\/api\/v1\/?$/, '');
  }

  return window.location.origin;
}

export function getRealtimeSocket(): RealtimeSocket {
  if (!socket) {
    socket = io(getRealtimeUrl(), {
      autoConnect: false,
      withCredentials: true,
    });
  }

  return socket;
}

export function connectRealtime(accessToken: string): RealtimeSocket {
  const realtimeSocket = getRealtimeSocket();
  realtimeSocket.auth = { token: accessToken };

  if (!realtimeSocket.connected) {
    realtimeSocket.connect();
  }

  return realtimeSocket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
}
