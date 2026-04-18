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

export function extractErrorMessage(error: unknown, fallback: string = 'Yêu cầu thất bại'): string {
  const maybeAxiosError = error as AxiosError<ApiErrorPayload>;
  return maybeAxiosError.response?.data?.error?.message ?? maybeAxiosError.message ?? fallback;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
