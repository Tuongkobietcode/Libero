import { CheckCircle2, RefreshCw } from 'lucide-react';

import { StaggerContainer, StaggerItem } from '../../../components/motion/ReaderMotion';
import { ReaderBookCover } from '../../../components/reader/ReaderBookCover';
import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { LoanStatus, type LoanStatus as LoanStatusValue } from '../../../types/models';
import { getLoanTone, type LoanView } from '../loanView';

function LoanBookCover({ loan }: { loan: LoanView }) {
  return (
    <ReaderBookCover
      bookId={loan.source?.book._id}
      title={loan.title}
      coverImage={loan.coverImage}
      queryScope="loan-cover"
      size="large"
    />
  );
}

function LoanStatusBadge({ status, label }: { status: LoanStatusValue; label: string }) {
  const tone = getLoanTone(status);

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.06em] ${tone.status}`}>
      {label}
    </span>
  );
}

function LoanAction({
  loan,
  onRenew,
  renewing,
}: {
  loan: LoanView;
  onRenew?: (loanId: string) => void;
  renewing?: boolean;
}) {
  if (loan.status === LoanStatus.Returned) {
    return null;
  }

  if (loan.status !== LoanStatus.Active) {
    return (
      <span className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-100 px-4 text-sm font-bold text-slate-400">
        Không đủ điều kiện gia hạn
      </span>
    );
  }

  const renewDisabled = Boolean(loan.renewDisabledReason || !loan.source || renewing);

  return (
    <button
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-5 text-sm font-bold text-brand-700 transition hover:bg-brand-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-300"
      type="button"
      onClick={() => loan.source && onRenew?.(loan.source._id)}
      disabled={renewDisabled}
      title={loan.renewDisabledReason}
    >
      <RefreshCw className={`h-4 w-4 ${renewing ? 'animate-spin' : ''}`} aria-hidden="true" />
      Gia hạn
    </button>
  );
}

function ActiveLoanCard({
  loan,
  onRenew,
  renewing,
}: {
  loan: LoanView;
  onRenew?: (loanId: string) => void;
  renewing?: boolean;
}) {
  const tone = getLoanTone(loan.status);
  const showDangerDate = loan.status === LoanStatus.Overdue || loan.status === LoanStatus.Lost;

  return (
    <article className={`rounded-2xl border bg-white p-5 shadow-[0_14px_32px_rgba(15,31,56,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,31,56,0.08)] ${tone.card}`}>
      <div className="grid gap-6 md:grid-cols-[178px_minmax(0,1fr)] md:gap-10 xl:grid-cols-[178px_minmax(0,1fr)_170px] xl:gap-12">
        <LoanBookCover loan={loan} />

        <div className="min-w-0 self-center md:pl-8 xl:pl-12">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-bold text-slate-600">
              Barcode: {loan.code}
            </span>
            <div className="xl:hidden">
              <LoanStatusBadge status={loan.status} label={loan.statusLabel} />
            </div>
          </div>

          <h2 className="m-0 mt-4 line-clamp-2 font-display text-xl font-black tracking-tight text-slate-950">{loan.title}</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-400">Bởi {loan.author}</p>

          <div className="my-4 border-t border-dashed border-slate-300" />

          <div className="grid gap-6 sm:grid-cols-3 xl:gap-16">
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Ngày mượn</p>
              <strong className="mt-1 block font-mono text-base text-slate-950">{loan.checkoutLabel}</strong>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Ngày hạn trả</p>
              <strong className={`mt-1 block font-mono text-base ${showDangerDate ? 'text-red-600' : 'text-slate-950'}`}>{loan.dueLabel}</strong>
              <span className={`mt-1 block text-xs font-bold ${showDangerDate ? 'text-red-600' : 'text-slate-400'}`}>{loan.dueStatus}</span>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Gia hạn</p>
              <strong className="mt-1 block font-mono text-base text-slate-950">
                {loan.source ? `${loan.source.renewCount} / ${loan.source.policyMaxRenewals} lần` : '-'}
              </strong>
              <span className="mt-1 block text-xs font-bold text-slate-400">{loan.renewRemaining ?? 'Không còn hiệu lực'}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4">
            <p className="m-0 flex min-w-0 items-start gap-2 text-sm font-medium leading-6 text-slate-500">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
              {loan.renewBlockedDescription ?? 'Phiếu mượn còn hiệu lực. Bạn có thể gia hạn khi đáp ứng chính sách hiện hành.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:col-start-2 xl:col-start-auto xl:h-full xl:items-end xl:justify-between xl:justify-self-end">
          <div className="hidden xl:block">
            <LoanStatusBadge status={loan.status} label={loan.statusLabel} />
          </div>
          <LoanAction loan={loan} onRenew={onRenew} renewing={renewing} />
        </div>
      </div>
    </article>
  );
}

export function ActiveLoansSection({
  loans,
  loading,
  onRenew,
  renewingLoanId,
}: {
  loans: LoanView[];
  loading: boolean;
  onRenew?: (loanId: string) => void;
  renewingLoanId?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Sách đang mượn</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-500">Theo dõi hạn trả và trạng thái gia hạn của từng cuốn sách.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-bold text-slate-500">{loans.length} cuốn</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="h-[210px] animate-pulse rounded-2xl bg-slate-100" key={index} />
          ))}
        </div>
      ) : loans.length > 0 ? (
        <StaggerContainer className="space-y-4">
          {loans.map((loan) => (
            <StaggerItem key={loan.id}>
              <ActiveLoanCard
                loan={loan}
                onRenew={onRenew}
                renewing={renewingLoanId === loan.source?._id}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <ReaderEmptyState
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
          title="Không có sách đang mượn"
          description="Các phiếu mượn mới sẽ xuất hiện ở khu vực này."
        />
      )}
    </section>
  );
}
