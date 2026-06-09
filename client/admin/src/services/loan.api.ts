import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { LoanDetail, LoanListItem, LoanStatus, Role } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface LoanListParams {
  status?: LoanStatus;
  memberId?: string;
  role?: Role;
  page?: number;
  limit?: number;
}

export const loanApi = {
  async checkout(payload: { memberId: string; barcode: string }): Promise<LoanDetail> {
    const response = await apiClient.post<ApiEnvelope<LoanDetail>>('/loans/checkout', payload);
    return unwrapResponse(response.data);
  },
  async returnByLoanId(loanId: string): Promise<LoanDetail> {
    const response = await apiClient.post<ApiEnvelope<LoanDetail>>(`/loans/${loanId}/return`);
    return unwrapResponse(response.data);
  },
  async returnByBarcode(barcode: string): Promise<LoanDetail> {
    const response = await apiClient.post<ApiEnvelope<LoanDetail>>('/loans/return-by-barcode', { barcode });
    return unwrapResponse(response.data);
  },
  async renewLoan(loanId: string): Promise<LoanDetail> {
    const response = await apiClient.post<ApiEnvelope<LoanDetail>>(`/loans/${loanId}/renew`);
    return unwrapResponse(response.data);
  },
  async markLost(loanId: string, payload: { notes?: string; bookValue?: number }): Promise<LoanDetail> {
    const response = await apiClient.post<ApiEnvelope<LoanDetail>>(`/loans/${loanId}/lost`, payload);
    return unwrapResponse(response.data);
  },
  async listLoans(params: LoanListParams): Promise<PaginatedResult<LoanListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<LoanListItem>>>('/loans', { params });
    return unwrapResponse(response.data);
  },
  async getLoan(loanId: string): Promise<LoanDetail> {
    const response = await apiClient.get<ApiEnvelope<LoanDetail>>(`/loans/${loanId}`);
    return unwrapResponse(response.data);
  },
};
