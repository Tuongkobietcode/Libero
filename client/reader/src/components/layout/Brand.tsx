import { NavLink } from 'react-router-dom';

import liberoIcon from '../../assets/Icon/icon.svg';
import { cn } from '../../utils/cn';

interface BrandProps {
  className?: string;
  hideText?: boolean;
}

export function Brand({ className, hideText }: BrandProps) {
  return (
    <NavLink to="/" className={cn('flex shrink-0 items-center gap-2', className)} aria-label="LIBERO">
      <img src={liberoIcon} alt="" className="h-9 w-9 object-contain" />
      {hideText ? null : <span className="text-2xl font-extrabold leading-none text-brand-600">LIBERO</span>}
    </NavLink>
  );
}
