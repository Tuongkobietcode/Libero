import { ChevronRight, Hourglass, MapPin } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

import { StaggerContainer, StaggerItem } from '../../../components/motion/ReaderMotion';
import { ReaderBookCover } from '../../../components/reader/ReaderBookCover';
import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { useCountdown } from '../../../hooks/useCountdown';
import { ReservationStatus } from '../../../types/models';
import { getBookDetailRouteState } from '../../../utils/bookDetailRoute';
import { getStatusLabel } from '../../../utils/display';
import { getReservationStatusTone, type ReservationView } from '../reservationView';

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

function ReservationCountdown({ reservation }: { reservation: ReservationView }) {
  const countdown = useCountdown(reservation.holdExpiryAt);

  if (reservation.status !== ReservationStatus.Notified || !reservation.holdExpiryAt) {
    return null;
  }

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${countdown.isExpired ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
      {countdown.isExpired ? 'Thời gian nhận sách đã hết.' : `Còn lại ${countdown.label} để đến thư viện nhận sách.`}
    </div>
  );
}

function QueueMeter({ reservation }: { reservation: ReservationView }) {
  const visibleSlots = Math.min(7, Math.max(1, reservation.queueTotal));
  const activeSlots =
    reservation.status === ReservationStatus.Notified
      ? 1
      : Math.min(visibleSlots, Math.max(1, reservation.queuePosition));
  const peopleAhead = Math.max(0, reservation.queuePosition - 1);

  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
      <p className="m-0 text-sm font-bold text-amber-700">Vị trí hàng chờ</p>
      <div className="mt-2 flex items-end gap-2">
        <strong className="font-mono text-[2rem] leading-none text-amber-700">#{reservation.queuePosition}</strong>
        <span className="font-mono text-[1.2rem] font-semibold text-slate-500">/ {reservation.queueTotal}</span>
      </div>
      <div className="mt-4 flex gap-3" aria-hidden="true">
        {Array.from({ length: visibleSlots }).map((_, index) => (
          <span
            className={`relative h-5 w-5 rounded-full border-2 ${index < activeSlots ? 'border-amber-500' : 'border-slate-300'}`}
            key={index}
          >
            <span
              className={`absolute -bottom-2 left-1/2 h-2.5 w-4 -translate-x-1/2 rounded-t-full border-2 border-b-0 ${index < activeSlots ? 'border-amber-500' : 'border-slate-300'}`}
            />
          </span>
        ))}
      </div>
      <p className="m-0 mt-4 text-sm font-semibold text-amber-700">
        {reservation.status === ReservationStatus.Notified ? 'Bạn là người tiếp theo' : `Còn ${peopleAhead} người trước bạn`}
      </p>
    </div>
  );
}

function ReservationCard({
  reservation,
  onCancel,
  canceling,
}: {
  reservation: ReservationView;
  onCancel: (reservationId: string) => void;
  canceling: boolean;
}) {
  const tone = getReservationStatusTone(reservation.status);
  const location = useLocation();
  const bookDetailState = getBookDetailRouteState(location);

  return (
    <article className={`rounded-2xl border p-5 shadow-[0_14px_32px_rgba(15,31,56,0.045)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,31,56,0.08)] ${tone.card}`}>
      <div className="grid gap-6 md:grid-cols-[150px_minmax(0,1fr)] md:gap-8 xl:grid-cols-[150px_minmax(0,1fr)_230px]">
        <Link to={`/books/${reservation.bookId}`} state={bookDetailState} className="shrink-0" aria-label={`Xem chi tiết ${reservation.title}`}>
          <RequestCover bookId={reservation.bookId} title={reservation.title} coverImage={reservation.coverImage} />
        </Link>

        <div className="min-w-0 self-center">
          <div className="flex flex-wrap items-center gap-3">
            <RequestStatusBadge label={getStatusLabel(reservation.status)} className={tone.badge} />
            <span className="inline-flex min-h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-bold text-slate-600">
              ISBN: {reservation.isbn}
            </span>
          </div>

          <h2 className="m-0 mt-4 line-clamp-2 font-display text-xl font-black tracking-tight text-slate-950">{reservation.title}</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-400">Bởi {reservation.author}</p>
          <p className="m-0 mt-2 text-sm font-medium text-slate-500">{reservation.category}</p>

          <div className="my-4 border-t border-dashed border-slate-300" />

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Ngày đặt chỗ</p>
              <strong className="mt-1 block font-mono text-base text-slate-950">{reservation.requestDate}</strong>
              <span className="mt-1 block text-xs font-bold text-slate-400">{reservation.requestTime}</span>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Khi đến lượt</p>
              <strong className={`mt-1 block text-base ${tone.accent}`}>
                {reservation.status === ReservationStatus.Notified ? 'Đã có thể nhận' : 'Chờ thông báo'}
              </strong>
            </div>
            <div>
              <p className="m-0 text-sm font-medium text-slate-500">Bản sao</p>
              <strong className="mt-1 block font-mono text-base text-slate-950">{reservation.barcode ?? 'Chưa gán'}</strong>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4">
            <p className="m-0 flex min-w-0 items-start gap-2 text-sm font-medium leading-6 text-slate-500">
              <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
              {reservation.status === ReservationStatus.Notified
                ? 'Sách đã đến lượt bạn. Vui lòng đến thư viện trước khi thời gian nhận hết hạn.'
                : 'Bạn đang trong hàng chờ. Hệ thống sẽ thông báo khi có bản sao được giải phóng.'}
            </p>
            <ReservationCountdown reservation={reservation} />
            {reservation.location ? (
              <p className="m-0 flex items-center gap-2 text-sm font-semibold text-slate-500">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {reservation.location}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:col-start-2 xl:col-start-auto xl:justify-between">
          <QueueMeter reservation={reservation} />
          <div className="flex flex-col gap-3">
            <Link
              to={`/books/${reservation.bookId}`}
              state={bookDetailState}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
            >
              Xem chi tiết
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-white px-5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
              type="button"
              onClick={() => onCancel(reservation.id)}
              disabled={canceling}
            >
              {canceling ? 'Đang hủy...' : 'Hủy đặt chỗ'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ActiveReservationsSection({
  reservations,
  loading,
  onCancel,
  cancelingReservationId,
}: {
  reservations: ReservationView[];
  loading: boolean;
  onCancel: (reservationId: string) => void;
  cancelingReservationId?: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Đặt chỗ sách</h2>
          <p className="m-0 mt-1 text-sm font-medium text-slate-500">Theo dõi vị trí hàng chờ và thông báo nhận sách.</p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-bold text-slate-500">{reservations.length} yêu cầu</span>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, index) => (
            <div className="h-[240px] animate-pulse rounded-2xl bg-slate-100" key={index} />
          ))}
        </div>
      ) : reservations.length > 0 ? (
        <StaggerContainer className="space-y-4">
          {reservations.map((reservation) => (
            <StaggerItem key={reservation.id}>
              <ReservationCard
                reservation={reservation}
                onCancel={onCancel}
                canceling={cancelingReservationId === reservation.id}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <ReaderEmptyState
          icon={Hourglass}
          title="Chưa có sách đang đặt chỗ"
          description="Khi một đầu sách hết bản sao có sẵn, bạn có thể đặt chỗ để vào hàng chờ."
        />
      )}
    </section>
  );
}
