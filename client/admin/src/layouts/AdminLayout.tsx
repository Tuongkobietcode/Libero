import {
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  BellOutlined,
  BookOutlined,
  BuildOutlined,
  CalendarOutlined,
  DashboardOutlined,
  DollarOutlined,
  DownOutlined,
  FileTextOutlined,
  LockOutlined,
  MenuOutlined,
  MoonOutlined,
  PieChartOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';
import { notificationApi } from '../services/notification.api';
import { getRoleLabel } from '../utils/display';
import { formatDateTime } from '../utils/format';

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  locked?: boolean;
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
      { key: '/catalog', label: 'Sách', icon: <BookOutlined />, locked: true },
      { key: '/categories', label: 'Danh mục', icon: <AppstoreOutlined />, locked: true },
      { key: '/authors', label: 'Tác giả', icon: <UserOutlined />, locked: true },
      { key: '/publishers', label: 'Nhà xuất bản', icon: <BankOutlined />, locked: true },
      { key: '/members', label: 'Độc giả', icon: <TeamOutlined />, locked: true },
      { key: '/library-cards', label: 'Thẻ thư viện', icon: <AuditOutlined />, locked: true },
      { key: '/circulation/checkout', label: 'Khoản mượn', icon: <FileTextOutlined /> },
      { key: '/book-holds', label: 'Đặt giữ', icon: <BookOutlined />, locked: true },
      { key: '/reservations', label: 'Đặt chỗ', icon: <CalendarOutlined />, locked: true },
      { key: '/fines', label: 'Phạt', icon: <DollarOutlined />, locked: true },
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
      { key: '/users', label: 'Người dùng', icon: <UserOutlined />, locked: true },
      { key: '/settings/roles', label: 'Vai trò & phân quyền', icon: <LockOutlined />, locked: true },
      { key: '/settings/loan-policies', label: 'Chính sách mượn', icon: <SettingOutlined />, locked: true },
      { key: '/settings/fine-rates', label: 'Mức phạt', icon: <DollarOutlined />, locked: true },
      { key: '/system-logs', label: 'Nhật ký hệ thống', icon: <BuildOutlined />, locked: true },
    ],
  },
];

const hiddenMenuKeys = new Set(['/authors', '/publishers', '/library-cards', '/settings/roles', '/users', '/system-logs']);
const unlockedRoutes = new Set([
  '/catalog',
  '/categories',
  '/members',
  '/book-holds',
  '/reservations',
  '/fines',
  '/settings/loan-policies',
  '/settings/fine-rates',
]);

const visibleMenuGroups = menuGroups
  .map((group) => ({
    ...group,
    items: group.items.filter((item) => !hiddenMenuKeys.has(item.key)),
  }))
  .filter((group) => group.items.length > 0);

function isActive(pathname: string, itemKey: string): boolean {
  if (itemKey === '/') {
    return pathname === '/';
  }

  return pathname === itemKey || pathname.startsWith(`${itemKey}/`);
}

function getInitial(name?: string): string {
  return name?.trim().charAt(0).toUpperCase() || 'A';
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

  if (pathname.startsWith('/catalog/import')) {
    return { title: 'Nhập CSV', subtitle: 'Tải hàng loạt đầu sách và kiểm tra lỗi theo từng dòng' };
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

  return { title: 'Tổng quan' };
}

function SidebarItem({ item, pathname }: { item: MenuItem; pathname: string }) {
  const active = isActive(pathname, item.key);
  const locked = item.locked && !unlockedRoutes.has(item.key);
  const className = [
    'flex min-h-11 w-full items-center gap-3 rounded-xl px-4 text-left text-[15px] font-semibold transition',
    active ? 'bg-[#eef0ff] text-[#3157ff]' : 'text-[#33415c] hover:bg-slate-50 hover:text-[#3157ff]',
    locked ? 'cursor-not-allowed opacity-55 hover:bg-transparent hover:text-[#33415c]' : '',
  ].join(' ');

  if (locked) {
    return (
      <button className={className} type="button" disabled title="Tạm khóa trong giai đoạn xem tổng quan">
        <span className="grid h-5 w-5 place-items-center text-[18px]">{item.icon}</span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <LockOutlined className="text-xs text-slate-400" />
      </button>
    );
  }

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

export default function AdminLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const heading = getPageHeading(location.pathname);
  useRealtime();

  return (
    <div className="min-h-dvh bg-[#f7f9fc] font-sans text-[#071026]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] flex-col border-r border-slate-200 bg-white xl:flex">
        <div className="flex h-[78px] items-center justify-between px-7">
          <NavLink to="/" className="flex items-center gap-3" aria-label="LIBERO Admin">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#3157ff] text-xl font-extrabold text-white shadow-[0_14px_30px_rgba(49,87,255,0.22)]">
              L
            </span>
            <span className="text-[1.45rem] font-extrabold tracking-tight">LIBERO</span>
          </NavLink>
          <button className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-50" type="button" aria-label="Thu gọn menu">
            <MenuOutlined />
          </button>
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

        <div className="border-t border-slate-200 p-5">
          <div className="flex items-center gap-3 rounded-2xl p-2">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-200 text-sm font-extrabold text-slate-700">
              {getInitial(user?.fullName ?? user?.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 truncate text-sm font-extrabold text-slate-900">{user?.fullName ?? user?.email ?? 'Admin'}</p>
              <p className="m-0 truncate text-xs text-slate-500">{getRoleLabel(user?.role)}</p>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 transition hover:bg-red-50 hover:text-red-600" type="button" onClick={() => void logout()} aria-label="Đăng xuất">
              <DownOutlined className="text-xs" />
            </button>
          </div>
        </div>
      </aside>

      <div className="xl:pl-[280px]">
        <header className="sticky top-0 z-20 flex h-[78px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur md:px-8">
          <div>
            <h1 className="m-0 text-2xl font-extrabold tracking-tight">{heading.title}</h1>
            {heading.subtitle ? <p className="m-0 mt-1 text-sm font-medium text-slate-500">{heading.subtitle}</p> : null}
          </div>

          <div className="flex items-center gap-4">
            <label className="relative hidden md:block">
              <span className="sr-only">Tìm kiếm nhanh</span>
              <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="h-10 w-[320px] rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-20 text-sm font-semibold text-slate-600 outline-none transition placeholder:text-slate-400 focus:border-[#3157ff] focus:bg-white focus:ring-4 focus:ring-blue-100"
                placeholder="Tìm kiếm nhanh..."
                type="search"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Ctrl + K</span>
            </label>

            <AdminNotificationBell />
            <button className="grid h-11 w-11 place-items-center rounded-xl text-slate-900 transition hover:bg-slate-50" type="button" aria-label="Giao diện sáng tối">
              <MoonOutlined className="text-xl" />
            </button>
          </div>
        </header>

        <main className="px-5 py-7 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
