import { BookmarkCheck, ChevronRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { StaggerContainer, StaggerItem } from '../../../components/motion/ReaderMotion';
import { ReaderBookCover } from '../../../components/reader/ReaderBookCover';
import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { useCountdown } from '../../../hooks/useCountdown';
import { getBookDetailRouteState } from '../../../utils/bookDetailRoute';
import { getBookHoldStatusLabel } from '../../../utils/display';
import { formatDateTime } from '../../../utils/format';
import { getHoldStatusTone, type BookHoldView } from '../reservationView';

function RequestCover({
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
      queryScope="reservation-cover"
    />
  );
}

function RequestStatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.06em] ${className}`}>
      {label}
    </span>
  );
}

function HoldCountdown({ expiryAt }: { expiryAt?: string | null }) {
  const countdown = useCountdown(expiryAt);

  if (!expiryAt) {
    return null;
  }

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${countdown.isExpired ? 'border-red-200 bg-red-50 text-red-700' : 'border-brand-100 bg-brand-50 text-brand-700'}`}>
      {countdown.isExpired ? 'Thời gian giữ sách đã hết.' : `Còn lại ${countdown.label} để đến thư viện nhận sách.`}
    </div>
  );
}

function HoldCard({
  hold,
  onCancel,
  canceling,
}: {
  hold: BookHoldView;
  onCancel: (holdId: string) => void;
  canceling: boolean;
}) {
  const tone = getHoldStatusTone(hold.status);
  const location = useLocation();
  const bookDetailState = getBookDetailRouteState(location);

  return (
    <article className={`rounded-2xl border p-5 shadow-[0_14px_32px_rgba(15,31,56,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,31,56,0.08)] ${tone.card}`}>
      <div className="grid gap-6 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8 xl:grid-cols-[150px_minmax(0,1fr)_190px]">
        <Link to={`/books/${hold.bookId}`} state={bookDetailState} className="shrink-0" aria-label={`Xem chi tiết ${hold.title}`}>
          <RequestCover bookId={hold.bookId} title={hold.title} coverImage={hold.coverImage} />
        </Link>

        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-center gap-3">
            <RequestStatusBadge label={getBookHoldStatusLabel(hold.status)} className={tone.badge} />
            <span className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-bold text-slate-600">
              Barcode: {hold.barcode}
            </span>
          </div>

          <h2 className="m-0 mt-4 line-clamp-2 font-display text-xl font-black tracking-tight text-slate-950">{hold.title}</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-400">Bởi {hold.author}</p>
          <p className="m-0 mt-2 text-sm font-medium text-slate-500">{hold.category}</p>

          <div className="my-4 border-t border-dashed border-slate-300" />

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Ngày đặt giữ</p>
              <strong className="mt-1 block font-mono text-base text-slate-950">{hold.requestDate}</strong>
              <span className="mt-1 block text-xs font-bold text-slate-400">{hold.requestTime}</span>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Hết hạn giữ</p>
              <strong className={`mt-1 block font-mono text-base ${tone.accent}`}>{formatDateTime(hold.holdExpiryAt)}</strong>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Vị trí bản sao</p>
              <strong className="mt-1 block text-base text-slate-950">{hold.location ?? 'Đang cập nhật'}</strong>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4">
            <p className="m-0 flex min-w-0 items-start gap-2 text-sm font-medium leading-6 text-slate-500">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
              Bản sao này đang được giữ cho bạn. Vui lòng đến thư viện trước hạn để thủ thư xác nhận và tạo khoản mượn.
            </p>
            <HoldCountdown expiryAt={hold.holdExpiryAt} />
          </div>
        </div>

        <div className="flex flex-col gap-3 md:col-start-2 xl:col-start-auto xl:items-end xl:justify-between">
          <Link
            to={`/books/${hold.bookId}`}
            state={bookDetailState}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
          >
            Xem chi tiết
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
            type="button"
            onClick={() => onCancel(hold.id)}
            disabled={canceling}
          >
            {canceling ? 'Đang hủy...' : 'Hủy đặt giữ'}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ActiveHoldsSection({
  holds,
  loading,
  onCancel,
  cancelingHoldId,
}: {
  holds: BookHoldView[];
  loading: boolean;
  onCancel: (holdId: string) => void;
  cancelingHoldId?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Đặt giữ sách</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-500">Theo dõi các bản sách đang được giữ cho bạn.</p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-bold text-slate-500">{holds.length} yêu cầu</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="h-[240px] animate-pulse rounded-2xl bg-slate-100" key={index} />
          ))}
        </div>
      ) : holds.length > 0 ? (
        <StaggerContainer className="space-y-4">
          {holds.map((hold) => (
            <StaggerItem key={hold.id}>
              <HoldCard
                hold={hold}
                onCancel={onCancel}
                canceling={cancelingHoldId === hold.id}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <ReaderEmptyState
          icon={BookmarkCheck}
          title="Chưa có sách đang đặt giữ"
          description="Khi một đầu sách còn bản sẵn có, bạn có thể đặt giữ từ trang chi tiết sách."
        />
      )}
    </section>
  );
}
