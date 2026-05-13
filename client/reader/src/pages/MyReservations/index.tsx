import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowUpDown,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  Hourglass,
  MapPin,
  MoreVertical,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { useCountdown } from '../../hooks/useCountdown';
import { reservationApi } from '../../services/reservation.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { ReservationStatus, type ReservationListItem, type ReservationScope } from '../../types/models';
import { bookVisual } from '@libero/shared';
import { getReservationScopeLabel, getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatDateTime, formatList } from '../../utils/format';

const PAGE_SIZE = 10;

interface ReservationView {
  _id: string;
  bookId: string;
  title: string;
  author: string;
  category: string;
  isbn?: string;
  queuePosition: number;
  queueTotal: number;
  requestDate: string;
  requestTime: string;
  status: ReservationStatus;
  holdExpiryAt?: string | null;
  location?: string;
  coverBg: string;
  coverText: string;
  coverSpine: string;
  coverAccent: string;
}

function splitDateTime(value?: string | null) {
  const [date = '-', time = ''] = formatDateTime(value).split(' ');
  return { date, time };
}

function mapReservation(reservation: ReservationListItem): ReservationView {
  const visual = bookVisual(reservation.book._id);
  const { date, time } = splitDateTime(reservation.requestDate);

  return {
    _id: reservation._id,
    bookId: reservation.book._id,
    title: reservation.book.title,
    author: formatList(reservation.book.authors, 'Tác giả đang cập nhật'),
    category: formatList(reservation.book.categories, 'Thể loại đang cập nhật'),
    isbn: reservation.book.isbn,
    queuePosition: reservation.queuePosition,
    queueTotal: Math.max(reservation.queueTotal, reservation.queuePosition, 1),
    requestDate: date,
    requestTime: time,
    status: reservation.status,
    holdExpiryAt: reservation.holdExpiryAt,
    location: reservation.copy?.shelfLocation,
    coverBg: visual.bg,
    coverText: visual.text,
    coverSpine: visual.spine,
    coverAccent: visual.accent,
  };
}

function statusClassName(status: ReservationStatus): string {
  if (status === ReservationStatus.Waiting) {
    return 'bg-amber-50 text-amber-700';
  }

  if (status === ReservationStatus.Notified) {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === ReservationStatus.Fulfilled) {
    return 'bg-blue-50 text-blue-700';
  }

  if (status === ReservationStatus.Expired) {
    return 'bg-red-50 text-red-700';
  }

  return 'bg-slate-100 text-slate-600';
}

