import { NavLink } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  DollarSign,
  Home,
  Search,
  User,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '../../utils/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const READER_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Trang chủ', icon: Home, end: true },
  { to: '/search', label: 'Tìm kiếm', icon: Search },
  { to: '/my-loans', label: 'Khoản mượn', icon: BookOpen },
  { to: '/my-reservations', label: 'Đặt chỗ', icon: Calendar },
  { to: '/my-fines', label: 'Tiền phạt', icon: DollarSign },
  { to: '/profile', label: 'Hồ sơ', icon: User },
];

interface NavMenuProps {
  className?: string;
}

export function NavMenu({ className }: NavMenuProps) {
  return (
    <nav
      className={cn('hidden flex-1 items-center gap-1 overflow-x-auto md:flex', className)}
      aria-label="Điều hướng bạn đọc"
    >
      {READER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'inline-flex items-center gap-2 rounded-lg px-3 h-11 text-[15px] font-semibold transition-colors',
                isActive
                  ? 'text-brand-600 bg-brand-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
