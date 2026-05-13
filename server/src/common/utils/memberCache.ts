import { getRedisClient } from '../../config/redis';

export function buildMemberCacheKey(memberId: string): string {
  return `member_cache:${memberId}`;
}

export async function invalidateMemberCache(memberId: string): Promise<void> {
  try {
    await getRedisClient().del(buildMemberCacheKey(memberId));
  } catch {
    return;
  }
}
