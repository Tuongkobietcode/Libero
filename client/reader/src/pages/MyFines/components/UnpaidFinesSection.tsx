import { CheckCircle2, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { StaggerContainer, StaggerItem } from '../../../components/motion/ReaderMotion';
import { ReaderBookCover } from '../../../components/reader/ReaderBookCover';
import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { FineStatus } from '../../../types/models';
import { getBookDetailRouteState } from '../../../utils/bookDetailRoute';
import { getStatusLabel } from '../../../utils/display';
import { formatAmount, getFineStatusTone, type FineView } from '../fineView';

function FineCover({
  bookId,
  title,
  coverImage,
}: {
  bookId: string;
  title: string;
  coverImage?: string;
}) {
  return (
    <ReaderBookCover
      bookId={bookId}
      title={title}
      coverImage={coverImage}
      queryScope="fine-cover"
    />
  );
}

function FineStatusBadge({ status }: { status: FineStatus }) {
  const tone = getFineStatusTone(status);

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.06em] ${tone.badge}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function UnpaidFineCard({ fine }: { fine: FineView }) {
  const tone = getFineStatusTone(fine.status);
  const location = useLocation();
  const bookDetailState = getBookDetailRouteState(location);

  return (
    <article className={`rounded-2xl border p-5 shadow-[0_14px_32px_rgba(15,31,56,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,31,56,0.08)] ${tone.card}`}>
      <div className="grid gap-6 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8 xl:grid-cols-[150px_minmax(0,1fr)_190px]">
        <Link to={`/books/${fine.bookId}`} state={bookDetailState} className="shrink-0" aria-label={`Xem chi tiết ${fine.title}`}>
          <FineCover bookId={fine.bookId} title={fine.title} coverImage={fine.coverImage} />
        </Link>

        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-center gap-3">
            <FineStatusBadge status={fine.status} />
            <span className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-bold text-slate-600">
              ISBN: {fine.isbn}
            </span>
          </div>

          <h2 className="m-0 mt-4 line-clamp-2 font-display text-xl font-black tracking-tight text-slate-950">{fine.title}</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-400">Bởi {fine.author}</p>
          <p className="m-0 mt-2 text-sm font-bold text-red-600">{fine.reason}</p>

          <div className="my-4 border-t border-dashed border-slate-300" />

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Ngày phát sinh</p>
              <strong className="mt-1 block font-mono text-base text-slate-950">{fine.overdueDate}</strong>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Số tiền</p>
              <strong className={`mt-1 block font-mono text-lg ${tone.amount}`}>{formatAmount(fine.amount)}</strong>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Mã khoản mượn</p>
              <strong className="mt-1 block max-w-[150px] truncate font-mono text-base text-slate-950">{fine.loanId}</strong>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4">
            <p className="m-0 flex min-w-0 items-start gap-2 text-sm font-medium leading-6 text-slate-500">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
              {fine.note}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:col-start-2 xl:col-start-auto xl:items-end xl:justify-between">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            Thanh toán được thủ thư xác nhận tại quầy hoặc backoffice.
          </div>
          <Link
            to={`/books/${fine.bookId}`}
            state={bookDetailState}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
          >
            Xem sách
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function UnpaidFinesSection({
  fines,
  loading,
  totalItems,
}: {
  fines: FineView[];
  loading: boolean;
  totalItems: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Khoản chưa thanh toán</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-500">Theo dõi các khoản phạt đang cần thủ thư xử lý.</p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-bold text-slate-500">{totalItems} khoản</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="h-[240px] animate-pulse rounded-2xl bg-slate-100" key={index} />
          ))}
        </div>
      ) : fines.length > 0 ? (
        <StaggerContainer className="space-y-4">
          {fines.map((fine) => (
            <StaggerItem key={fine.id}>
              <UnpaidFineCard fine={fine} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <ReaderEmptyState
          icon={CheckCircle2}
          title="Không có khoản phạt chưa thanh toán"
          description="Các khoản phạt mới hoặc chưa được xác nhận sẽ xuất hiện ở khu vực này."
        />
      )}
    </section>
  );
}
