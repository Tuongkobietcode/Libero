import type { Server as HttpServer } from 'node:http';

import { Server, type Socket } from 'socket.io';

import { logger } from '../common/middleware/requestLogger';
import { Role } from '../common/types/enums';
import type { NotificationListItem } from '@libero/shared';
import { env } from '../config/env';
import { getRedisClient } from '../config/redis';
import { memberRepository } from '../modules/member/member.repository';
import { AuthService } from '../modules/member/auth.service';
import { assertCanAuthenticateWithMemberStatus } from '../modules/member/authStatus';

interface RealtimeUser {
  _id: string;
  role: Role;
  isBlocked: boolean;
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
  'notification:new': (payload: { notification: NotificationListItem }) => void;
  'library:event': (payload: RealtimeDomainEvent) => void;
}

interface ClientToServerEvents {
  ping: (callback?: (payload: { ok: boolean; at: string }) => void) => void;
}

interface SocketData {
  user: RealtimeUser;
}

type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>;
type RealtimeSocket = Socket<ClientToServerEvents, ServerToClientEvents, never, SocketData>;

let io: RealtimeServer | null = null;

function getAllowedOrigins(): string[] {
  return (env.CORS_ORIGINS ?? env.FRONTEND_URL)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getBearerToken(socket: RealtimeSocket): string | null {
  const handshakeAuth: unknown = socket.handshake.auth;
  const authToken =
    handshakeAuth && typeof handshakeAuth === 'object' && 'token' in handshakeAuth
      ? (handshakeAuth as { token?: unknown }).token
      : undefined;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const authorization = socket.handshake.headers.authorization;

  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  return null;
}

async function authenticateSocket(socket: RealtimeSocket): Promise<RealtimeUser> {
  const token = getBearerToken(socket);

  if (!token) {
    throw new Error('UNAUTHORIZED');
  }

  const authService = new AuthService(memberRepository, getRedisClient());
  const payload = authService.verifyAccessToken(token);
  const member = await memberRepository.findMemberById(payload.memberId);

  if (!member) {
    throw new Error('UNAUTHORIZED');
  }

  assertCanAuthenticateWithMemberStatus(member.status);

  return {
    _id: payload.memberId,
    role: payload.role,
    isBlocked: member.isBlocked,
  };
}

function memberRoom(memberId: string): string {
  return `member:${memberId}`;
}

function roleRoom(role: Role): string {
  return `role:${role}`;
}

function isBackofficeRole(role: Role): boolean {
  return role === Role.Admin || role === Role.Librarian;
}

export function initializeRealtime(server: HttpServer): RealtimeServer {
  if (io) {
    return io;
  }

  io = new Server<ClientToServerEvents, ServerToClientEvents, never, SocketData>(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    void authenticateSocket(socket)
      .then((user) => {
        socket.data.user = user;
        next();
      })
      .catch((error: unknown) => {
        logger.warn({ err: error }, 'Socket authentication failed');
        next(new Error('UNAUTHORIZED'));
      });
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;

    void socket.join(memberRoom(user._id));
    void socket.join(roleRoom(user.role));

    if (isBackofficeRole(user.role)) {
      void socket.join('backoffice');
    }

    socket.on('ping', (callback) => {
      callback?.({ ok: true, at: new Date().toISOString() });
    });

    logger.info({ socketId: socket.id, memberId: user._id, role: user.role }, 'Socket connected');
  });

  return io;
}

export function disconnectRealtime(): void {
  io?.disconnectSockets(true);
}

export const realtimeHub = {
  emitNotification(memberId: string, notification: NotificationListItem): void {
    io?.to(memberRoom(memberId)).emit('notification:new', { notification });
  },

  emitUserEvent(memberId: string, event: Omit<RealtimeDomainEvent, 'occurredAt'>): void {
    io?.to(memberRoom(memberId)).emit('library:event', {
      ...event,
      occurredAt: new Date().toISOString(),
    });
  },

  emitBackofficeEvent(event: Omit<RealtimeDomainEvent, 'occurredAt'>): void {
    io?.to('backoffice').emit('library:event', {
      ...event,
      occurredAt: new Date().toISOString(),
    });
  },
};
