import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { useAuthStore } from '../store/auth.store';
import { useNotificationsStore } from '../store/notifications.store';
import type { ApiEnvelope } from '../types/api';
import { Role, type AuthUser, type LoginResponse } from '../types/models';
import { clearSessionHint, setSessionHint } from '../utils/sessionHint';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
const ACCESS_TOKEN_REFRESH_SKEW_MS = 30_000;
const AUTH_REQUIRED_ERROR_CODE = 'LIBERO_AUTH_REQUIRED';

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface JwtPayload {
  exp?: number;
}

interface AuthRequiredError extends Error {
  code: typeof AUTH_REQUIRED_ERROR_CODE;
}

const CLIENT_APP_HEADERS = { 'X-Client-App': 'admin' } as const;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { ...CLIENT_APP_HEADERS },
});

export const authClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  headers: { ...CLIENT_APP_HEADERS },
});

function redirectToLogin(): void {
  const loginPath = `${import.meta.env.BASE_URL}login`;

  if (window.location.pathname !== loginPath) {
    window.location.assign(loginPath);
  }
}

function mergeUser(baseUser: AuthUser | null, partial: AuthUser): AuthUser {
  return {
    ...(baseUser ?? {}),
    ...partial,
  };
}

function isBackofficeUser(user: AuthUser): boolean {
  return user.role === Role.Admin || user.role === Role.Librarian;
}

let refreshPromise: Promise<LoginResponse | null> | null = null;
let refreshRequestPromise: Promise<LoginResponse> | null = null;
let sessionUnavailable = false;

function createAuthRequiredError(message = 'Authentication is required'): AuthRequiredError {
  const error = new Error(message) as AuthRequiredError;
  error.name = 'AuthRequiredError';
  error.code = AUTH_REQUIRED_ERROR_CODE;
  return error;
}

export function isAuthRequiredError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: string }).code === AUTH_REQUIRED_ERROR_CODE,
  );
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split('.')[1];

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(window.atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(token: string): boolean {
  const exp = decodeJwtPayload(token)?.exp;

  if (!exp) {
    return false;
  }

  return exp * 1000 <= Date.now() + ACCESS_TOKEN_REFRESH_SKEW_MS;
}

function invalidateClientSession(): void {
  sessionUnavailable = true;
  clearSessionHint();
  useAuthStore.getState().logout();
}

export function requestTokenRefresh(): Promise<LoginResponse> {
  if (!refreshRequestPromise) {
    refreshRequestPromise = authClient
      .post<ApiEnvelope<LoginResponse>>('/auth/refresh')
      .then((response) => unwrapResponse(response.data))
      .finally(() => {
        refreshRequestPromise = null;
      });
  }

  return refreshRequestPromise;
}

async function refreshSession(): Promise<LoginResponse | null> {
  if (!refreshPromise) {
    refreshPromise = requestTokenRefresh()
      .then((payload) => {
        if (!isBackofficeUser(payload.user)) {
          throw new Error('Invalid admin session');
        }

        const authState = useAuthStore.getState();
        sessionUnavailable = false;
        setSessionHint();
        authState.setToken(payload.accessToken);
        authState.setUser(mergeUser(authState.user, payload.user));
        return payload;
      })
      .catch(() => {
        invalidateClientSession();
        useNotificationsStore.getState().push({
          level: 'warning',
          message: 'Phiên đăng nhập đã hết hạn',
          description: 'Vui lòng đăng nhập lại để tiếp tục.',
        });
        redirectToLogin();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use(async (config) => {
  const token = useAuthStore.getState().accessToken;

  if (!token) {
    return Promise.reject(createAuthRequiredError('Missing access token'));
  }

  if (!shouldRefreshAccessToken(token)) {
    sessionUnavailable = false;
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  if (sessionUnavailable) {
    return Promise.reject(createAuthRequiredError('Session is no longer available'));
  }

  const refreshed = await refreshSession();

  if (!refreshed?.accessToken) {
    return Promise.reject(createAuthRequiredError('Session has expired'));
  }

  config.headers.Authorization = `Bearer ${refreshed.accessToken}`;
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
