import { cn } from '../../utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
} as const;

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Đang tải"
      className={cn(
        'inline-block animate-spin rounded-full border-slate-200 border-t-brand-600',
        SIZES[size],
        className,
      )}
    />
  );
}

export function FullScreenLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <Spinner size="lg" />
        <span className="text-sm">Đang tải...</span>
      </div>
    </div>
  );
}
