import { useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

import { IconButton } from '../ui/IconButton';
import { useClickOutside } from '../../hooks/useClickOutside';
import { cn } from '../../utils/cn';

interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
  read?: boolean;
}

interface NotificationBellProps {
  items?: NotificationItem[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onItemClick?: (id: string) => void;
}

export function NotificationBell({ items = [], unreadCount: unreadCountProp, onMarkAllRead, onItemClick }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const unreadCount = unreadCountProp ?? items.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative">
      <IconButton
        label="Thông báo"
        variant="outline"
        size="md"
        onClick={() => setOpen((v) => !v)}
        className="relative"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        ) : null}
      </IconButton>

      {open ? (
        <div
          className={cn(
            'absolute right-0 mt-2 w-80 origin-top-right rounded-2xl border border-slate-200 bg-white shadow-lg',
            'z-50',
          )}
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-900">Thông báo</p>
            {unreadCount > 0 && onMarkAllRead ? (
              <button
                type="button"
                onClick={() => {
                  onMarkAllRead();
                }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Đánh dấu đã đọc
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-500">
                <BellOff className="h-8 w-8 text-slate-300" aria-hidden />
                <p className="text-sm">Chưa có thông báo mới</p>
              </div>
            ) : (
              <ul className="py-1">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onItemClick?.(n.id);
                        setOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors',
                        !n.read && 'bg-brand-50/40',
                      )}
                    >
                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">{n.title}</p>
                      {n.body ? (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{n.body}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-slate-400">{n.createdAt}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
