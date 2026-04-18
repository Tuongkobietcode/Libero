import mongoose from 'mongoose';

import { logger } from '../common/middleware/requestLogger';
import { env } from './env';

const RETRY_DELAY_MS = 5_000;

const connectionStateMap: Record<number, 'disconnected' | 'connected' | 'connecting' | 'disconnecting'> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let connectPromise: Promise<typeof mongoose> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let listenersBound = false;
let shuttingDown = false;

function clearReconnectTimer(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect(): void {
  if (shuttingDown || reconnectTimer) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    void connectToDatabase().catch((error: unknown) => {
      logger.error({ err: error }, 'MongoDB reconnect attempt failed');
    });
  }, RETRY_DELAY_MS);
}

function bindDatabaseEvents(): void {
  if (listenersBound) {
    return;
  }

  listenersBound = true;

  mongoose.connection.on('connected', () => {
    clearReconnectTimer();
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (error) => {
    logger.error({ err: error }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
    scheduleReconnect();
  });
}

export async function connectToDatabase(): Promise<void> {
  bindDatabaseEvents();

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (connectPromise) {
    await connectPromise;
    return;
  }

  connectPromise = mongoose
    .connect(env.MONGODB_URI, {
      autoIndex: env.NODE_ENV !== 'production',
      serverSelectionTimeoutMS: RETRY_DELAY_MS,
    })
    .catch((error: unknown) => {
      scheduleReconnect();
      throw error;
    })
    .finally(() => {
      connectPromise = null;
    });

  await connectPromise;
}

export function getDatabaseStatus(): 'disconnected' | 'connected' | 'connecting' | 'disconnecting' {
  return connectionStateMap[mongoose.connection.readyState] ?? 'disconnected';
}

export async function closeDatabaseConnection(): Promise<void> {
  shuttingDown = true;
  clearReconnectTimer();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
