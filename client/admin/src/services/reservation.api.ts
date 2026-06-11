import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { ReservationListItem, ReservationScope, ReservationStatus } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface ReservationListParams {
  scope?: ReservationScope;
  status?: ReservationStatus;
  memberId?: string;
  bookId?: string;
  page?: number;
  limit?: number;
}

export const reservationApi = {
  async listReservations(params: ReservationListParams): Promise<PaginatedResult<ReservationListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<ReservationListItem>>>('/reservations', { params });
    return unwrapResponse(response.data);
  },
  async cancelReservation(reservationId: string): Promise<ReservationListItem> {
    const response = await apiClient.delete<ApiEnvelope<ReservationListItem>>(`/reservations/${reservationId}`);
    return unwrapResponse(response.data);
  },
};
