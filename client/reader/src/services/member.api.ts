import type { ApiEnvelope } from '../types/api';
import type { MemberActivityItem, MemberStatsView, MemberView } from '../types/models';
import { apiClient, authClient, unwrapResponse } from './api';

export interface UpdateMyProfilePayload {
  fullName?: string;
  email?: string;
  phone?: string;
  studentId?: string;
  faculty?: string;
  className?: string;
}

export interface ChangeMyPasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export const memberApi = {
  async getMe(accessToken?: string): Promise<MemberView> {
    const response = await (accessToken ? authClient : apiClient).get<ApiEnvelope<MemberView>>('/members/me', {
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    });
    return unwrapResponse(response.data);
  },
  async updateMyProfile(payload: UpdateMyProfilePayload): Promise<MemberView> {
    const response = await apiClient.patch<ApiEnvelope<MemberView>>('/members/me', payload);
    return unwrapResponse(response.data);
  },
  async changeMyPassword(payload: ChangeMyPasswordPayload): Promise<MemberView> {
    const response = await apiClient.patch<ApiEnvelope<MemberView>>('/members/me/password', payload);
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
