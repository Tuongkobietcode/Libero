import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  FilterOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  RetweetOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { AdminSelect, primaryActionButtonClass } from '../../components/AdminSurface';
import { loanApi } from '../../services/loan.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { LoanStatus, type LoanListItem } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatCurrency, formatDate, formatDateTime } from '../../utils/format';

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: LoanStatus.Active, label: 'Đang mượn' },
  { value: LoanStatus.Overdue, label: 'Quá hạn' },
  { value: LoanStatus.Returned, label: 'Đã trả' },
  { value: LoanStatus.Lost, label: 'Mất sách' },
] as const;

const statusTone: Record<LoanStatus, string> = {
  [LoanStatus.Active]: 'bg-emerald-50 text-emerald-600',
  [LoanStatus.Overdue]: 'bg-rose-50 text-rose-600',
  [LoanStatus.Returned]: 'bg-cyan-50 text-cyan-600',
  [LoanStatus.Lost]: 'bg-orange-50 text-orange-600',
};

function buildLoanCode(loan: LoanListItem, index: number): string {
  const year = dayjs(loan.checkoutDate).format('YYYY');
  const suffix = loan._id.slice(-5).toUpperCase();
  return `LOAN-${year}-${suffix || String(index + 1).padStart(5, '0')}`;
}

