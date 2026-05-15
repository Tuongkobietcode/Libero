import {
  CheckCircleOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserSwitchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Empty, Popconfirm, Tooltip } from 'antd';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { AdminSelect, primaryActionButtonClass } from '../../components/AdminSurface';
import { useDebounce } from '../../hooks/useDebounce';
import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import type { MemberView } from '../../types/models';
import { MemberStatus, Role } from '../../types/models';
import { getRoleLabel, getStatusLabel } from '../../utils/display';
import { formatDate, formatDateTime } from '../../utils/format';

type RoleFilter = Role | 'all';
type StatusFilter = MemberStatus | 'all';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value?: number;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose';
  helper: string;
}

const statToneClassMap: Record<StatCardProps['tone'], string> = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
};

const memberStatusClassMap: Record<MemberStatus, string> = {
  [MemberStatus.Active]: 'bg-emerald-50 text-emerald-600',
  [MemberStatus.Pending]: 'bg-amber-50 text-amber-600',
  [MemberStatus.Suspended]: 'bg-rose-50 text-rose-600',
  [MemberStatus.Expired]: 'bg-orange-50 text-orange-600',
};

function formatNumber(value?: number): string {
  if (value === undefined) {
    return '...';
  }

  return new Intl.NumberFormat('vi-VN').format(value);
}

