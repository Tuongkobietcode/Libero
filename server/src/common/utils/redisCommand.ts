import type { RedisReply } from 'rate-limit-redis';

import { getRedisClient } from '../../config/redis';

export async function sendRedisCommand(...args: string[]): Promise<RedisReply> {
  const [command, ...rest] = args;
  return getRedisClient().call(command, ...rest) as Promise<RedisReply>;
}
