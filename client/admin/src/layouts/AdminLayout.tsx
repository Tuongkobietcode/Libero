import {
  AppstoreOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  DownOutlined,
  FileTextOutlined,
  LogoutOutlined,
  PieChartOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { notificationApi } from '../services/notification.api';
import { getRoleLabel } from '../utils/display';
import { formatDateTime } from '../utils/format';
import liberoIcon from '../assets/Icon/icon.svg';

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
}

interface MenuGroup {
  title?: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    items: [{ key: '/', label: 'Tổng quan', icon: <DashboardOutlined /> }],
  },
  {
    title: 'Quản lý',
    items: [
      { key: '/catalog', label: 'Sách', icon: <BookOutlined /> },
      { key: '/categories', label: 'Danh mục', icon: <AppstoreOutlined /> },
      { key: '/members', label: 'Độc giả', icon: <TeamOutlined /> },
      { key: '/circulation/checkout', label: 'Khoản mượn', icon: <FileTextOutlined /> },
      { key: '/book-holds', label: 'Đặt giữ', icon: <BookOutlined /> },
      { key: '/reservations', label: 'Đặt chỗ', icon: <CalendarOutlined /> },
      { key: '/fines', label: 'Phạt', icon: <DollarOutlined /> },
    ],
  },
  {
    title: 'Báo cáo',
    items: [
      { key: '/reports/loan-stats', label: 'Mượn trả', icon: <PieChartOutlined /> },
      { key: '/reports/overdue', label: 'Quá hạn', icon: <CalendarOutlined /> },
      { key: '/reports/popular-books', label: 'Sách phổ biến', icon: <BookOutlined /> },
      { key: '/reports/inventory', label: 'Kho sách', icon: <AppstoreOutlined /> },
      { key: '/reports/fine-stats', label: 'Tiền phạt', icon: <DollarOutlined /> },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { key: '/settings/loan-policies', label: 'Chính sách mượn', icon: <SettingOutlined /> },
      { key: '/settings/fine-rates', label: 'Mức phạt', icon: <DollarOutlined /> },
    ],
  },
];

const visibleMenuGroups = menuGroups;
function isActive(pathname: string, itemKey: string): boolean {
  if (itemKey === '/') {
    return pathname === '/';
  }

  return pathname === itemKey || pathname.startsWith(`${itemKey}/`);
}

function getInitial(name?: string): string {
  return name?.trim().charAt(0).toUpperCase() || 'A';
}

function AdminBrand() {
  return (
    <NavLink to="/" className="flex shrink-0 items-center gap-2" aria-label="LIBERO">
      <img src={liberoIcon} alt="" className="h-9 w-9 object-contain" />
      <span className="text-2xl font-extrabold leading-none text-brand-600">LIBERO</span>
    </NavLink>
  );
}

