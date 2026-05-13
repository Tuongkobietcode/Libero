import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';

import { cn } from '../../utils/cn';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { id, label, error, hint, leftIcon, rightSlot, className, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  const errorId = `${inputId}-error`;
  const invalid = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
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
          id={inputId}
          aria-invalid={invalid}
          aria-describedby={invalid ? errorId : undefined}
          className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-500"
          {...rest}
        />
        {rightSlot ? <span className="shrink-0">{rightSlot}</span> : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});
