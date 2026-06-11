import {
  CheckCircleOutlined,
  EllipsisOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SearchOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Empty, Modal, Tooltip } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { useMemo, useState } from 'react';

import { AdminSelect } from '../../components/AdminSurface';
import { fineApi } from '../../services/fine.api';
import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import type { FineListItem } from '../../types/models';
import { FineStatus } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatCurrency, formatDate, formatDateTime } from '../../utils/format';

type FineStatusFilter = FineStatus | 'all';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  amount?: number;
  tone: 'rose' | 'emerald' | 'amber' | 'indigo';
}

interface FineGroup {
  memberId: string;
  member: FineListItem['member'];
  fines: FineListItem[];
  totalAmount: number;
  unpaidAmount: number;
  unpaidCount: number;
  paidCount: number;
  waivedCount: number;
  latestCreatedAt: string;
}

const statToneClassMap: Record<StatCardProps['tone'], string> = {
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
};

const fineStatusClassMap: Record<FineStatus, string> = {
  [FineStatus.Unpaid]: 'bg-rose-50 text-rose-600',
  [FineStatus.Paid]: 'bg-emerald-50 text-emerald-600',
  [FineStatus.Waived]: 'bg-amber-50 text-amber-600',
};

function formatNumber(value?: number): string {
  if (value === undefined) {
    return '...';
  }

  return new Intl.NumberFormat('vi-VN').format(value);
}

function getLoanCode(fine: FineListItem): string {
  return `LOAN-${fine.createdAt.slice(0, 4)}-${fine.loanId.slice(-5).toUpperCase()}`;
}

