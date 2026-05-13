import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
}

export function ErrorState({ title = 'Đã có lỗi xảy ra', message, onRetry, action }: ErrorStateProps) {
  return (
    <div className="grid min-h-[200px] place-items-center rounded-xl border border-red-100 bg-red-50/40 px-6 py-8 text-center">
      <div className="flex flex-col items-center gap-3">
        <AlertTriangle className="h-10 w-10 text-red-500" aria-hidden="true" />
        <h2 className="m-0 text-base font-extrabold text-red-700">{title}</h2>
        <p className="m-0 max-w-md text-sm text-slate-600">{message}</p>
        {onRetry ? (
          <button
            className="mt-1 inline-flex min-h-9 items-center rounded-lg border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-100"
            type="button"
            onClick={onRetry}
          >
            Thử lại
          </button>
        ) : null}
        {action}
      </div>
    </div>
  );
}

export default ErrorState;
