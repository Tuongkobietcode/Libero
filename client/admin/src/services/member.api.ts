import type { ApiEnvelope, PaginatedResult } from '../types/api';
import type { LoanPolicyView, MemberStatus, MemberView, Role } from '../types/models';
import { apiClient, authClient, unwrapResponse } from './api';

export interface MemberListParams {
  q?: string;
  role?: Role;
  status?: MemberStatus;
  memberCardNo?: string;
  page?: number;
  limit?: number;
}

export interface MemberFormPayload {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  studentId?: string;
  role: Role;
  joinDate?: string;
  expiryDate?: string;
}

export const memberApi = {
  async getMe(accessToken?: string): Promise<MemberView> {
    const response = await (accessToken ? authClient : apiClient).get<ApiEnvelope<MemberView>>('/members/me', {
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
    });
    return unwrapResponse(response.data);
  },
  async listMembers(params: MemberListParams): Promise<PaginatedResult<MemberView>> {
    const response = await apiClient.get<ApiEnvelope<PaginatedResult<MemberView>>>('/members', { params });
    return unwrapResponse(response.data);
  },
  async getMember(memberId: string): Promise<MemberView> {
    const response = await apiClient.get<ApiEnvelope<MemberView>>(`/members/${memberId}`);
    return unwrapResponse(response.data);
  },
  async createMember(payload: Required<Pick<MemberFormPayload, 'password'>> & Omit<MemberFormPayload, 'password'>): Promise<MemberView> {
    const response = await apiClient.post<ApiEnvelope<MemberView>>('/members', payload);
    return unwrapResponse(response.data);
  },
  async updateMember(memberId: string, payload: MemberFormPayload): Promise<MemberView> {
    const response = await apiClient.patch<ApiEnvelope<MemberView>>(`/members/${memberId}`, payload);
    return unwrapResponse(response.data);
  },
  async suspendMember(memberId: string, reason?: string): Promise<MemberView> {
    const response = await apiClient.patch<ApiEnvelope<MemberView>>(`/members/${memberId}/suspend`, { reason });
    return unwrapResponse(response.data);
  },
  async activateMember(memberId: string): Promise<MemberView> {
    const response = await apiClient.patch<ApiEnvelope<MemberView>>(`/members/${memberId}/activate`);
    return unwrapResponse(response.data);
  },
  async listLoanPolicies(): Promise<LoanPolicyView[]> {
    const response = await apiClient.get<ApiEnvelope<LoanPolicyView[]>>('/config/loan-policies');
    return unwrapResponse(response.data);
  },
  async updateLoanPolicy(
    role: string,
    payload: Omit<LoanPolicyView, 'role'>,
  ): Promise<LoanPolicyView> {
    const response = await apiClient.patch<ApiEnvelope<LoanPolicyView>>(`/config/loan-policies/${role}`, payload);
    return unwrapResponse(response.data);
  },
};