function StatCard({ icon, label, count, amount, tone }: StatCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-5">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl ring-8 ${statToneClassMap[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
          <p className="m-0 mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(count)}</p>
          {amount !== undefined ? <p className="m-0 mt-2 text-sm font-extrabold text-slate-700">{formatCurrency(amount)}</p> : null}
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: FineStatus }) {
  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${fineStatusClassMap[status]}`}>{getStatusLabel(status)}</span>;
}

function buildFineGroups(fines: FineListItem[]): FineGroup[] {
  const groups = new Map<string, FineGroup>();

  fines.forEach((fine) => {
    const current = groups.get(fine.member._id) ?? {
      memberId: fine.member._id,
      member: fine.member,
      fines: [],
      totalAmount: 0,
      unpaidAmount: 0,
      unpaidCount: 0,
      paidCount: 0,
      waivedCount: 0,
      latestCreatedAt: fine.createdAt,
    };

    current.fines.push(fine);
    current.totalAmount += fine.amount;

    if (fine.status === FineStatus.Unpaid) {
      current.unpaidAmount += fine.amount;
      current.unpaidCount += 1;
    } else if (fine.status === FineStatus.Paid) {
      current.paidCount += 1;
    } else {
      current.waivedCount += 1;
    }

    if (new Date(fine.createdAt).getTime() > new Date(current.latestCreatedAt).getTime()) {
      current.latestCreatedAt = fine.createdAt;
    }

    groups.set(fine.member._id, current);
  });

  return Array.from(groups.values()).sort((a, b) => b.unpaidAmount - a.unpaidAmount || b.totalAmount - a.totalAmount);
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

export default function FineManagerPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [selectedMemberLabel, setSelectedMemberLabel] = useState<string | undefined>();
  const [status, setStatus] = useState<FineStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveFine, setWaiveFine] = useState<FineListItem | null>(null);
  const [selectedFineGroup, setSelectedFineGroup] = useState<FineGroup | null>(null);

  const finesQuery = useQuery({
    queryKey: ['fines', selectedMemberId, status, page, limit],
    queryFn: () =>
      fineApi.listFines({
        memberId: selectedMemberId,
        status: status === 'all' ? undefined : status,
        page,
        limit,
      }),
  });

  const unpaidCountQuery = useQuery({
    queryKey: ['fines', 'metrics', selectedMemberId, FineStatus.Unpaid],
    queryFn: () => fineApi.listFines({ memberId: selectedMemberId, status: FineStatus.Unpaid, page: 1, limit: 1 }),
  });

  const paidCountQuery = useQuery({
    queryKey: ['fines', 'metrics', selectedMemberId, FineStatus.Paid],
    queryFn: () => fineApi.listFines({ memberId: selectedMemberId, status: FineStatus.Paid, page: 1, limit: 1 }),
  });

  const waivedCountQuery = useQuery({
    queryKey: ['fines', 'metrics', selectedMemberId, FineStatus.Waived],
    queryFn: () => fineApi.listFines({ memberId: selectedMemberId, status: FineStatus.Waived, page: 1, limit: 1 }),
  });

  const searchMemberMutation = useMutation({
    mutationFn: async (keyword: string) => {
      if (!keyword) {
        return null;
      }

      const params = keyword.toUpperCase().startsWith('MEM-') ? { memberCardNo: keyword, limit: 1, page: 1 } : { q: keyword, limit: 1, page: 1 };
      const response = await memberApi.listMembers(params);
      return response.items[0] ?? null;
    },
    onSuccess: (member) => {
      setPage(1);
      setSelectedMemberId(member?._id);
      setSelectedMemberLabel(member ? `${member.fullName} - ${member.memberCardNo}` : undefined);

      notify(
        member
          ? {
              level: 'info',
              message: 'Đã áp dụng bộ lọc độc giả',
              description: `${member.fullName} đang là bộ lọc khoản phạt.`,
            }
          : {
              level: 'warning',
              message: 'Không tìm thấy độc giả',
              description: 'Danh sách đang hiển thị toàn bộ khoản phạt.',
            },
      );
    },
  });

  const payMutation = useMutation({
    mutationFn: (fineIds: string[]) => fineApi.payFines(fineIds),
    onSuccess: (result) => {
      notify({ level: 'success', message: 'Đã ghi nhận thanh toán', description: `${result.updatedCount} khoản phạt đã được thanh toán.` });
      void queryClient.invalidateQueries({ queryKey: ['fines'] });
    },
  });

  const waiveMutation = useMutation({
    mutationFn: async () => {
      if (!waiveFine) {
        throw new Error('Chưa chọn khoản phạt để miễn giảm.');
      }

      return fineApi.waiveFine(waiveFine._id, waiveReason);
    },
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã miễn giảm khoản phạt' });
      setWaiveFine(null);
      setWaiveReason('');
      void queryClient.invalidateQueries({ queryKey: ['fines'] });
    },
  });

  const pagination = finesQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const items = finesQuery.data?.items ?? [];
  const startItem = pagination && pagination.totalItems > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.totalItems) : 0;
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);
  const summary = finesQuery.data?.summary;
  const fineGroups = useMemo(() => buildFineGroups(items), [items]);

  const resetFilters = () => {
    setSearch('');
    setSelectedMemberId(undefined);
    setSelectedMemberLabel(undefined);
    setStatus('all');
    setPage(1);
  };

  return (
    <div className="space-y-7">
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={<ExclamationCircleOutlined />} label="Chưa thanh toán" count={unpaidCountQuery.data?.pagination.totalItems} amount={summary?.unpaidTotal} tone="rose" />
        <StatCard icon={<CheckCircleOutlined />} label="Đã thanh toán" count={paidCountQuery.data?.pagination.totalItems} amount={summary?.paidTotal} tone="emerald" />
        <StatCard icon={<SafetyOutlined />} label="Đã miễn giảm" count={waivedCountQuery.data?.pagination.totalItems} amount={summary?.waivedTotal} tone="amber" />
        <StatCard
          icon={<WalletOutlined />}
          label="Tổng tiền phạt"
          count={(unpaidCountQuery.data?.pagination.totalItems ?? 0) + (paidCountQuery.data?.pagination.totalItems ?? 0) + (waivedCountQuery.data?.pagination.totalItems ?? 0)}
          amount={(summary?.unpaidTotal ?? 0) + (summary?.paidTotal ?? 0) + (summary?.waivedTotal ?? 0)}
          tone="indigo"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_220px_auto] xl:items-end">
          <label className="block">
            <span className="sr-only">Tìm theo độc giả hoặc mã thẻ</span>
            <span className="relative block">
              <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    searchMemberMutation.mutate(search.trim());
                  }
                }}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                placeholder="Tìm theo độc giả, mã thẻ..."
                type="search"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500">Trạng thái</span>
            <AdminSelect
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as FineStatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-full"
              className="h-11"
            >
              <option value="all">Tất cả</option>
              {Object.values(FineStatus).map((value) => (
                <option value={value} key={value}>
                  {getStatusLabel(value)}
                </option>
              ))}
            </AdminSelect>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => searchMemberMutation.mutate(search.trim())}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <SearchOutlined />
              Tìm
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <ReloadOutlined />
              Đặt lại
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm font-semibold text-slate-500">Bộ lọc nhanh:</span>
          {Object.values(FineStatus).map((value) => (
            <button
              type="button"
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition ${
                status === value ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200'
              }`}
              key={value}
            >
              <span className={`h-2 w-2 rounded-full ${value === FineStatus.Unpaid ? 'bg-rose-500' : value === FineStatus.Paid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {getStatusLabel(value)}
            </button>
          ))}
          {selectedMemberLabel ? <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">{selectedMemberLabel}</span> : null}
        </div>
      </section>

      {finesQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải danh sách khoản phạt" description={(finesQuery.error as Error).message} />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-600">
                <th className="whitespace-nowrap px-5 py-5">Độc giả</th>
                <th className="whitespace-nowrap px-5 py-5">Mã thẻ</th>
                <th className="whitespace-nowrap px-5 py-5 text-center">Chưa thanh toán</th>
                <th className="whitespace-nowrap px-5 py-5 text-right">Tổng phạt chưa thanh toán</th>
                <th className="whitespace-nowrap px-5 py-5 text-center">Đã thanh toán</th>
                <th className="whitespace-nowrap px-5 py-5 text-center">Miễn giảm</th>
                <th className="whitespace-nowrap px-5 py-5">Phát sinh gần nhất</th>
                <th className="whitespace-nowrap px-5 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finesQuery.isLoading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td className="px-5 py-5" key={cellIndex}>
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : fineGroups.length ? (
                fineGroups.map((group) => (
                  <tr className="text-sm font-semibold text-slate-700 transition hover:bg-slate-50" key={group.memberId}>
                    <td className="px-5 py-4">
                      <p className="m-0 max-w-[280px] truncate whitespace-nowrap font-extrabold text-slate-900">{group.member.fullName}</p>
                      <p className="m-0 mt-1 max-w-[280px] truncate whitespace-nowrap text-xs text-slate-500">{group.member.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-extrabold text-slate-800">{group.member.memberCardNo}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-center font-extrabold text-rose-600">{formatNumber(group.unpaidCount)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-extrabold text-rose-600">{formatCurrency(group.unpaidAmount)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-center font-extrabold text-emerald-600">{formatNumber(group.paidCount)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-center font-extrabold text-amber-600">{formatNumber(group.waivedCount)}</td>
                    <td className="px-5 py-4">
                      <p className="m-0 whitespace-nowrap font-semibold text-slate-900">{formatDate(group.latestCreatedAt)}</p>
                      <p className="m-0 mt-1 whitespace-nowrap text-xs text-slate-500">{group.fines.length} khoản chi tiết</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                          type="button"
                          onClick={() => setSelectedFineGroup(group)}
                        >
                          Xem chi tiết
                        </button>
                        {group.unpaidCount > 0 ? (
                          <button
                            className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-600"
                            type="button"
                            disabled={payMutation.isPending}
                            onClick={() => payMutation.mutate(group.fines.filter((fine) => fine.status === FineStatus.Unpaid).map((fine) => fine._id))}
                          >
                            Ghi nhận thanh toán
                          </button>
                        ) : (
                          <span className="grid h-9 min-w-[150px] place-items-center text-slate-400">-</span>
                        )}
                        <Tooltip title="Tác vụ khác">
                          <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600" type="button">
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

        {!finesQuery.isLoading && !items.length ? (
          <div className="px-6 py-16">
            <Empty description="Không có khoản phạt phù hợp với bộ lọc hiện tại." />
          </div>
        ) : null}

        {pagination ? (
          <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="m-0 text-sm font-semibold text-slate-500">
              Hiển thị {formatNumber(startItem)} đến {formatNumber(endItem)} trong tổng số {formatNumber(pagination.totalItems)} khoản phạt
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <AdminSelect
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                wrapperClassName="w-32"
              >
                {[10, 20, 50, 100].map((pageSize) => (
                  <option value={pageSize} key={pageSize}>
                    {pageSize} / trang
                  </option>
                ))}
              </AdminSelect>
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">
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
                    onClick={() => setPage(pageItem)}
                    className={`grid h-11 min-w-11 place-items-center rounded-xl px-3 text-sm font-semibold transition ${
                      pageItem === page ? 'bg-white !text-[#1677ff] shadow-[0_16px_36px_rgba(22,119,255,0.14)] ring-1 ring-blue-50' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                    key={pageItem}
                  >
                    {pageItem}
                  </button>
                ),
              )}
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">
                ›
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        title={selectedFineGroup ? `Chi tiết tiền phạt - ${selectedFineGroup.member.fullName}` : 'Chi tiết tiền phạt'}
        open={Boolean(selectedFineGroup)}
        onCancel={() => setSelectedFineGroup(null)}
        footer={null}
        width={980}
      >
        {selectedFineGroup ? (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.08em] text-slate-400">Mã thẻ</p>
                <p className="m-0 mt-1 font-extrabold text-slate-900">{selectedFineGroup.member.memberCardNo}</p>
              </div>
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.08em] text-slate-400">Khoản chưa thanh toán</p>
                <p className="m-0 mt-1 font-extrabold text-rose-600">{selectedFineGroup.unpaidCount} khoản</p>
              </div>
              <div>
                <p className="m-0 text-xs font-black uppercase tracking-[0.08em] text-slate-400">Tổng cần thu</p>
                <p className="m-0 mt-1 font-extrabold text-rose-600">{formatCurrency(selectedFineGroup.unpaidAmount)}</p>
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-[860px] w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-600">
                    <th className="px-4 py-3">Ngày phát sinh</th>
                    <th className="px-4 py-3">Sách</th>
                    <th className="px-4 py-3">Phiếu mượn</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedFineGroup.fines.map((fine) => (
                    <tr key={fine._id}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                        <p className="m-0">{formatDate(fine.overdueDate)}</p>
                        <p className="m-0 mt-1 text-xs text-slate-500">{formatDateTime(fine.createdAt)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="m-0 max-w-[240px] truncate font-extrabold text-slate-900">{fine.book.title}</p>
                        <p className="m-0 mt-1 max-w-[240px] truncate text-xs text-slate-500">{fine.note ?? 'Khoản phạt phát sinh'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-extrabold text-indigo-700">{getLoanCode(fine)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-extrabold text-rose-600">{formatCurrency(fine.amount)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusPill status={fine.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {fine.status === FineStatus.Unpaid ? (
                          <button
                            className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-amber-200 hover:text-amber-600"
                            type="button"
                            onClick={() => setWaiveFine(fine)}
                          >
                            Miễn giảm
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="Miễn giảm khoản phạt"
        open={Boolean(waiveFine)}
        confirmLoading={waiveMutation.isPending}
        onCancel={() => setWaiveFine(null)}
        onOk={() => waiveMutation.mutate()}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <div className="space-y-3">
          <p className="m-0 text-sm text-slate-500">Nhập lý do rõ ràng trước khi miễn giảm khoản phạt này.</p>
          <TextArea rows={4} value={waiveReason} onChange={(event) => setWaiveReason(event.target.value)} />
          {waiveMutation.isError ? <Alert type="error" showIcon message={extractErrorMessage(waiveMutation.error, 'Không thể miễn giảm khoản phạt')} /> : null}
        </div>
      </Modal>
    </div>
  );
}
