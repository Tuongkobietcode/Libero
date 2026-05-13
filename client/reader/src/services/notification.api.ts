import type { ApiEnvelope } from '../types/api';
import type { NotificationListItem, NotificationListResult } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export const notificationApi = {
  async listNotifications(params: { page?: number; limit?: number } = {}): Promise<NotificationListResult> {
    const response = await apiClient.get<ApiEnvelope<NotificationListResult>>('/notifications', { params });
    return unwrapResponse(response.data);
  },
  async markRead(notificationId: string): Promise<NotificationListItem> {
    const response = await apiClient.patch<ApiEnvelope<NotificationListItem>>(`/notifications/${notificationId}/read`);
    return unwrapResponse(response.data);
  },
  async markAllRead(): Promise<{ updatedCount: number }> {
    const response = await apiClient.patch<ApiEnvelope<{ updatedCount: number }>>('/notifications/read-all');
    return unwrapResponse(response.data);
  },
};