function getPageHeading(pathname: string): { title: string; subtitle?: string } {
  if (pathname.startsWith('/members/new')) {
    return { title: 'Thêm độc giả', subtitle: 'Tạo hồ sơ độc giả và thẻ thư viện trong cùng một luồng' };
  }

  if (pathname.startsWith('/members/') && pathname.endsWith('/edit')) {
    return { title: 'Chỉnh sửa độc giả', subtitle: 'Cập nhật hồ sơ, vai trò và hiệu lực thẻ thư viện' };
  }

  if (pathname.startsWith('/members/')) {
    return { title: 'Chi tiết độc giả', subtitle: 'Hồ sơ, thẻ thư viện, mượn sách, đặt chỗ và khoản phạt' };
  }

  if (pathname.startsWith('/members')) {
    return { title: 'Độc giả', subtitle: 'Quản lý hồ sơ độc giả và thông tin thẻ thư viện' };
  }

  if (pathname.startsWith('/book-holds')) {
    return { title: 'Đặt giữ', subtitle: 'Quản lý các bản sách đang được giữ tạm để độc giả đến nhận' };
  }

  if (pathname.startsWith('/reservations')) {
    return { title: 'Đặt chỗ', subtitle: 'Quản lý hàng đợi và tình trạng đặt chỗ của độc giả' };
  }

  if (pathname.startsWith('/fines')) {
    return { title: 'Phạt', subtitle: 'Quản lý khoản phạt chưa thanh toán, đã thanh toán và đã miễn giảm' };
  }

  if (pathname.startsWith('/catalog/new')) {
    return { title: 'Thêm sách', subtitle: 'Tạo đầu sách mới và bản sao ban đầu' };
  }

  if (pathname.startsWith('/catalog/') && pathname.endsWith('/edit')) {
    return { title: 'Chỉnh sửa sách', subtitle: 'Cập nhật thông tin biên mục của đầu sách' };
  }

  if (pathname.startsWith('/catalog/')) {
    return { title: 'Chi tiết sách', subtitle: 'Thông tin đầu sách, bản sao và hoạt động lưu thông' };
  }

  if (pathname.startsWith('/catalog')) {
    return { title: 'Sách', subtitle: 'Quản lý danh mục sách của thư viện' };
  }

  if (pathname.startsWith('/categories')) {
    return { title: 'Danh mục', subtitle: 'Quản lý nhóm phân loại sách và số lượng đầu sách liên quan' };
  }

  if (pathname.startsWith('/circulation/checkout/new')) {
    return { title: 'Tạo phiếu mượn', subtitle: 'Lập phiếu mượn mới cho độc giả' };
  }

  if (pathname.startsWith('/circulation/return')) {
    return { title: 'Trả sách', subtitle: 'Quét barcode để ghi nhận trả sách và tính phạt nếu có' };
  }

  if (pathname.startsWith('/circulation/checkout')) {
    return { title: 'Khoản mượn', subtitle: 'Quản lý tất cả khoản mượn trong thư viện' };
  }

  if (pathname.startsWith('/reports/loan-stats')) {
    return { title: 'Thống kê mượn trả', subtitle: 'Theo dõi biến động khoản mượn theo thời gian' };
  }

  if (pathname.startsWith('/reports/overdue')) {
    return { title: 'Danh sách quá hạn', subtitle: 'Các khoản mượn cần được xử lý ưu tiên' };
  }

  if (pathname.startsWith('/reports/popular-books')) {
    return { title: 'Sách mượn nhiều', subtitle: 'Xếp hạng đầu sách theo lượt mượn' };
  }

  if (pathname.startsWith('/reports/inventory')) {
    return { title: 'Tình trạng kho', subtitle: 'Số lượng bản sao theo trạng thái' };
  }

  if (pathname.startsWith('/reports/fine-stats')) {
    return { title: 'Thống kê tiền phạt', subtitle: 'Phân tích tiền phạt và công nợ độc giả' };
  }

  if (pathname.startsWith('/settings/loan-policies')) {
    return { title: 'Chính sách mượn', subtitle: 'Cấu hình giới hạn mượn và gia hạn theo vai trò' };
  }

  if (pathname.startsWith('/settings/fine-rates')) {
    return { title: 'Mức phạt', subtitle: 'Quản lý mức phạt quá hạn theo thời điểm hiệu lực' };
  }

  if (pathname.startsWith('/profile')) {
    return { title: 'Hồ sơ quản trị', subtitle: 'Thông tin tài khoản và quyền truy cập khu vực quản trị' };
  }

  return { title: 'Tổng quan' };
}
function SidebarItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const active = isActive(pathname, item.key);
  const className = [
    'flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-[15px] font-semibold transition',
    active ? 'bg-[#eef0ff] text-[#3157ff]' : 'text-[#33415c] hover:bg-slate-50 hover:text-[#3157ff]',
  ].join(' ');

  return (
    <NavLink className={className} to={item.key} end={item.key === '/'}>
      <span className="grid h-5 w-5 place-items-center text-[18px]">{item.icon}</span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
    </NavLink>
  );
}
function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'admin-header'],
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

  const items = notificationsQuery.data?.items ?? [];
  const unreadTotal = notificationsQuery.data?.unreadTotal ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative grid h-11 w-11 place-items-center rounded-xl text-slate-900 transition hover:bg-slate-50"
        type="button"
        aria-label="Thông báo"
        onClick={() => setOpen((value) => !value)}
      >
        <BellOutlined className="text-xl" />
        {unreadTotal > 0 ? (
          <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-extrabold text-white">
            {unreadTotal > 9 ? '9+' : unreadTotal}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="m-0 text-sm font-extrabold text-slate-900">Thông báo</p>
            {unreadTotal > 0 ? (
              <button
                type="button"
                className="text-xs font-extrabold text-[#3157ff] transition hover:text-blue-700"
                onClick={() => markAllReadMutation.mutate()}
              >
                Đánh dấu đã đọc
              </button>
            ) : null}
          </div>

          <div className="max-h-[420px] overflow-y-auto py-1">
            {items.length ? (
              items.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  className={`block w-full px-4 py-3 text-left transition hover:bg-blue-50 ${item.readAt ? 'bg-white' : 'bg-blue-50/60'}`}
                  onClick={() => {
                    markReadMutation.mutate(item._id);
                    setOpen(false);
                    if (item.link) {
                      navigate(item.link);
                    }
                  }}
                >
                  <span className="block truncate text-sm font-extrabold text-slate-900">{item.title}</span>
                  {item.body ? <span className="mt-1 block line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{item.body}</span> : null}
                  <span className="mt-2 block text-[11px] font-bold text-slate-400">{formatDateTime(item.sentAt)}</span>
                </button>
              ))
            ) : (
              <div className="grid place-items-center gap-2 px-4 py-10 text-center text-slate-500">
                <BellOutlined className="text-2xl text-slate-300" />
                <p className="m-0 text-sm font-semibold">Chưa có thông báo</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminUserMenu({
  user,
  onLogout,
}: {
  user: NonNullable<ReturnType<typeof useAuth>['user']>;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = user.fullName ?? user.email ?? 'Admin';
  const subtitle = getRoleLabel(user.role);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={[
          'flex min-h-11 items-center gap-3 rounded-xl border px-2 py-1.5 transition',
          open ? 'border-slate-200 bg-slate-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
        ].join(' ')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8efff] text-sm font-extrabold text-[#3157ff] ring-2 ring-white">
          {getInitial(name)}
        </span>
        <span className="hidden min-w-0 flex-col items-start sm:flex">
          <span className="max-w-[150px] truncate text-sm font-extrabold text-slate-900">{name}</span>
          <span className="max-w-[150px] truncate text-xs font-semibold text-slate-500">{subtitle}</span>
        </span>
        <DownOutlined className={`text-xs text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)]" role="menu">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="m-0 truncate text-sm font-extrabold text-slate-900">{name}</p>
            <p className="m-0 mt-1 truncate text-xs font-semibold text-slate-500">{user.email}</p>
          </div>
          <div className="py-1">
            <Link
              to="/profile"
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <UserOutlined className="text-base" />
              Hồ sơ của tôi
            </Link>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
            >
              <LogoutOutlined className="text-base" />
              Đăng xuất
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const heading = getPageHeading(location.pathname);
  useRealtime();

  return (
    <div className="min-h-dvh bg-[#f7f9fc] font-sans text-[#071026]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-slate-200 bg-white xl:flex">
        <div className="flex h-[78px] items-center justify-between px-7">
          <AdminBrand />
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-3" aria-label="Điều hướng quản trị">
          {visibleMenuGroups.map((group, groupIndex) => (
            <div className="mb-7" key={group.title ?? groupIndex}>
              {group.title ? <p className="mb-3 px-3 text-xs font-extrabold tracking-[0.12em] text-slate-400">{group.title}</p> : null}
              <div className="grid gap-1.5">
                {group.items.map((item) => (
                  <SidebarItem item={item} pathname={location.pathname} key={item.key} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="xl:pl-[280px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
          <div>
            <h1 className="m-0 text-2xl font-extrabold tracking-tight">{heading.title}</h1>
            {heading.subtitle ? <p className="m-0 mt-1 text-sm font-medium text-slate-500">{heading.subtitle}</p> : null}
          </div>

          <div className="flex items-center gap-4">
            <AdminNotificationBell />
            {user ? <AdminUserMenu user={user} onLogout={() => void logout()} /> : null}
          </div>
        </header>

        <main className="px-5 py-7 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
