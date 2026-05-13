import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  ChevronDown,
  HelpCircle,
  Info,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { loanApi } from '../../services/loan.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { CopyStatus, LoanStatus, MemberStatus, Role, type LoanListItem } from '../../types/models';
import { bookVisual } from '@libero/shared';
import { daysUntil, extractErrorMessage, formatDate, formatDateTime, formatList } from '../../utils/format';

const PAGE_SIZE = 10;

interface LoanView {
  id: string;
  title: string;
  author: string;
  code: string;
  isbn: string;
  dueLabel: string;
  dueStatus: string;
  returnTime?: string;
  status: LoanStatus;
  statusLabel: string;
  renewRemaining?: string;
  renewBlockedTitle?: string;
  renewBlockedDescription?: string;
  coverBg: string;
  coverText: string;
  coverSpine: string;
  coverAccent: string;
  source?: LoanListItem;
  renewDisabledReason?: string;
}

function buildRenewDisabledReason(
  status: LoanStatus,
  renewCount: number,
  maxRenewals: number,
  memberStatus?: MemberStatus,
  isBlocked?: boolean,
): string | undefined {
  if (status !== LoanStatus.Active) {
    return 'Chỉ có thể gia hạn phiếu mượn đang hoạt động.';
  }

  if (memberStatus && memberStatus !== MemberStatus.Active) {
    return 'Tài khoản hiện tại không đủ điều kiện để gia hạn.';
  }

  if (isBlocked) {
    return 'Tài khoản của bạn đang bị khóa nên không thể gia hạn thêm.';
  }

  if (renewCount >= maxRenewals) {
    return 'Bạn đã dùng hết số lần gia hạn cho phép.';
  }

  return undefined;
}

function toLoanView(loan: LoanListItem, renewDisabledReason?: string): LoanView {
  const visual = bookVisual(loan.book._id);
  const daysLeft = daysUntil(loan.dueDate);
  const isReturned = loan.status === LoanStatus.Returned;

  return {
    id: loan._id,
    title: loan.book.title,
    author: formatList(loan.book.authors, 'Chưa cập nhật tác giả'),
    code: loan.copy.barcode,
    isbn: loan.book.isbn,
    dueLabel: isReturned ? formatDate(loan.returnDate ?? loan.dueDate) : formatDate(loan.dueDate),
    dueStatus: isReturned
      ? formatDateTime(loan.returnDate ?? loan.dueDate).split(' ')[1] ?? ''
      : daysLeft === null
        ? '-'
        : daysLeft >= 0
          ? `Còn ${daysLeft} ngày`
          : `Quá hạn ${Math.abs(daysLeft)} ngày`,
    status: loan.status,
    statusLabel: loan.status,
    renewRemaining: loan.status === LoanStatus.Active ? `Còn ${Math.max(0, loan.policyMaxRenewals - loan.renewCount)} lần gia hạn` : undefined,
    renewBlockedTitle: renewDisabledReason ? 'Không thể gia hạn' : undefined,
    renewBlockedDescription: renewDisabledReason,
    coverBg: visual.bg,
    coverText: visual.text,
    coverSpine: visual.spine,
    coverAccent: visual.accent,
    source: loan,
    renewDisabledReason,
  };
}

function StatusBadge({ status, label }: { status: LoanStatus; label: string }) {
  const className =
    status === LoanStatus.Active
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === LoanStatus.Overdue
        ? 'border-red-200 bg-red-50 text-red-600'
        : 'border-slate-200 bg-slate-100 text-slate-600';

  return <span className={`inline-flex min-h-8 items-center rounded-lg border px-4 text-sm font-extrabold ${className}`}>{label}</span>;
}

