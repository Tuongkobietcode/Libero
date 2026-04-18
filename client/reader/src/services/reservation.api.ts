import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { ReservationListItem, ReservationScope, ReservationStatus } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface MyReservationParams {
  scope?: ReservationScope;
  status?: ReservationStatus;
  page?: number;
  limit?: number;
}

export const reservationApi = {
  async listMyReservations(params: MyReservationParams): Promise<PaginatedResult<ReservationListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<ReservationListItem>>>('/reservations/me', { params });
    return unwrapResponse(response.data);
  },
  async createReservation(bookId: string): Promise<ReservationListItem> {
    const response = await apiClient.post<ApiEnvelope<ReservationListItem>>('/reservations', { bookId });
    return unwrapResponse(response.data);
  },
  async cancelReservation(reservationId: string): Promise<ReservationListItem> {
    const response = await apiClient.delete<ApiEnvelope<ReservationListItem>>(`/reservations/${reservationId}`);
    return unwrapResponse(response.data);
  },
};
