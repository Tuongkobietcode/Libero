import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { BookHoldListItem, BookHoldStatus } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface BookHoldListParams {
  status?: BookHoldStatus;
  memberId?: string;
  bookId?: string;
  page?: number;
  limit?: number;
}

export const bookHoldApi = {
  async listHolds(params: BookHoldListParams): Promise<PaginatedResult<BookHoldListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<BookHoldListItem>>>('/book-holds', { params });
    return unwrapResponse(response.data);
  },
  async createHoldForMember(payload: { memberId: string; bookId: string }): Promise<BookHoldListItem> {
    const response = await apiClient.post<ApiEnvelope<BookHoldListItem>>('/book-holds/for-member', payload);
    return unwrapResponse(response.data);
  },
  async cancelHold(holdId: string): Promise<BookHoldListItem> {
    const response = await apiClient.delete<ApiEnvelope<BookHoldListItem>>(`/book-holds/${holdId}`);
    return unwrapResponse(response.data);
  },
};
