import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';

type Size = 'sm' | 'md' | 'lg';
type Variant = 'ghost' | 'outline' | 'solid';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
  variant?: Variant;
  label: string;
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
};

const VARIANTS: Record<Variant, string> = {
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  outline: 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
  solid: 'bg-brand-600 text-white hover:bg-brand-700',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = 'md', variant = 'ghost', label, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
