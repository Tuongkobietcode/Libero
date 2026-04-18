import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../store/auth.store';
import type { ApiEnvelope } from '../types/api';
import type { AuthUser, LoginResponse } from '../types/models';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export const authClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

function mergeUser(baseUser: AuthUser | null, partial: AuthUser): AuthUser {
  return {
    ...(baseUser ?? {}),
    ...partial,
  };
}

function redirectToLogin(): void {
  const loginPath = `${import.meta.env.BASE_URL}login`;

  if (window.location.pathname !== loginPath) {
    window.location.assign(loginPath);
  }
}

let refreshPromise: Promise<LoginResponse | null> | null = null;

async function refreshSession(): Promise<LoginResponse | null> {
  if (!refreshPromise) {
    refreshPromise = authClient
      .post<ApiEnvelope<LoginResponse>>('/auth/refresh')
      .then((response) => {
        const payload = response.data.data;
        const authState = useAuthStore.getState();
        authState.setToken(payload.accessToken);
        authState.setUser(mergeUser(authState.user, payload.user));
        return payload;
      })
      .catch(() => {
        useAuthStore.getState().logout();
        redirectToLogin();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const responseStatus = error.response?.status;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestUrl = originalRequest?.url ?? '';

    if (
      responseStatus === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !requestUrl.includes('/auth/login') &&
      !requestUrl.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshed = await refreshSession();

      if (refreshed?.accessToken) {
        originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  },
);

export function unwrapResponse<T>(payload: ApiEnvelope<T>): T {
  return payload.data;
}
