import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { BookHoldListItem, BookHoldStatus } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface MyBookHoldParams {
  status?: BookHoldStatus;
  page?: number;
  limit?: number;
}

export const bookHoldApi = {
  async listMyHolds(params: MyBookHoldParams): Promise<PaginatedResult<BookHoldListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<BookHoldListItem>>>('/book-holds/me', { params });
    return unwrapResponse(response.data);
  },
  async createHold(bookId: string): Promise<BookHoldListItem> {
    const response = await apiClient.post<ApiEnvelope<BookHoldListItem>>('/book-holds', { bookId });
    return unwrapResponse(response.data);
  },
  async cancelHold(holdId: string): Promise<BookHoldListItem> {
    const response = await apiClient.delete<ApiEnvelope<BookHoldListItem>>(`/book-holds/${holdId}`);
    return unwrapResponse(response.data);
  },
};
