import { type HTMLAttributes } from 'react';

import { cn } from '../../utils/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
type Size = 'sm' | 'md';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  size?: Size;
}

const TONES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200',
};

const SIZES: Record<Size, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export function Badge({ className, tone = 'neutral', size = 'sm', children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
