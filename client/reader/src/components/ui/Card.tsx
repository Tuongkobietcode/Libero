import { type HTMLAttributes, forwardRef } from 'react';

import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
  interactive?: boolean;
}

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, padding = 'md', interactive, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl bg-white border border-slate-200/70 shadow-sm',
        interactive && 'transition-shadow hover:shadow-md',
        PADDINGS[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
