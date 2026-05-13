import { useRef, useState } from 'react';
import { ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Avatar } from '../ui/Avatar';
import { useClickOutside } from '../../hooks/useClickOutside';
import { cn } from '../../utils/cn';
import { getRoleLabel } from '../../utils/display';
import type { AuthUser } from '../../types/models';

interface UserMenuProps {
  user: AuthUser;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const subtitle = user.memberCardNo ?? getRoleLabel(user.role);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 transition-colors',
          'hover:bg-slate-50 hover:border-slate-200',
          open && 'bg-slate-50 border-slate-200',
        )}
      >
        <Avatar name={user.fullName ?? 'Bạn đọc'} size="md" />
        <div className="hidden sm:flex flex-col items-start min-w-0">
          <span className="text-sm font-semibold text-slate-900 max-w-[160px] truncate">
            {user.fullName ?? 'Bạn đọc'}
          </span>
          <span className="text-xs text-slate-500 max-w-[160px] truncate">{subtitle}</span>
        </div>
        <ChevronDown
          className={cn('h-4 w-4 text-slate-400 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-lg z-50"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900 truncate">{user.fullName ?? 'Bạn đọc'}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              to="/profile"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <UserIcon className="h-4 w-4" aria-hidden />
              Hồ sơ của tôi
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
