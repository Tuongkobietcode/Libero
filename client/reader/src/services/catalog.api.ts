import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { BookDetail, BookListItem, CatalogFacets } from '../types/models';
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
  async getFacets(): Promise<CatalogFacets> {
    const response = await apiClient.get<ApiEnvelope<CatalogFacets>>('/books/facets');
    return unwrapResponse(response.data);
  },
  async getPopular(params: { limit?: number; windowDays?: number } = {}): Promise<BookListItem[]> {
    const response = await apiClient.get<ApiEnvelope<BookListItem[]>>('/books/popular', { params });
    return unwrapResponse(response.data);
  },
  async getRecommendations(params: { limit?: number } = {}): Promise<BookListItem[]> {
    const response = await apiClient.get<ApiEnvelope<BookListItem[]>>('/books/recommendations', { params });
    return unwrapResponse(response.data);
  },
};
