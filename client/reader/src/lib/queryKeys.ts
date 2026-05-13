import type { ReservationScope, FineStatus, LoanStatus } from '../types/models';

export const queryKeys = {
  myLoans: (status?: LoanStatus | 'all', page: number = 1) => ['reader', 'my-loans', status ?? 'all', page] as const,
  myReservations: (scope: ReservationScope, status?: string, page: number = 1) =>
    ['reader', 'my-reservations', scope, status ?? 'all', page] as const,
  myFines: (status: FineStatus | 'all', page: number = 1) => ['reader', 'my-fines', status, page] as const,
  searchBooks: (q: string, available: boolean, page: number) =>
    ['reader', 'search-books', q, available, page] as const,
  bookDetail: (bookId: string) => ['reader', 'book-detail', bookId] as const,
  facets: () => ['reader', 'catalog-facets'] as const,
  popular: (limit?: number, windowDays?: number) =>
    ['reader', 'catalog-popular', limit ?? null, windowDays ?? null] as const,
  recommendations: (limit?: number) => ['reader', 'catalog-recommendations', limit ?? null] as const,
  myStats: () => ['reader', 'my-stats'] as const,
  myActivities: (limit: number) => ['reader', 'my-activities', limit] as const,
} as const;