function BookCover({ loan }: { loan: LoanView }) {
  return (
    <div
      className="relative isolate flex h-[116px] w-[78px] shrink-0 flex-col justify-between overflow-hidden rounded-[7px] py-3 pl-4 pr-2.5 text-left shadow-[0_12px_24px_rgba(15,31,56,0.16)] ring-1 ring-black/5"
      style={{ background: `linear-gradient(135deg, ${loan.coverBg}, ${loan.coverAccent})`, color: loan.coverText }}
      aria-label={`Bìa sách ${loan.title}`}
    >
      <span className="absolute inset-y-0 left-0 w-2" style={{ backgroundColor: loan.coverSpine }} aria-hidden="true" />
      <span className="absolute -right-5 top-5 h-12 w-12 rounded-full border border-white/25 opacity-60" aria-hidden="true" />
      <span className="relative z-10 text-[0.52rem] font-black uppercase tracking-[0.12em] opacity-80">LIBERO</span>
      <strong className="relative z-10 line-clamp-5 break-words text-[0.82rem] font-black leading-[0.95rem]">{loan.title}</strong>
      <span className="relative z-10 text-[0.58rem] font-black uppercase opacity-75">{loan.isbn}</span>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  description,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
  tone: 'blue' | 'amber' | 'red';
}) {
  const toneClass = {
    blue: {
      icon: 'bg-blue-50 text-[#2675d9]',
      value: 'text-[#2675d9]',
      watermark: 'text-blue-100',
    },
    amber: {
      icon: 'bg-amber-50 text-amber-600',
      value: 'text-amber-600',
      watermark: 'text-amber-100',
    },
    red: {
      icon: 'bg-red-50 text-red-600',
      value: 'text-red-600',
      watermark: 'text-red-100',
    },
  }[tone];

  return (
    <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,31,56,0.04)]">
      <div className="flex items-center gap-5">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${toneClass.icon}`}>
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>
        <div>
          <p className="m-0 text-sm font-semibold text-slate-500">{title}</p>
          <strong className={`block text-[1.75rem] leading-tight ${toneClass.value}`}>{value}</strong>
          <p className="m-0 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <Icon className={`absolute right-5 top-1/2 h-16 w-16 -translate-y-1/2 ${toneClass.watermark}`} aria-hidden="true" />
    </article>
  );
}

function NoticePanel({ loan }: { loan: LoanView }) {
  if (!loan.renewBlockedTitle) {
    return <div className="hidden xl:block" />;
  }

  const isDanger = loan.status === LoanStatus.Overdue;

  return (
    <div className={`rounded-lg border p-4 ${isDanger ? 'border-red-200 bg-red-50 text-red-600' : 'border-blue-100 bg-blue-50 text-[#2675d9]'}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-extrabold">
        {isDanger ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : <Info className="h-5 w-5" aria-hidden="true" />}
        {loan.renewBlockedTitle}
      </div>
      <p className="m-0 text-sm leading-6 text-slate-600">{loan.renewBlockedDescription}</p>
    </div>
  );
}

