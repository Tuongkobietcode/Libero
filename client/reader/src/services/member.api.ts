import type { ApiEnvelope } from '../types/api';
import type { MemberView } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export const memberApi = {
  async getMe(): Promise<MemberView> {
    const response = await apiClient.get<ApiEnvelope<MemberView>>('/members/me');
    return unwrapResponse(response.data);
  },
};
