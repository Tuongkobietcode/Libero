import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { BookDetail, BookListItem } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface BookListParams {
  q?: string;
  category?: string;
  available?: boolean;
  page?: number;
  limit?: number;
}

export const catalogApi = {
  async listBooks(params: BookListParams): Promise<PaginatedResult<BookListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<BookListItem>>>('/books', { params });
    return unwrapResponse(response.data);
  },
  async getBook(bookId: string): Promise<BookDetail> {
    const response = await apiClient.get<ApiEnvelope<BookDetail>>(`/books/${bookId}`);
    return unwrapResponse(response.data);
  },
};
