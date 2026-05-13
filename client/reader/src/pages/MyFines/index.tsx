import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Filter,
  MoreVertical,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { fineApi } from '../../services/fine.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { FineStatus, type FineListItem } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatDate } from '../../utils/format';

const PAGE_SIZE = 10;

type FineFilter = 'all' | FineStatus;

interface FineView {
  _id: string;
  date: string;
  reason: string;
  bookTitle: string;
  amount: number;
  status: FineStatus;
  note: string;
}

function formatAmount(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function fineStatusTone(status: FineStatus): {
  amount: string;
  badge: string;
  icon: string;
  iconNode: LucideIcon;
} {
  if (status === FineStatus.Unpaid) {
    return {
      amount: 'text-red-600',
      badge: 'bg-red-50 text-red-600 border-red-100',
      icon: 'bg-red-50 text-red-600',
      iconNode: AlertCircle,
    };
  }

  if (status === FineStatus.Paid) {
    return {
      amount: 'text-emerald-600',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      icon: 'bg-emerald-50 text-emerald-600',
      iconNode: CheckCircle2,
    };
  }

  return {
    amount: 'text-[#2675d9]',
    badge: 'bg-blue-50 text-[#2675d9] border-blue-100',
    icon: 'bg-blue-50 text-[#2675d9]',
    iconNode: ShieldCheck,
  };
}

function mapFine(fine: FineListItem): FineView {
  const paidDate = fine.paidAt ? formatDate(fine.paidAt) : null;
  const reason = fine.status === FineStatus.Waived ? 'Được miễn giảm' : fine.note?.includes('mất') || fine.note?.includes('Mất') ? 'Mất sách' : 'Trả sách trễ hạn';

  return {
    _id: fine._id,
    date: formatDate(fine.overdueDate),
    reason,
    bookTitle: fine.book.title,
    amount: fine.amount,
    status: fine.status,
    note:
      fine.note ??
      (fine.status === FineStatus.Paid && paidDate
        ? `Đã thanh toán ngày ${paidDate}`
        : fine.status === FineStatus.Waived
          ? 'Miễn giảm theo quy định'
          : 'Chưa thanh toán'),
  };
}

function SummaryCard({
  icon: Icon,
  title,
  amount,
  count,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  amount: number;
  count: number;
  tone: 'red' | 'emerald' | 'blue';
}) {
  const classes =
    tone === 'red'
      ? {
          card: 'border-red-200',
          icon: 'bg-red-50 text-red-600',
          amount: 'text-red-600',
        }
      : tone === 'emerald'
        ? {
            card: 'border-slate-200',
            icon: 'bg-emerald-50 text-emerald-600',
            amount: 'text-emerald-600',
          }
        : {
            card: 'border-slate-200',
            icon: 'bg-blue-50 text-[#2675d9]',
            amount: 'text-[#2675d9]',
          };

  return (
    <article className={`flex min-h-[126px] items-center justify-between rounded-xl border bg-white px-6 py-5 shadow-[0_14px_32px_rgba(15,31,56,0.04)] ${classes.card}`}>
      <div className="flex items-center gap-5">
        <span className={`grid h-14 w-14 place-items-center rounded-full ${classes.icon}`}>
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className="m-0 text-sm font-extrabold text-slate-700">{title}</h2>
          <strong className={`mt-1 block text-[1.55rem] leading-tight ${classes.amount}`}>{formatAmount(amount)}</strong>
          <p className="m-0 mt-1 text-sm text-slate-500">{count} khoản</p>
        </div>
      </div>
      <ChevronRight className="h-6 w-6 text-slate-400" aria-hidden="true" />
    </article>
  );
}

function FineStatusIcon({ status }: { status: FineStatus }) {
  const tone = fineStatusTone(status);
  const Icon = tone.iconNode;

  return (
    <span className={`grid h-8 w-8 place-items-center rounded-full ${tone.icon}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function FineStatusPill({ status }: { status: FineStatus }) {
  const tone = fineStatusTone(status);

  return <span className={`inline-flex rounded-lg border px-3 py-1.5 text-xs font-extrabold ${tone.badge}`}>{getStatusLabel(status)}</span>;
}

function FineTableRow({ fine }: { fine: FineView }) {
  const tone = fineStatusTone(fine.status);

  return (
    <tr className="border-t border-slate-100 align-middle">
      <td className="px-3 py-4">
        <div className="flex items-center gap-4">
          <FineStatusIcon status={fine.status} />
          <span className="font-semibold text-slate-500">{fine.date}</span>
        </div>
      </td>
      <td className="px-3 py-4">
        <p className="m-0 font-bold text-slate-700">{fine.reason}</p>
        <p className="m-0 mt-1 text-sm text-slate-400">{fine.bookTitle}</p>
      </td>
      <td className={`px-3 py-4 font-extrabold ${tone.amount}`}>{formatAmount(fine.amount)}</td>
      <td className="px-3 py-4">
        <FineStatusPill status={fine.status} />
      </td>
      <td className="px-3 py-4 text-sm font-semibold text-slate-500">{fine.note}</td>
      <td className="px-3 py-4 text-right">
        <button className="grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50" type="button" aria-label={`Mở tùy chọn tiền phạt ${fine.reason}`}>
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export default function MyFinesPage() {
  const { user } = useAuth();
  const notify = useNotificationsStore((state) => state.push);
  const [statusFilter, setStatusFilter] = useState<FineFilter>('all');
  const [page, setPage] = useState(1);

  const finesQuery = useQuery({
    queryKey: ['reader-my-fines', statusFilter, page],
    queryFn: () =>
      fineApi.getMyFines({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: PAGE_SIZE,
      }),
  });

  useEffect(() => {
    if (finesQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(finesQuery.error, 'Không thể tải danh sách tiền phạt.'),
      });
    }
  }, [finesQuery.error, finesQuery.isError, notify]);

  const realFines = finesQuery.data?.items ?? [];
  const fineRows = useMemo(() => realFines.map(mapFine), [realFines]);

  const totals = useMemo(
    () => ({
      unpaidTotal: finesQuery.data?.summary.unpaidTotal ?? 0,
      paidTotal: finesQuery.data?.summary.paidTotal ?? 0,
      waivedTotal: finesQuery.data?.summary.waivedTotal ?? 0,
      unpaidCount: realFines.filter((fine) => fine.status === FineStatus.Unpaid).length,
      paidCount: realFines.filter((fine) => fine.status === FineStatus.Paid).length,
      waivedCount: realFines.filter((fine) => fine.status === FineStatus.Waived).length,
    }),
    [
      finesQuery.data?.summary.paidTotal,
      finesQuery.data?.summary.unpaidTotal,
      finesQuery.data?.summary.waivedTotal,
      realFines,
    ],
  );

  const pagination = finesQuery.data?.pagination;
  const showBlockedWarning = Boolean(user?.isBlocked);

  return (
    <div className="flex flex-col gap-6 py-9">
      <section>
        <h1 className="m-0 text-[2.35rem] font-extrabold leading-tight text-[#0f1f44]">Tiền phạt của tôi</h1>
      </section>

      {showBlockedWarning ? (
        <section className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-5 shadow-[0_12px_28px_rgba(239,68,68,0.08)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-red-600">
              <AlertCircle className="h-9 w-9" aria-hidden="true" />
            </span>
            <div>
              <h2 className="m-0 text-base font-extrabold text-red-600">Tài khoản của bạn đang bị khóa do chưa thanh toán tiền phạt.</h2>
              <p className="m-0 mt-2 text-sm font-semibold text-slate-500">Vui lòng thanh toán hết các khoản tiền phạt chưa thanh toán để mở khóa tài khoản và tiếp tục sử dụng dịch vụ.</p>
            </div>
          </div>
          <button className="min-h-11 shrink-0 rounded-lg bg-red-500 px-7 text-sm font-extrabold text-white transition hover:bg-red-600" type="button">
            Thanh toán ngay
          </button>
        </section>
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        <SummaryCard icon={AlertCircle} title="Chưa thanh toán" amount={totals.unpaidTotal} count={totals.unpaidCount} tone="red" />
        <SummaryCard icon={CheckCircle2} title="Đã thanh toán" amount={totals.paidTotal} count={totals.paidCount} tone="emerald" />
        <SummaryCard icon={ShieldCheck} title="Đã miễn giảm" amount={totals.waivedTotal} count={totals.waivedCount} tone="blue" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,31,56,0.04)]">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="m-0 text-lg font-extrabold text-[#0f1f44]">Danh sách tiền phạt</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block w-full sm:w-[190px]">
              <span className="sr-only">Lọc trạng thái tiền phạt</span>
              <select
                className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-10 pr-9 text-sm font-semibold text-slate-500 outline-none transition focus:border-[#2675d9] focus:ring-4 focus:ring-blue-100"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as FineFilter);
                  setPage(1);
                }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value={FineStatus.Unpaid}>Chưa thanh toán</option>
                <option value={FineStatus.Paid}>Đã thanh toán</option>
                <option value={FineStatus.Waived}>Đã miễn</option>
              </select>
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </label>
            <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:border-blue-200 hover:text-[#2675d9]" type="button">
              <Download className="h-4 w-4" aria-hidden="true" />
              Xuất Excel
            </button>
          </div>
        </div>

        {finesQuery.isLoading ? (
          <div className="grid min-h-[300px] place-items-center rounded-lg border border-slate-200 text-slate-500">Đang tải tiền phạt...</div>
        ) : fineRows.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[920px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-4 font-bold">Ngày phát sinh</th>
                    <th className="px-3 py-4 font-bold">Lý do</th>
                    <th className="px-3 py-4 font-bold">Số tiền</th>
                    <th className="px-3 py-4 font-bold">Trạng thái</th>
                    <th className="px-3 py-4 font-bold">Ghi chú</th>
                    <th className="px-3 py-4">
                      <span className="sr-only">Tùy chọn</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fineRows.map((fine) => (
                    <FineTableRow fine={fine} key={fine._id} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p className="m-0">
                Hiển thị {fineRows.length} của {pagination?.totalItems ?? fineRows.length} khoản
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
                </button>
                <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-[#2675d9] px-3 font-bold text-white">1</span>
                <button className="grid h-9 min-w-9 place-items-center rounded-lg px-3 font-bold text-slate-500" type="button" disabled={(pagination?.totalPages ?? 1) < 2}>
                  2
                </button>
                <button
                  className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= (pagination?.totalPages || 1)}
                  aria-label="Trang sau"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="grid min-h-[300px] place-items-center rounded-lg border border-slate-200 px-6 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden="true" />
              <h3 className="m-0 mt-4 text-lg font-extrabold text-slate-900">Không có bản ghi tiền phạt nào</h3>
              <p className="m-0 mt-2 text-sm text-slate-500">Khi phát sinh tiền phạt quá hạn hoặc bồi thường, danh sách sẽ hiển thị tại đây.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
