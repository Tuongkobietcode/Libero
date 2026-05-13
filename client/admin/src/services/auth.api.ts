import type { ApiEnvelope } from '../types/api';
import type { LoginPayload, LoginResponse } from '../types/models';
import { authClient, requestTokenRefresh, unwrapResponse } from './api';

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await authClient.post<ApiEnvelope<LoginResponse>>('/auth/login', payload);
    return unwrapResponse(response.data);
  },
  async refresh(): Promise<LoginResponse> {
    return requestTokenRefresh();
  },
  async logout(): Promise<void> {
    await authClient.post('/auth/logout');
  },
};