function LoanRow({
  loan,
  onRenew,
  renewing,
}: {
  loan: LoanView;
  onRenew?: (loanId: string) => void;
  renewing?: boolean;
}) {
  const canShowRenew = loan.status === LoanStatus.Active;
  const renewDisabled = Boolean(loan.renewDisabledReason || !loan.source || renewing);

  return (
    <article className={`grid gap-5 border-b border-slate-100 px-4 py-4 last:border-b-0 lg:grid-cols-[minmax(300px,1fr)_210px_minmax(190px,260px)_120px_170px] lg:items-center ${loan.status === LoanStatus.Overdue ? 'border-l-4 border-l-red-500 bg-red-50/45' : ''}`}>
      <div className="flex min-w-0 gap-5">
        <BookCover loan={loan} />
        <div className="min-w-0 self-center">
          <h2 className="m-0 line-clamp-2 text-[1.08rem] font-extrabold text-[#0f1f44]">{loan.title}</h2>
          <p className="m-0 mt-2 text-sm text-slate-500">{loan.author}</p>
          <p className="m-0 mt-4 text-sm text-slate-500">
            {loan.code} <span className="mx-3 text-slate-300">|</span> ISBN: {loan.isbn}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Calendar className="mt-1 h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
        <div>
          <p className="m-0 text-sm text-slate-500">{loan.status === LoanStatus.Returned ? 'Ngày trả' : 'Ngày đến hạn'}</p>
          <strong className={`block text-[1.45rem] leading-tight ${loan.status === LoanStatus.Overdue ? 'text-red-600' : loan.status === LoanStatus.Returned ? 'text-slate-500' : 'text-[#2675d9]'}`}>
            {loan.dueLabel}
          </strong>
          <p className={`m-0 mt-1 text-sm font-bold ${loan.status === LoanStatus.Overdue ? 'text-red-600' : loan.status === LoanStatus.Returned ? 'text-slate-500' : 'text-[#2675d9]'}`}>{loan.dueStatus}</p>
        </div>
      </div>

      <NoticePanel loan={loan} />

      <StatusBadge status={loan.status} label={loan.statusLabel} />

      <div className="flex flex-col items-stretch gap-2">
        {canShowRenew ? (
          <button
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 text-base font-bold text-[#2675d9] transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
            type="button"
            onClick={() => loan.source && onRenew?.(loan.source._id)}
            disabled={renewDisabled}
            title={loan.renewDisabledReason}
          >
            <RefreshCw className={`h-5 w-5 ${renewing ? 'animate-spin' : ''}`} aria-hidden="true" />
            Gia hạn
          </button>
        ) : (
          <span className="grid min-h-12 place-items-center text-xl text-slate-400">-</span>
        )}
        <span className="text-center text-sm text-slate-500">{loan.renewRemaining ?? '-'}</span>
      </div>
    </article>
  );
}

export default function MyLoansPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const notify = useNotificationsStore((state) => state.push);
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loansQuery = useQuery({
    queryKey: ['reader-my-loans', statusFilter, page],
    queryFn: () =>
      loanApi.listMyLoans({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const renewMutation = useMutation({
    mutationFn: (loanId: string) => loanApi.renewLoan(loanId),
    onSuccess: () => {
      setFeedback('Gia hạn thành công. Hạn trả đã được cập nhật theo chính sách hiện hành.');
      void queryClient.invalidateQueries({ queryKey: ['reader-my-loans'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể gia hạn phiếu mượn này.'),
      });
    },
  });

  const loans = loansQuery.data;

  useEffect(() => {
    if (loansQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(loansQuery.error, 'Không thể tải danh sách phiếu mượn.'),
      });
    }
  }, [loansQuery.error, loansQuery.isError, notify]);

  const loanViews = useMemo(() => {
    if (!loans) {
      return [];
    }

    return loans.items.map((loan) => {
      const disabledReason =
        loan.status === LoanStatus.Active
          ? buildRenewDisabledReason(
              loan.status,
              loan.renewCount,
              loan.policyMaxRenewals,
              user?.status,
              user?.isBlocked,
            )
          : loan.status === LoanStatus.Overdue
            ? 'Vui lòng trả sách sớm. Trả trễ có thể bị phạt.'
            : undefined;

      return toLoanView(loan, disabledReason);
    });
  }, [loans, user?.isBlocked, user?.status]);

  const activeCount = loanViews.filter((view) => view.status === LoanStatus.Active).length;
  const overdueCount = loanViews.filter((view) => view.status === LoanStatus.Overdue).length;
  const dueSoonCount = loanViews.filter((view) => {
    if (view.status !== LoanStatus.Active || !view.source) {
      return false;
    }
    const days = daysUntil(view.source.dueDate);
    return days !== null && days >= 0 && days <= 3;
  }).length;
  const activeTabCount = loans?.pagination.totalItems ?? loanViews.length;

  return (
    <div className="flex flex-col gap-5 py-7">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="m-0 text-[2.45rem] font-extrabold leading-tight text-[#0f1f44]">Khoản mượn của tôi</h1>
          <p className="m-0 mt-2 text-[1.05rem] text-slate-500">Quản lý các cuốn sách bạn đang mượn và lịch sử mượn.</p>
        </div>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-blue-200 hover:text-[#2675d9]" type="button">
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
          Hướng dẫn mượn và gia hạn
        </button>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <SummaryCard icon={BookOpen} title="Tổng số đang mượn" value={String(activeCount)} description={`${activeCount} cuốn sách`} tone="blue" />
        <SummaryCard icon={Calendar} title="Sắp đến hạn" value={String(dueSoonCount)} description="Trong 3 ngày tới" tone="amber" />
        <SummaryCard icon={AlertTriangle} title="Quá hạn" value={String(overdueCount)} description="Vui lòng trả sách sớm" tone="red" />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_34px_rgba(15,31,56,0.04)]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center">
          <div className="flex gap-6">
            <button
              className={`min-h-10 border-b-2 px-4 text-base font-extrabold transition ${
                statusFilter === 'all' || statusFilter === LoanStatus.Active ? 'border-[#2675d9] text-[#2675d9]' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setPage(1);
              }}
            >
              Đang mượn ({activeTabCount})
            </button>
            <button
              className={`min-h-10 border-b-2 px-4 text-base font-extrabold transition ${
                statusFilter === LoanStatus.Returned ? 'border-[#2675d9] text-[#2675d9]' : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
              type="button"
              onClick={() => {
                setStatusFilter(LoanStatus.Returned);
                setPage(1);
              }}
            >
              Lịch sử mượn
            </button>
          </div>

          <button className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg bg-white px-3 text-sm font-semibold text-slate-600 lg:self-auto" type="button">
            Sắp xếp: <strong className="text-slate-800">Ngày đến hạn</strong>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {feedback ? (
          <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{feedback}</div>
        ) : null}

        {loansQuery.isLoading ? (
          <div className="p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="mb-4 h-[132px] animate-pulse rounded-xl bg-slate-100 last:mb-0" key={index} />
            ))}
          </div>
        ) : loanViews.length > 0 ? (
          <div>
            {loanViews.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                onRenew={(loanId) => renewMutation.mutate(loanId)}
                renewing={renewMutation.isPending && renewMutation.variables === loan.source?._id}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <h2 className="m-0 text-xl font-extrabold text-slate-900">Bạn chưa có phiếu mượn nào</h2>
            <p className="m-0 mt-2 text-slate-500">Khi mượn sách tại thư viện, danh sách phiếu mượn của bạn sẽ hiển thị ở đây.</p>
          </div>
        )}

        {loans && loans.pagination.totalPages > 1 ? (
          <div className="flex items-center justify-center gap-3 border-t border-slate-100 px-5 py-4">
            <button className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 disabled:opacity-50" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
              Trang trước
            </button>
            <span className="text-sm text-slate-500">
              Trang {loans.pagination.page} / {loans.pagination.totalPages || 1}
            </span>
            <button className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 disabled:opacity-50" type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= (loans.pagination.totalPages || 1)}>
              Trang sau
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
