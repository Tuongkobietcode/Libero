import type { ApiEnvelope } from '../types/api';
import type { MemberActivityItem, MemberStatsView, MemberView } from '../types/models';
import { apiClient, authClient, unwrapResponse } from './api';

export const memberApi = {
  async getMe(accessToken?: string): Promise<MemberView> {
    const response = await (accessToken ? authClient : apiClient).get<ApiEnvelope<MemberView>>('/members/me', {
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    });
    return unwrapResponse(response.data);
  },
  async getMyStats(): Promise<MemberStatsView> {
    const response = await apiClient.get<ApiEnvelope<MemberStatsView>>('/members/me/stats');
    return unwrapResponse(response.data);
  },
  async getMyActivities(limit = 5): Promise<MemberActivityItem[]> {
    const response = await apiClient.get<ApiEnvelope<MemberActivityItem[]>>('/members/me/activities', {
      params: { limit },
    });
    return unwrapResponse(response.data);
  },
};
