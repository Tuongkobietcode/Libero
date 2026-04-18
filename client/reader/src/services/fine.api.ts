import type { ApiEnvelope } from '../types/api';
import type { FineListResult, FineStatus } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface MyFineParams {
  status?: FineStatus;
  page?: number;
  limit?: number;
}

export const fineApi = {
  async getMyFines(params: MyFineParams): Promise<FineListResult> {
    const response = await apiClient.get<ApiEnvelope<FineListResult>>('/fines/me', { params });
    return unwrapResponse(response.data);
  },
};
