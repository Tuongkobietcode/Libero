import { type InputHTMLAttributes, type ReactNode, forwardRef, useId } from 'react';

import { cn } from '../../utils/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { id, label, error, className, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="flex items-start gap-2.5 cursor-pointer text-sm text-slate-600 leading-6">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className={cn(
            'mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-brand-600 cursor-pointer',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...rest}
        />
        <span>{label}</span>
      </label>
      {error ? <p className="text-xs text-red-600 ml-6" role="alert">{error}</p> : null}
    </div>
  );
});
