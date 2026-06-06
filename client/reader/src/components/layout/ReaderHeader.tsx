import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { notificationApi } from '../../services/notification.api';
import { formatDateTime } from '../../utils/format';
import { Brand } from './Brand';
import { NavMenu } from './NavMenu';
import { NotificationBell } from './NotificationBell';
import { UserMenu } from './UserMenu';

export function ReaderHeader() {
  const { initialized, isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    enabled: initialized && isAuthenticated,
    queryKey: ['notifications', 'header'],
    queryFn: () => notificationApi.listNotifications({ page: 1, limit: 8 }),
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationApi.markRead(notificationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notificationItems =
    notificationsQuery.data?.items.map((item) => ({
      id: item._id,
      title: item.title,
      body: item.body,
      createdAt: formatDateTime(item.sentAt),
      read: Boolean(item.readAt),
    })) ?? [];

  const handleNotificationClick = (notificationId: string) => {
    const notification = notificationsQuery.data?.items.find((item) => item._id === notificationId);
    markReadMutation.mutate(notificationId);

    if (notification?.link) {
      navigate(notification.link);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 shadow-[0_1px_3px_rgba(28,25,23,0.05)] backdrop-blur">
      <div className="mx-auto flex min-h-[76px] w-full max-w-[1480px] items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Brand />
        <NavMenu />

        <div className="ml-auto flex items-center gap-3">
          {!initialized ? (
            <div className="h-11 w-[180px] animate-pulse rounded-xl bg-slate-100" aria-label="Đang tải phiên" />
          ) : isAuthenticated && user ? (
            <>
              <NotificationBell
                items={notificationItems}
                unreadCount={notificationsQuery.data?.unreadTotal ?? 0}
                onItemClick={handleNotificationClick}
                onMarkAllRead={() => markAllReadMutation.mutate()}
              />
              <UserMenu user={user} onLogout={() => void logout()} />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NavLink
                to="/login"
                className="inline-flex h-10 items-center px-3 text-sm font-bold text-stone-600 transition-colors hover:text-brand-600"
              >
                Đăng nhập
              </NavLink>
              <NavLink
                to="/register"
                className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-700"
              >
                Đăng ký
              </NavLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
