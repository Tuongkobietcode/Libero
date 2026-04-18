import type { ApiEnvelope } from '../types/api';
import type { LoginPayload, LoginResponse } from '../types/models';
import { authClient, unwrapResponse } from './api';

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await authClient.post<ApiEnvelope<LoginResponse>>('/auth/login', payload);
    return unwrapResponse(response.data);
  },
  async refresh(): Promise<LoginResponse> {
    const response = await authClient.post<ApiEnvelope<LoginResponse>>('/auth/refresh');
    return unwrapResponse(response.data);
  },
  async logout(): Promise<void> {
    await authClient.post('/auth/logout');
  },
};
