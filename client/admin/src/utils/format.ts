import type { AxiosError } from 'axios';
import dayjs from 'dayjs';

interface ApiErrorPayload {
  error?: {
    message?: string;
    code?: string;
    details?: {
      issues?: {
        fieldErrors?: Record<string, string[]>;
        formErrors?: string[];
      };
    };
  };
}

function formatValidationMessage(apiError: ApiErrorPayload['error']): string | null {
  if (!apiError || !['COMMON_VALIDATION', 'ERR_COMMON_VALIDATION'].includes(apiError.code ?? '')) {
    return null;
  }

  const issues = apiError.details?.issues;
  const lines: string[] = [];

  for (const [field, messages] of Object.entries(issues?.fieldErrors ?? {})) {
    if (messages.length > 0) {
      lines.push(`- ${field}: ${messages.join(', ')}`);
    }
  }

  for (const message of issues?.formErrors ?? []) {
    lines.push(`- ${message}`);
  }

  if (lines.length === 0) {
    return null;
  }

  return `${apiError.message ?? 'Request validation failed'}:\n${lines.join('\n')}`;
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

export function formatList(values: Array<{ name: string }> | undefined | null, fallback: string = '-'): string {
  if (!values?.length) {
    return fallback;
  }

  return values.map((item) => item.name).join(', ');
}

export function extractErrorMessage(error: unknown, fallback: string = 'Yêu cầu thất bại'): string {
  const maybeAxiosError = error as AxiosError<ApiErrorPayload>;
  const apiError = maybeAxiosError.response?.data?.error;
  return formatValidationMessage(apiError) ?? apiError?.message ?? maybeAxiosError.message ?? fallback;
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
