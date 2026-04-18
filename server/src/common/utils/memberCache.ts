export function buildMemberCacheKey(memberId: string): string {
  return `member_cache:${memberId}`;
}
