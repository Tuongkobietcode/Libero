import { type InputHTMLAttributes, forwardRef, type ReactNode } from 'react';

import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, leftIcon, rightIcon, invalid, ...rest },
  ref,
) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 h-11 rounded-xl border bg-white px-3 transition-colors',
        invalid
          ? 'border-red-300 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100'
          : 'border-slate-200 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100',
        className,
      )}
    >
      {leftIcon ? <span className="text-slate-400 shrink-0">{leftIcon}</span> : null}
      <input
        ref={ref}
        className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-500"
        {...rest}
      />
      {rightIcon ? <span className="text-slate-400 shrink-0">{rightIcon}</span> : null}
    </div>
  );
});
