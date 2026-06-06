import IORedis from 'ioredis';

import { logger } from '../common/middleware/requestLogger';
import { env } from './env';

type RedisHealthStatus = 'connected' | 'connecting' | 'disconnected';

function shouldPreferIpv4ForLocalRedis(uri: string): boolean {
  return uri.includes('localhost') || uri.includes('127.0.0.1') || uri.includes('[::1]');
}

const redis = new IORedis(env.REDIS_URL, {
  lazyConnect: true,
  connectTimeout: 5_000,
  family: shouldPreferIpv4ForLocalRedis(env.REDIS_URL) ? 4 : undefined,
  maxRetriesPerRequest: null,
  retryStrategy: () => null,
  enableOfflineQueue: false,
});

let listenersBound = false;

function bindRedisEvents(): void {
  if (listenersBound) {
    return;
  }

  listenersBound = true;

  redis.on('connect', () => {
    logger.info('Redis connected');
  });

  redis.on('ready', () => {
    logger.info('Redis ready');
  });

  redis.on('error', (error) => {
    logger.error({ err: error }, 'Redis connection error');
  });

  redis.on('close', () => {
    logger.warn('Redis connection closed');
  });

  redis.on('reconnecting', () => {
    logger.warn('Redis reconnecting');
  });
}

export function getRedisClient(): IORedis {
  bindRedisEvents();
  return redis;
}

export async function connectToRedis(): Promise<void> {
  bindRedisEvents();

  if (redis.status === 'ready' || redis.status === 'connect' || redis.status === 'connecting') {
    return;
  }

  await redis.connect();
}

export function getRedisStatus(): RedisHealthStatus {
  if (redis.status === 'ready') {
    return 'connected';
  }

  if (['connect', 'connecting', 'reconnecting'].includes(redis.status)) {
    return 'connecting';
  }

  return 'disconnected';
}

export async function closeRedisConnection(): Promise<void> {
  if (redis.status === 'ready') {
    await redis.quit();
    return;
  }

  if (redis.status !== 'end') {
    redis.disconnect();
  }
}
