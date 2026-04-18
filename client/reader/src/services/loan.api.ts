import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { LoanDetail, LoanListItem, LoanStatus } from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface MyLoanParams {
  status?: LoanStatus;
  page?: number;
  limit?: number;
}

export const loanApi = {
  async listMyLoans(params: MyLoanParams): Promise<PaginatedResult<LoanListItem>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<LoanListItem>>>('/loans/me', { params });
    return unwrapResponse(response.data);
  },
  async renewLoan(loanId: string): Promise<LoanDetail> {
    const response = await apiClient.post<ApiEnvelope<LoanDetail>>(`/loans/${loanId}/renew`);
    return unwrapResponse(response.data);
  },
};