function daysUntilLabel(value: string): { text: string; tone: string } {
  const diff = dayjs(value).startOf('day').diff(dayjs().startOf('day'), 'day');

  if (diff < 0) {
    return { text: `Quá hạn ${Math.abs(diff)} ngày`, tone: 'text-red-600' };
  }

  if (diff === 0) {
    return { text: 'Đến hạn hôm nay', tone: 'text-orange-600' };
  }

  return { text: `${diff} ngày nữa`, tone: 'text-blue-600' };
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose';
}) {
  const toneClasses = {
    indigo: {
      icon: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
      accent: 'text-indigo-600',
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
      accent: 'text-emerald-600',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-600 ring-amber-100',
      accent: 'text-amber-600',
    },
    rose: {
      icon: 'bg-rose-50 text-rose-600 ring-rose-100',
      accent: 'text-rose-600',
    },
  }[tone];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-5">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl ring-8 ${toneClasses.icon}`}>{icon}</span>
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
          <p className="m-0 mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{value}</p>
          <p className="m-0 mt-2 text-xs font-semibold text-slate-500">
            <span className={toneClasses.accent}>{hint}</span>
          </p>
        </div>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: LoanStatus }) {
  return (
    <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${statusTone[status]}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

export default function CheckoutPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<LoanStatus | ''>('');
  const [keyword, setKeyword] = useState('');

  const loansQuery = useQuery({
    queryKey: ['loans', 'manager', page, status],
    queryFn: () => loanApi.listLoans({ page, limit: 10, status: status || undefined }),
  });
  const activeQuery = useQuery({
    queryKey: ['loans', 'count', LoanStatus.Active],
    queryFn: () => loanApi.listLoans({ page: 1, limit: 1, status: LoanStatus.Active }),
  });
  const overdueQuery = useQuery({
    queryKey: ['loans', 'count', LoanStatus.Overdue],
    queryFn: () => loanApi.listLoans({ page: 1, limit: 1, status: LoanStatus.Overdue }),
  });
  const returnedQuery = useQuery({
    queryKey: ['loans', 'count', LoanStatus.Returned],
    queryFn: () => loanApi.listLoans({ page: 1, limit: 100, status: LoanStatus.Returned }),
  });
  const lostQuery = useQuery({
    queryKey: ['loans', 'count', LoanStatus.Lost],
    queryFn: () => loanApi.listLoans({ page: 1, limit: 1, status: LoanStatus.Lost }),
  });

  const invalidateLoans = async () => {
    await queryClient.invalidateQueries({ queryKey: ['loans'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const renewMutation = useMutation({
    mutationFn: (loanId: string) => loanApi.renewLoan(loanId),
    onSuccess: async (loan) => {
      notify({ level: 'success', message: 'Đã gia hạn khoản mượn', description: `${loan.book.title} có hạn trả mới ${formatDate(loan.dueDate)}.` });
      await invalidateLoans();
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể gia hạn', description: extractErrorMessage(error) });
    },
  });

  const returnMutation = useMutation({
    mutationFn: (loanId: string) => loanApi.returnByLoanId(loanId),
    onSuccess: async (loan) => {
      notify({ level: 'success', message: 'Đã ghi nhận trả sách', description: `${loan.book.title} đã được trả.` });
      await invalidateLoans();
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể trả sách', description: extractErrorMessage(error) });
    },
  });

  const lostMutation = useMutation({
    mutationFn: (loanId: string) => loanApi.markLost(loanId, { notes: 'Đánh dấu mất sách từ màn quản lý khoản mượn.' }),
    onSuccess: async (loan) => {
      notify({ level: 'warning', message: 'Đã đánh dấu mất sách', description: `${loan.book.title} đã chuyển sang trạng thái mất.` });
      await invalidateLoans();
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể đánh dấu mất sách', description: extractErrorMessage(error) });
    },
  });

  const loans = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    const items = loansQuery.data?.items ?? [];

    if (!normalized) {
      return items;
    }

    return items.filter((loan) =>
      [
        loan.member.fullName,
        loan.member.memberCardNo,
        loan.book.title,
        loan.copy.barcode,
        loan.book.isbn,
      ].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [keyword, loansQuery.data?.items]);

  const returnedToday = (returnedQuery.data?.items ?? []).filter((loan) =>
    loan.returnDate ? dayjs(loan.returnDate).isSame(dayjs(), 'day') : false,
  ).length;
  const totalPages = loansQuery.data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex flex-wrap gap-3">
          <Link
          className={primaryActionButtonClass}
          to="/circulation/checkout/new"
        >
          <PlusOutlined />
          Tạo phiếu mượn
          </Link>
        </div>
      </div>

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={<BookOutlined />} label="Đang mượn" value={activeQuery.data?.pagination.totalItems ?? 0} hint="Khoản mượn ACTIVE" tone="emerald" />
        <StatCard icon={<ClockCircleOutlined />} label="Quá hạn" value={overdueQuery.data?.pagination.totalItems ?? 0} hint="Cần xử lý sớm" tone="rose" />
        <StatCard icon={<CheckCircleOutlined />} label="Đã trả hôm nay" value={returnedToday} hint="Từ phiếu đã trả" tone="indigo" />
        <StatCard icon={<WarningOutlined />} label="Mất sách" value={lostQuery.data?.pagination.totalItems ?? 0} hint="Khoản mượn LOST" tone="amber" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr_auto]">
          <label className="relative">
            <span className="sr-only">Tìm kiếm khoản mượn</span>
            <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none transition placeholder:text-slate-400 focus:border-[#4f46e5] focus:ring-4 focus:ring-indigo-100"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Tìm kiếm..."
              value={keyword}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold text-slate-500">Trạng thái</span>
            <AdminSelect
              wrapperClassName="w-full"
              className="h-11"
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as LoanStatus | '');
              }}
              value={status}
            >
              {statusOptions.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold text-slate-500">Khoảng thời gian</span>
            <button className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" type="button">
              30 ngày qua
              <CalendarOutlined />
            </button>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold text-slate-500">Loại độc giả</span>
            <button className="flex h-12 items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700" type="button">
              Tất cả
            </button>
          </label>

          <div className="flex items-end gap-3">
            <button className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" type="button">
              <FilterOutlined />
              Bộ lọc khác
            </button>
            <button
              className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                setKeyword('');
                setStatus('');
                setPage(1);
              }}
              type="button"
            >
              <ReloadOutlined />
              Đặt lại
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-medium text-slate-600">Bộ lọc đang chọn:</span>
          <span className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-700">30 ngày qua</span>
          <span className="rounded-full bg-slate-100 px-4 py-2 font-bold text-slate-700">{status ? getStatusLabel(status) : 'Tất cả trạng thái'}</span>
          <button className="font-semibold text-blue-600" onClick={() => setStatus('')} type="button">
            Xóa tất cả
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1480px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs font-extrabold text-slate-600">
                <th className="whitespace-nowrap px-5 py-4">Mã phiếu</th>
                <th className="whitespace-nowrap px-5 py-4">Độc giả</th>
                <th className="whitespace-nowrap px-5 py-4">Sách</th>
                <th className="whitespace-nowrap px-5 py-4">Barcode</th>
                <th className="whitespace-nowrap px-5 py-4">Ngày mượn</th>
                <th className="whitespace-nowrap px-5 py-4">Hạn trả</th>
                <th className="whitespace-nowrap px-5 py-4">Trạng thái</th>
                <th className="whitespace-nowrap px-5 py-4 text-right">Tiền phạt hiện tại</th>
                <th className="whitespace-nowrap px-5 py-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loansQuery.isLoading ? (
                <tr>
                  <td className="px-5 py-10 text-center font-semibold text-slate-500" colSpan={9}>
                    Đang tải khoản mượn...
                  </td>
                </tr>
              ) : loans.length ? (
                loans.map((loan, index) => {
                  const due = daysUntilLabel(loan.dueDate);
                  const canMutate = loan.status === LoanStatus.Active || loan.status === LoanStatus.Overdue;

                  return (
                    <tr className={loan.status === LoanStatus.Overdue ? 'bg-red-50/30' : 'bg-white'} key={loan._id}>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-900">{buildLoanCode(loan, index)}</td>
                      <td className="px-5 py-4">
                        <p className="m-0 max-w-[260px] truncate whitespace-nowrap font-bold text-slate-900">{loan.member.fullName}</p>
                        <p className="m-0 mt-1 max-w-[260px] truncate whitespace-nowrap text-xs font-semibold text-slate-500">{loan.member.memberCardNo}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="m-0 max-w-[340px] truncate whitespace-nowrap font-bold text-slate-900">{loan.book.title}</p>
                        <p className="m-0 mt-1 max-w-[340px] truncate whitespace-nowrap text-xs font-semibold text-slate-500">{loan.book.authors.map((author) => author.name).join(', ') || loan.book.isbn}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">{loan.copy.barcode}</td>
                      <td className="px-5 py-4">
                        <p className="m-0 whitespace-nowrap font-bold text-slate-900">{formatDate(loan.checkoutDate)}</p>
                        <p className="m-0 mt-1 whitespace-nowrap text-xs font-semibold text-slate-500">{formatDateTime(loan.checkoutDate).slice(11)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="m-0 whitespace-nowrap font-bold text-slate-900">{formatDate(loan.dueDate)}</p>
                        {loan.status === LoanStatus.Active || loan.status === LoanStatus.Overdue ? <p className={`m-0 mt-1 max-w-[220px] truncate whitespace-nowrap text-xs font-bold ${due.tone}`}>{due.text}</p> : null}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusPill status={loan.status} />
                      </td>
                      <td className={`whitespace-nowrap px-5 py-4 text-right font-extrabold ${loan.unpaidFineTotal > 0 ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(loan.unpaidFineTotal, '0 đ')}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex justify-center gap-2">
                          <ActionButton icon={<EyeOutlined />} label="Xem chi tiết" />
                          <ActionButton disabled={!canMutate || renewMutation.isPending} icon={<RetweetOutlined />} label="Gia hạn" onClick={() => renewMutation.mutate(loan._id)} />
                          <ActionButton disabled={!canMutate || returnMutation.isPending} icon={<ReloadOutlined />} label="Trả sách" onClick={() => returnMutation.mutate(loan._id)} />
                          <ActionButton disabled={!canMutate || lostMutation.isPending} icon={<WarningOutlined />} label="Báo mất" onClick={() => lostMutation.mutate(loan._id)} />
                          <ActionButton icon={<MoreOutlined />} label="Thêm" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-5 py-10 text-center font-semibold text-slate-500" colSpan={9}>
                    Không có khoản mượn phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 text-sm font-medium text-slate-600">
          <span>
            Hiển thị {loans.length ? (page - 1) * 10 + 1 : 0} đến {(page - 1) * 10 + loans.length} trong tổng số {loansQuery.data?.pagination.totalItems ?? 0} khoản mượn
          </span>
          <div className="flex items-center gap-2">
            <button className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">
              Trước
            </button>
            <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-white px-3 font-semibold !text-[#1677ff] shadow-[0_16px_36px_rgba(22,119,255,0.14)] ring-1 ring-blue-50">{page}</span>
            <span>/ {totalPages}</span>
            <button className="h-9 rounded-lg border border-slate-200 px-3 font-semibold disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} type="button">
              Sau
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
