import type { ApiEnvelope } from '../types/api';
import type { FineListResult, FineRateView, FineStatus, PayFinesResult } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface FineListParams {
  memberId?: string;
  status?: FineStatus;
  page?: number;
  limit?: number;
}

export const fineApi = {
  async listFines(params: FineListParams): Promise<FineListResult> {
    const response = await apiClient.get<ApiEnvelope<FineListResult>>('/fines', { params });
    return unwrapResponse(response.data);
  },
  async payFines(fineIds: string[]): Promise<PayFinesResult> {
    const response = await apiClient.post<ApiEnvelope<PayFinesResult>>('/fines/pay', { fineIds });
    return unwrapResponse(response.data);
  },
  async waiveFine(fineId: string, reason: string): Promise<void> {
    await apiClient.post(`/fines/${fineId}/waive`, { reason });
  },
  async listFineRates(): Promise<FineRateView[]> {
    const response = await apiClient.get<ApiEnvelope<FineRateView[]>>('/config/fine-rates');
    return unwrapResponse(response.data);
  },
  async createFineRate(payload: { ratePerDay: number; effectiveFrom: string; appliesTo?: string }): Promise<FineRateView> {
    const response = await apiClient.post<ApiEnvelope<FineRateView>>('/config/fine-rates', payload);
    return unwrapResponse(response.data);
  },
};
