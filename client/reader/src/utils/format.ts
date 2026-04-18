import type { AxiosError } from 'axios';
import dayjs from 'dayjs';

interface ApiErrorPayload {
  error?: {
    message?: string;
    code?: string;
  };
}

export function formatDate(value?: string | null, fallback: string = '-'): string {
  if (!value) {
    return fallback;
  }

  return dayjs(value).format('DD/MM/YYYY');
}

export function formatDateTime(value?: string | null, fallback: string = '-'): string {
  if (!value) {
    return fallback;
  }

  return dayjs(value).format('DD/MM/YYYY HH:mm');
}

export function formatCurrency(value?: number | null, fallback: string = '-'): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatList(values: Array<{ name: string }>, fallback: string = '-'): string {
  if (!values.length) {
    return fallback;
  }

  return values.map((item) => item.name).join(', ');
}

export function extractErrorMessage(error: unknown, fallback: string = 'Yeu cau that bai'): string {
  const maybeAxiosError = error as AxiosError<ApiErrorPayload>;
  return maybeAxiosError.response?.data?.error?.message ?? maybeAxiosError.message ?? fallback;
}

export function daysUntil(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const target = dayjs(value);
  if (!target.isValid()) {
    return null;
  }

  return target.startOf('day').diff(dayjs().startOf('day'), 'day');
}
