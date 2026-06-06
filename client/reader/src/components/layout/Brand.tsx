import { NavLink } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

import { cn } from '../../utils/cn';

interface BrandProps {
  className?: string;
  hideText?: boolean;
}

export function Brand({ className, hideText }: BrandProps) {
  return (
    <NavLink to="/" className={cn('flex shrink-0 items-center gap-3', className)} aria-label="LIBERO">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white shadow-[0_14px_30px_-18px_rgba(2,132,199,0.72)]">
        <BookOpen className="h-6 w-6" strokeWidth={2.25} aria-hidden />
      </span>
      {hideText ? null : <span className="font-display text-2xl font-black leading-none tracking-tight text-brand-600">LIBERO</span>}
    </NavLink>
  );
}
