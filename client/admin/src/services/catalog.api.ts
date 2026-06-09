import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { BookDetail, BookListItem, CatalogFacets, CategoryListItem, CopyStatus, CsvImportResult } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface BookListParams {
  q?: string;
  category?: string;
  available?: boolean;
  page?: number;
  limit?: number;
}

export interface BookFormPayload {
  isbn: string;
  title: string;
  authors: string[];
  categories: string[];
  bookValue?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  quantity?: number;
  shelfLocation?: string;
  acquiredDate?: string;
}

export interface CategoryPayload {
  name: string;
}

export const catalogApi = {
  async listBooks(params: BookListParams): Promise<PaginatedResult<BookListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<BookListItem>>>('/books', { params });
    return unwrapResponse(response.data);
  },
  async getFacets(): Promise<CatalogFacets> {
    const response = await apiClient.get<ApiEnvelope<CatalogFacets>>('/books/facets');
    return unwrapResponse(response.data);
  },
  async listCategories(): Promise<CategoryListItem[]> {
    const response = await apiClient.get<ApiEnvelope<CategoryListItem[]>>('/books/categories');
    return unwrapResponse(response.data);
  },
  async createCategory(payload: CategoryPayload): Promise<CategoryListItem> {
    const response = await apiClient.post<ApiEnvelope<CategoryListItem>>('/books/categories', payload);
    return unwrapResponse(response.data);
  },
  async updateCategory(categoryId: string, payload: CategoryPayload): Promise<CategoryListItem> {
    const response = await apiClient.patch<ApiEnvelope<CategoryListItem>>(`/books/categories/${categoryId}`, payload);
    return unwrapResponse(response.data);
  },
  async deleteCategory(categoryId: string): Promise<{ categoryId: string; deleted: true }> {
    const response = await apiClient.delete<ApiEnvelope<{ categoryId: string; deleted: true }>>(`/books/categories/${categoryId}`);
    return unwrapResponse(response.data);
  },
  async getBook(bookId: string): Promise<BookDetail> {
    const response = await apiClient.get<ApiEnvelope<BookDetail>>(`/books/${bookId}`);
    return unwrapResponse(response.data);
  },
  async createBook(payload: Required<Pick<BookFormPayload, 'quantity'>> & Omit<BookFormPayload, 'quantity'>): Promise<BookDetail> {
    const response = await apiClient.post<ApiEnvelope<BookDetail>>('/books', payload);
    return unwrapResponse(response.data);
  },
  async updateBook(bookId: string, payload: BookFormPayload): Promise<BookDetail> {
    const response = await apiClient.patch<ApiEnvelope<BookDetail>>(`/books/${bookId}`, payload);
    return unwrapResponse(response.data);
  },
  async uploadCoverImage(file: File): Promise<{ coverImage: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiEnvelope<{ coverImage: string }>>('/books/cover-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapResponse(response.data);
  },
  async deleteBook(bookId: string): Promise<BookDetail> {
    const response = await apiClient.delete<ApiEnvelope<BookDetail>>(`/books/${bookId}`);
    return unwrapResponse(response.data);
  },
  async addCopies(bookId: string, payload: { count: number; shelfLocation?: string; acquiredDate?: string }): Promise<BookDetail> {
    const response = await apiClient.post<ApiEnvelope<BookDetail>>(`/books/${bookId}/copies`, payload);
    return unwrapResponse(response.data);
  },
  async updateCopyStatus(copyId: string, status: CopyStatus): Promise<BookDetail> {
    const response = await apiClient.patch<ApiEnvelope<BookDetail>>(`/books/copies/${copyId}`, { status });
    return unwrapResponse(response.data);
  },
  async importBooks(file: File): Promise<CsvImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiEnvelope<CsvImportResult>>('/books/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapResponse(response.data);
  },
};