function SummaryCard({
  icon: Icon,
  tone,
  title,
  value,
  description,
}: {
  icon: LucideIcon;
  tone: 'amber' | 'emerald' | 'blue';
  title: string;
  value: number;
  description: string;
}) {
  const toneClass =
    tone === 'amber'
      ? 'bg-amber-50 text-amber-600'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-600'
        : 'bg-blue-50 text-[#2675d9]';

  return (
    <article className="flex min-h-[120px] items-center justify-between rounded-xl border border-slate-200 bg-white px-6 py-5 shadow-[0_14px_32px_rgba(15,31,56,0.04)]">
      <div className="flex min-w-0 items-center gap-5">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${toneClass}`}>
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="m-0 text-sm font-extrabold text-slate-700">{title}</h2>
          <strong className={`block text-[1.8rem] leading-tight ${tone === 'amber' ? 'text-amber-600' : tone === 'emerald' ? 'text-emerald-600' : 'text-[#2675d9]'}`}>
            {value}
          </strong>
          <p className="m-0 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <ChevronRight className="h-6 w-6 shrink-0 text-slate-400" aria-hidden="true" />
    </article>
  );
}

function ReservationCover({ reservation }: { reservation: ReservationView }) {
  return (
    <div
      className="relative isolate flex h-[140px] w-[94px] shrink-0 flex-col justify-between overflow-hidden rounded-lg py-4 pl-5 pr-3 text-left shadow-[0_16px_30px_rgba(15,31,56,0.16)] ring-1 ring-black/5"
      style={{ background: `linear-gradient(135deg, ${reservation.coverBg}, ${reservation.coverAccent})`, color: reservation.coverText }}
      aria-label={`Bìa sách ${reservation.title}`}
    >
      <span className="absolute inset-y-0 left-0 w-2.5" style={{ backgroundColor: reservation.coverSpine }} aria-hidden="true" />
      <span className="absolute -right-6 top-6 h-14 w-14 rounded-full border border-white/25 opacity-60" aria-hidden="true" />
      <span className="relative z-10 text-[0.58rem] font-black uppercase tracking-[0.14em] opacity-80">LIBERO</span>
      <strong className="relative z-10 line-clamp-5 break-words text-[0.98rem] font-black leading-[1.12rem]">{reservation.title}</strong>
      <span className="relative z-10 text-[0.6rem] font-black uppercase opacity-75">{reservation.isbn ?? 'LIB'}</span>
    </div>
  );
}

function QueueMeter({ reservation }: { reservation: ReservationView }) {
  const visibleSlots = Math.min(7, Math.max(1, reservation.queueTotal));
  const activeSlots =
    reservation.status === ReservationStatus.Notified
      ? 1
      : Math.min(visibleSlots, Math.max(1, reservation.queuePosition));
  const tone = reservation.status === ReservationStatus.Notified ? 'text-emerald-600' : 'text-amber-600';
  const peopleAhead = Math.max(0, reservation.queuePosition - 1);

  return (
    <div>
      <p className="m-0 text-sm font-semibold text-slate-500">Bạn đang xếp hàng</p>
      <div className="mt-2 flex items-end gap-2">
        <strong className={`text-[2rem] leading-none ${tone}`}># {reservation.queuePosition}</strong>
        <span className="text-[1.45rem] font-semibold text-slate-500">/ {reservation.queueTotal}</span>
      </div>
      <div className="mt-4 flex gap-3" aria-hidden="true">
        {Array.from({ length: visibleSlots }).map((_, index) => (
          <span
            className={`relative h-5 w-5 rounded-full border-2 ${
              index < activeSlots ? (reservation.status === ReservationStatus.Notified ? 'border-emerald-600' : 'border-amber-500') : 'border-slate-300'
            }`}
            key={index}
          >
            <span
              className={`absolute -bottom-2 left-1/2 h-2.5 w-4 -translate-x-1/2 rounded-t-full border-2 border-b-0 ${
                index < activeSlots ? (reservation.status === ReservationStatus.Notified ? 'border-emerald-600' : 'border-amber-500') : 'border-slate-300'
              }`}
            />
          </span>
        ))}
      </div>
      <p className={`m-0 mt-4 text-sm ${reservation.status === ReservationStatus.Notified ? 'font-semibold text-emerald-600' : 'text-slate-500'}`}>
        {reservation.status === ReservationStatus.Notified ? 'Bạn là người tiếp theo' : `Còn ${peopleAhead} người trước bạn`}
      </p>
    </div>
  );
}

function HoldCountdown({ reservation }: { reservation: ReservationView }) {
  const countdown = useCountdown(reservation.holdExpiryAt);

  if (reservation.status !== ReservationStatus.Notified) {
    return null;
  }

  if (!reservation.holdExpiryAt) {
    return null;
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
      {countdown.isExpired ? 'Thời gian giữ sách đã hết.' : `Còn lại ${countdown.label} để đến thư viện nhận sách.`}
    </div>
  );
}

function ReservationRow({
  reservation,
  onCancel,
  canceling,
}: {
  reservation: ReservationView;
  onCancel: (reservationId: string) => void;
  canceling: boolean;
}) {
  const canCancel =
    reservation.status === ReservationStatus.Waiting || reservation.status === ReservationStatus.Notified;
  const shouldShowCancelButton = canCancel;

  return (
    <article className="grid gap-6 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,31,56,0.04)] xl:grid-cols-[420px_1fr_180px_270px]">
      <div className="flex gap-5">
        <Link to={`/books/${reservation.bookId}`} className="shrink-0" aria-label={`Xem chi tiết ${reservation.title}`}>
          <ReservationCover reservation={reservation} />
        </Link>
        <div className="min-w-0 py-2">
          <h2 className="m-0 text-[1.22rem] font-extrabold leading-snug text-[#0f1f44]">{reservation.title}</h2>
          <p className="m-0 mt-2 text-sm font-semibold text-slate-500">{reservation.author}</p>
          <p className="m-0 mt-2 text-sm text-slate-500">{reservation.category}</p>
          <Link
            to={`/books/${reservation.bookId}`}
            className="mt-4 inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-bold text-[#2675d9] transition hover:bg-blue-50"
          >
            Xem chi tiết
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <div className="border-slate-100 xl:border-l xl:px-8">
        <QueueMeter reservation={reservation} />
      </div>

      <div className="flex items-center gap-3 border-slate-100 text-sm text-slate-500 xl:border-l xl:px-8">
        <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="m-0">Ngày yêu cầu</p>
          <strong className="mt-1 block text-base text-slate-800">{reservation.requestDate}</strong>
          <span>{reservation.requestTime}</span>
        </div>
      </div>

      <div className="relative border-slate-100 xl:border-l xl:pl-8">
        <button
          className="absolute right-0 top-0 grid h-10 w-10 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-50"
          type="button"
          aria-label="Mở tùy chọn đặt chỗ"
        >
          <MoreVertical className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className={`inline-flex rounded-full px-4 py-1.5 text-xs font-extrabold ${statusClassName(reservation.status)}`}>
          {getStatusLabel(reservation.status)}
        </span>
        <p className="m-0 mt-4 max-w-[250px] text-sm leading-6 text-slate-500">
          {reservation.status === ReservationStatus.Notified
            ? 'Vui lòng đến thư viện nhận sách trước khi hết hạn.'
            : reservation.status === ReservationStatus.Waiting
              ? 'Bạn sẽ được thông báo khi đến lượt.'
              : 'Yêu cầu đặt chỗ đã được xử lý.'}
        </p>
        <HoldCountdown reservation={reservation} />
        {reservation.location ? (
          <p className="m-0 mt-3 flex items-center gap-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {reservation.location}
          </p>
        ) : null}
        {shouldShowCancelButton ? (
          <button
            className="mt-5 min-h-10 rounded-lg border border-red-200 bg-white px-7 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-55"
            type="button"
            onClick={() => onCancel(reservation._id)}
            disabled={!canCancel || canceling}
          >
            {canceling ? 'Đang hủy...' : 'Hủy đặt chỗ'}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [scope, setScope] = useState<ReservationScope>('active');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const reservationsQuery = useQuery({
    queryKey: ['reader-my-reservations', scope, page],
    queryFn: () => reservationApi.listMyReservations({ scope, page, limit: PAGE_SIZE }),
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) => reservationApi.cancelReservation(reservationId),
    onSuccess: () => {
      setFeedback('Đã hủy yêu cầu đặt chỗ thành công.');
      void queryClient.invalidateQueries({ queryKey: ['reader-my-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reader-book-detail-active-reservations'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể hủy yêu cầu đặt chỗ lúc này.'),
      });
    },
  });

  useEffect(() => {
    if (reservationsQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(reservationsQuery.error, 'Không thể tải danh sách đặt chỗ.'),
      });
    }
  }, [notify, reservationsQuery.error, reservationsQuery.isError]);

  const realReservations = reservationsQuery.data?.items ?? [];

  const reservations = useMemo(() => realReservations.map(mapReservation), [realReservations]);

  const summary = useMemo(
    () => ({
      waiting: reservations.filter((reservation) => reservation.status === ReservationStatus.Waiting).length,
      notified: reservations.filter((reservation) => reservation.status === ReservationStatus.Notified).length,
      history: reservations.filter(
        (reservation) =>
          reservation.status === ReservationStatus.Fulfilled ||
          reservation.status === ReservationStatus.Cancelled ||
          reservation.status === ReservationStatus.Expired,
      ).length,
    }),
    [reservations],
  );

  const pagination = reservationsQuery.data?.pagination;

  return (
    <div className="flex flex-col gap-6 py-9">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-[2.35rem] font-extrabold leading-tight text-[#0f1f44]">Đặt chỗ của tôi</h1>
          <p className="m-0 mt-3 text-base text-slate-500">Quản lý các yêu cầu đặt chỗ sách của bạn tại LIBERO.</p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <SummaryCard icon={Hourglass} tone="amber" title="Đang chờ" value={summary.waiting} description="Bạn đang xếp hàng chờ sách." />
        <SummaryCard icon={Bell} tone="emerald" title="Đã thông báo" value={summary.notified} description="Sách đang chờ bạn đến nhận." />
        <SummaryCard icon={History} tone="blue" title="Lịch sử" value={summary.history} description="Tổng số yêu cầu đã hoàn tất." />
      </section>

      {feedback ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{feedback}</div> : null}

      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full sm:w-[210px]">
          <span className="sr-only">Lọc trạng thái đặt chỗ</span>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-500 outline-none transition focus:border-[#2675d9] focus:ring-4 focus:ring-blue-100"
            value={scope}
            onChange={(event) => {
              setScope(event.target.value as ReservationScope);
              setPage(1);
            }}
          >
            <option value="active">{getReservationScopeLabel('active')}</option>
            <option value="all">{getReservationScopeLabel('all')}</option>
            <option value="history">{getReservationScopeLabel('history')}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        </label>

        <label className="relative block w-full sm:w-[180px]">
          <span className="sr-only">Sắp xếp đặt chỗ</span>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-11 pr-10 text-sm font-semibold text-slate-500 outline-none transition focus:border-[#2675d9] focus:ring-4 focus:ring-blue-100"
            defaultValue="newest"
          >
            <option value="newest">Mới nhất</option>
            <option value="queue">Vị trí hàng chờ</option>
          </select>
          <ArrowUpDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        </label>
      </section>

      <section className="flex flex-col gap-4">
        {reservationsQuery.isLoading ? (
          <div className="grid min-h-[280px] place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">
            Đang tải đặt chỗ...
          </div>
        ) : reservations.length > 0 ? (
          reservations.map((reservation) => (
            <ReservationRow
              key={reservation._id}
              reservation={reservation}
              onCancel={(reservationId) => cancelMutation.mutate(reservationId)}
              canceling={cancelMutation.isPending && cancelMutation.variables === reservation._id}
            />
          ))
        ) : (
          <div className="grid min-h-[280px] place-items-center rounded-xl border border-slate-200 bg-white px-6 text-center">
            <div>
              <XCircle className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
              <h2 className="m-0 mt-4 text-lg font-extrabold text-slate-900">Không có yêu cầu đặt chỗ nào</h2>
              <p className="m-0 mt-2 text-sm text-slate-500">Khi một đầu sách hết bản sao có sẵn, bạn có thể đặt chỗ từ trang chi tiết sách.</p>
            </div>
          </div>
        )}
      </section>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            aria-label="Trang trước"
          >
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden="true" />
          </button>
          <span className="grid h-10 min-w-10 place-items-center rounded-lg bg-[#2675d9] px-3 text-sm font-bold text-white">
            {pagination.page}
          </span>
          <button
            className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= (pagination.totalPages || 1)}
            aria-label="Trang sau"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