function getInitials(member: MemberView): string {
  return member.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function StatCard({ icon, label, value, tone, helper }: StatCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-5">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl ring-8 ${statToneClassMap[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
          <p className="m-0 mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(value)}</p>
          <p className="m-0 mt-2 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: MemberStatus }) {
  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${memberStatusClassMap[status]}`}>{getStatusLabel(status)}</span>;
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sortedPages = [...pages].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];

  sortedPages.forEach((pageNumber, index) => {
    const previous = sortedPages[index - 1];

    if (previous && pageNumber - previous > 1) {
      result.push('ellipsis');
    }

    result.push(pageNumber);
  });

  return result;
}

export default function MemberListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const q = searchParams.get('q') ?? '';
  const role = (searchParams.get('role') ?? 'all') as RoleFilter;
  const status = (searchParams.get('status') ?? 'all') as StatusFilter;
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '10');
  const debouncedQuery = useDebounce(q, 300);

  const membersQuery = useQuery({
    queryKey: ['members', debouncedQuery, role, status, page, limit],
    queryFn: () =>
      memberApi.listMembers({
        ...(debouncedQuery ? { q: debouncedQuery } : {}),
        ...(role !== 'all' ? { role } : {}),
        ...(status !== 'all' ? { status } : {}),
        page,
        limit,
      }),
  });

  const totalMembersQuery = useQuery({
    queryKey: ['members', 'metrics', 'total'],
    queryFn: () => memberApi.listMembers({ page: 1, limit: 1 }),
  });

  const activeMembersQuery = useQuery({
    queryKey: ['members', 'metrics', MemberStatus.Active],
    queryFn: () => memberApi.listMembers({ status: MemberStatus.Active, page: 1, limit: 1 }),
  });

  const expiredMembersQuery = useQuery({
    queryKey: ['members', 'metrics', MemberStatus.Expired],
    queryFn: () => memberApi.listMembers({ status: MemberStatus.Expired, page: 1, limit: 1 }),
  });

  const suspendedMembersQuery = useQuery({
    queryKey: ['members', 'metrics', MemberStatus.Suspended],
    queryFn: () => memberApi.listMembers({ status: MemberStatus.Suspended, page: 1, limit: 1 }),
  });

  const suspendMutation = useMutation({
    mutationFn: (memberId: string) => memberApi.suspendMember(memberId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã tạm khóa độc giả' });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (memberId: string) => memberApi.activateMember(memberId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã kích hoạt độc giả' });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const pagination = membersQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const items = membersQuery.data?.items ?? [];
  const startItem = pagination && pagination.totalItems > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.totalItems) : 0;
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);

    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    if (key !== 'page') {
      next.set('page', '1');
    }

    setSearchParams(next);
  };

  const updatePagination = (nextPage: number, nextLimit = limit) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    next.set('limit', String(nextLimit));
    setSearchParams(next);
  };

  const resetFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('role');
    next.delete('status');
    next.set('page', '1');
    next.set('limit', String(limit));
    setSearchParams(next);
  };

  const openMemberDetail = (memberId: string) => {
    navigate(`/members/${memberId}`);
  };

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate('/members/new')}
          className={primaryActionButtonClass}
        >
          <PlusOutlined />
          Thêm độc giả
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={<TeamOutlined />} label="Tổng độc giả" value={totalMembersQuery.data?.pagination.totalItems} tone="indigo" helper="Từ API thành viên" />
        <StatCard icon={<CheckCircleOutlined />} label="Đang hoạt động" value={activeMembersQuery.data?.pagination.totalItems} tone="emerald" helper="Có thể mượn và đặt chỗ" />
        <StatCard icon={<WarningOutlined />} label="Hết hạn" value={expiredMembersQuery.data?.pagination.totalItems} tone="amber" helper="Cần gia hạn thẻ" />
        <StatCard icon={<WarningOutlined />} label="Tạm khóa" value={suspendedMembersQuery.data?.pagination.totalItems} tone="rose" helper="Không được lưu thông" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_220px_220px_auto] xl:items-end">
          <label className="block">
            <span className="sr-only">Tìm độc giả</span>
            <span className="relative block">
              <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              <input
                value={q}
                onChange={(event) => updateParam('q', event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                placeholder="Tìm theo tên, email, mã thẻ..."
                type="search"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500">Vai trò</span>
            <AdminSelect
              value={role}
              onChange={(event) => updateParam('role', event.target.value)}
              wrapperClassName="w-full"
              className="h-11"
            >
              <option value="all">Tất cả vai trò</option>
              {Object.values(Role).map((value) => (
                <option value={value} key={value}>
                  {getRoleLabel(value)}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500">Trạng thái</span>
            <AdminSelect
              value={status}
              onChange={(event) => updateParam('status', event.target.value)}
              wrapperClassName="w-full"
              className="h-11"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.values(MemberStatus).map((value) => (
                <option value={value} key={value}>
                  {getStatusLabel(value)}
                </option>
              ))}
            </AdminSelect>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <ReloadOutlined />
            Đặt lại
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm font-semibold text-slate-500">Bộ lọc nhanh:</span>
          {Object.values(MemberStatus).map((value) => (
            <button
              type="button"
              onClick={() => updateParam('status', value)}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
                status === value ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
              }`}
              key={value}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  value === MemberStatus.Active ? 'bg-emerald-500' : value === MemberStatus.Pending ? 'bg-amber-500' : value === MemberStatus.Suspended ? 'bg-rose-500' : 'bg-orange-500'
                }`}
              />
              {getStatusLabel(value)}
            </button>
          ))}
        </div>
      </section>

      {membersQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải danh sách độc giả" description={(membersQuery.error as Error).message} />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-600">
                <th className="px-5 py-5">Độc giả</th>
                <th className="px-5 py-5">Mã thẻ</th>
                <th className="px-5 py-5">Vai trò</th>
                <th className="px-5 py-5">Liên hệ</th>
                <th className="px-5 py-5">Trạng thái</th>
                <th className="px-5 py-5">Thẻ thư viện</th>
                <th className="px-5 py-5">Ngày tham gia</th>
                <th className="px-5 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membersQuery.isLoading ? (
                Array.from({ length: limit }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td className="px-5 py-5" key={cellIndex}>
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length ? (
                items.map((member) => (
                  <tr
                    className="cursor-pointer text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-within:bg-slate-50"
                    key={member._id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openMemberDetail(member._id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openMemberDetail(member._id);
                      }
                    }}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-extrabold text-indigo-700 ring-1 ring-indigo-100">
                          {getInitials(member) || 'DG'}
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 truncate font-extrabold text-slate-900">{member.fullName}</p>
                          <p className="m-0 mt-1 truncate text-xs text-slate-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-slate-800">{member.memberCardNo}</td>
                    <td className="px-5 py-4">{getRoleLabel(member.role)}</td>
                    <td className="px-5 py-4">
                      <p className="m-0">{member.phone ?? '-'}</p>
                      <p className="m-0 mt-1 text-xs text-slate-500">{member.studentId ?? member.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusPill status={member.status} />
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${member.isBlocked ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {member.isBlocked ? 'Đang khóa' : 'Đang hiệu lực'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="m-0">{formatDate(member.joinDate)}</p>
                      <p className="m-0 mt-1 text-xs text-slate-500">Hết hạn: {formatDate(member.expiryDate)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Tooltip title="Xem chi tiết">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openMemberDetail(member._id);
                            }}
                            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                            aria-label={`Xem ${member.fullName}`}
                          >
                            <EyeOutlined />
                          </button>
                        </Tooltip>
                        <Tooltip title="Chỉnh sửa">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/members/${member._id}/edit`);
                            }}
                            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                            aria-label={`Chỉnh sửa ${member.fullName}`}
                          >
                            <EditOutlined />
                          </button>
                        </Tooltip>
                        {member.status === MemberStatus.Suspended ? (
                          <Popconfirm
                            title="Kích hoạt lại độc giả này?"
                            okText="Đồng ý"
                            cancelText="Hủy"
                            onConfirm={(event) => {
                              event?.stopPropagation();
                              activateMutation.mutate(member._id);
                            }}
                          >
                            <button
                              type="button"
                              onClick={(event) => event.stopPropagation()}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-emerald-200 hover:text-emerald-600"
                              aria-label={`Kích hoạt ${member.fullName}`}
                            >
                              <UserSwitchOutlined />
                            </button>
                          </Popconfirm>
                        ) : (
                          <Popconfirm
                            title="Tạm khóa độc giả này?"
                            okText="Đồng ý"
                            cancelText="Hủy"
                            onConfirm={(event) => {
                              event?.stopPropagation();
                              suspendMutation.mutate(member._id);
                            }}
                          >
                            <button
                              type="button"
                              onClick={(event) => event.stopPropagation()}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-rose-200 hover:text-rose-600"
                              aria-label={`Tạm khóa ${member.fullName}`}
                            >
                              <PauseCircleOutlined />
                            </button>
                          </Popconfirm>
                        )}
                        <Tooltip title="Tác vụ khác">
                          <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                            aria-label="Tác vụ khác"
                          >
                            <EllipsisOutlined />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>

        {!membersQuery.isLoading && !items.length ? (
          <div className="px-6 py-16">
            <Empty description="Không có độc giả phù hợp với bộ lọc hiện tại." />
          </div>
        ) : null}

        {pagination ? (
          <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="m-0 text-sm font-semibold text-slate-500">
              Hiển thị {formatNumber(startItem)} đến {formatNumber(endItem)} trong tổng số {formatNumber(pagination.totalItems)} độc giả
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <AdminSelect
                value={limit}
                onChange={(event) => updatePagination(1, Number(event.target.value))}
                wrapperClassName="w-32"
              >
                {[10, 20, 50].map((pageSize) => (
                  <option value={pageSize} key={pageSize}>
                    {pageSize} / trang
                  </option>
                ))}
              </AdminSelect>
              <button type="button" disabled={page <= 1} onClick={() => updatePagination(page - 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">
                ‹
              </button>
              {visiblePages.map((pageItem, index) =>
                pageItem === 'ellipsis' ? (
                  <span className="grid h-11 w-8 place-items-center text-sm font-semibold text-slate-500" key={`ellipsis-${index}`}>
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => updatePagination(pageItem)}
                    className={`grid h-11 min-w-11 place-items-center rounded-xl px-3 text-sm font-semibold transition ${
                      pageItem === page ? 'bg-white !text-[#1677ff] shadow-[0_16px_36px_rgba(22,119,255,0.14)] ring-1 ring-blue-50' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                    key={pageItem}
                  >
                    {pageItem}
                  </button>
                ),
              )}
              <button type="button" disabled={page >= totalPages} onClick={() => updatePagination(page + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">
                ›
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <p className="m-0 text-sm font-semibold text-slate-500">
        Thông tin thẻ thư viện đang được quản lý trong hồ sơ độc giả qua mã thẻ, trạng thái tài khoản, ngày tham gia và ngày hết hạn.
      </p>
    </div>
  );
}
