import {
  BookHoldStatus,
  ReservationStatus,
  type BookHoldListItem,
  type ReservationListItem,
} from '../../types/models';
import { formatDateTime, formatList } from '../../utils/format';

export const LIST_LIMIT = 100;

export type AdvanceTab = 'holds' | 'reservations';
export interface BookHoldView {
  id: string;
  bookId: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  barcode: string;
  location?: string;
  requestDate: string;
  requestTime: string;
  holdExpiryAt: string;
  completedDate: string;
  status: BookHoldStatus;
  coverImage?: string;
  source: BookHoldListItem;
}

export interface ReservationView {
  id: string;
  bookId: string;
  title: string;
  author: string;
  category: string;
  isbn: string;
  queuePosition: number;
  queueTotal: number;
  requestDate: string;
  requestTime: string;
  holdExpiryAt?: string | null;
  completedDate: string;
  status: ReservationStatus;
  location?: string;
  barcode?: string;
  coverImage?: string;
  source: ReservationListItem;
}

export function splitDateTime(value?: string | null) {
  const [date = '-', time = ''] = formatDateTime(value).split(' ');
  return { date, time };
}

export function countExpiringSoon(holds: BookHoldView[]) {
  const now = Date.now();
  const sixHoursMs = 6 * 60 * 60 * 1000;

  return holds.filter((hold) => {
    const expiryTime = new Date(hold.holdExpiryAt).getTime();
    return Number.isFinite(expiryTime) && expiryTime > now && expiryTime - now <= sixHoursMs;
  }).length;
}

export function getBookHoldCompletionDate(hold: BookHoldListItem): string | null {
  if (hold.status === BookHoldStatus.Fulfilled) {
    return hold.fulfilledAt ?? hold.updatedAt;
  }

  if (hold.status === BookHoldStatus.Cancelled) {
    return hold.cancelledAt ?? hold.updatedAt;
  }

  if (hold.status === BookHoldStatus.Expired) {
    return hold.expiredAt ?? hold.updatedAt;
  }

  return null;
}

export function mapBookHold(hold: BookHoldListItem): BookHoldView {
  const request = splitDateTime(hold.requestDate);
  const completedAt = getBookHoldCompletionDate(hold);

  return {
    id: hold._id,
    bookId: hold.book._id,
    title: hold.book.title,
    author: formatList(hold.book.authors, 'Tác giả đang cập nhật'),
    category: formatList(hold.book.categories, 'Thể loại đang cập nhật'),
    isbn: hold.book.isbn,
    barcode: hold.copy.barcode,
    location: hold.copy.shelfLocation,
    requestDate: request.date,
    requestTime: request.time,
    holdExpiryAt: hold.holdExpiryAt,
    completedDate: completedAt ? formatDateTime(completedAt) : '-',
    status: hold.status,
    coverImage: hold.book.coverImage,
    source: hold,
  };
}

export function getReservationCompletionDate(reservation: ReservationListItem): string | null {
  if (reservation.status === ReservationStatus.Notified) {
    return reservation.notifiedAt ?? reservation.updatedAt;
  }

  if (
    reservation.status === ReservationStatus.Fulfilled ||
    reservation.status === ReservationStatus.Cancelled ||
    reservation.status === ReservationStatus.Expired
  ) {
    return reservation.updatedAt;
  }

  return null;
}

export function mapReservation(reservation: ReservationListItem): ReservationView {
  const request = splitDateTime(reservation.requestDate);
  const completedAt = getReservationCompletionDate(reservation);

  return {
    id: reservation._id,
    bookId: reservation.book._id,
    title: reservation.book.title,
    author: formatList(reservation.book.authors, 'Tác giả đang cập nhật'),
    category: formatList(reservation.book.categories, 'Thể loại đang cập nhật'),
    isbn: reservation.book.isbn,
    queuePosition: reservation.queuePosition,
    queueTotal: Math.max(reservation.queueTotal, reservation.queuePosition, 1),
    requestDate: request.date,
    requestTime: request.time,
    holdExpiryAt: reservation.holdExpiryAt,
    completedDate: completedAt ? formatDateTime(completedAt) : '-',
    status: reservation.status,
    location: reservation.copy?.shelfLocation,
    barcode: reservation.copy?.barcode,
    coverImage: reservation.book.coverImage,
    source: reservation,
  };
}

export function getHoldStatusTone(status: BookHoldStatus) {
  if (status === BookHoldStatus.Active) {
    return {
      card: 'border-sky-100 bg-white hover:border-sky-300',
      badge: 'border-sky-100 bg-sky-50 text-brand-700',
      dot: 'bg-brand-600',
      accent: 'text-brand-700',
    };
  }

  if (status === BookHoldStatus.Fulfilled) {
    return {
      card: 'border-emerald-100 bg-white hover:border-emerald-300',
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
      accent: 'text-emerald-700',
    };
  }

  if (status === BookHoldStatus.Expired) {
    return {
      card: 'border-red-100 bg-red-50/30 hover:border-red-300',
      badge: 'border-red-100 bg-red-50 text-red-700',
      dot: 'bg-red-500',
      accent: 'text-red-700',
    };
  }

  return {
    card: 'border-slate-200 bg-white hover:border-slate-300',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
    accent: 'text-slate-600',
  };
}

export function getReservationStatusTone(status: ReservationStatus) {
  if (status === ReservationStatus.Waiting) {
    return {
      card: 'border-amber-100 bg-white hover:border-amber-300',
      badge: 'border-amber-100 bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
      accent: 'text-amber-700',
    };
  }

  if (status === ReservationStatus.Notified) {
    return {
      card: 'border-emerald-100 bg-white hover:border-emerald-300',
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
      accent: 'text-emerald-700',
    };
  }

  if (status === ReservationStatus.Fulfilled) {
    return {
      card: 'border-sky-100 bg-white hover:border-sky-300',
      badge: 'border-sky-100 bg-sky-50 text-brand-700',
      dot: 'bg-brand-600',
      accent: 'text-brand-700',
    };
  }

  if (status === ReservationStatus.Expired) {
    return {
      card: 'border-red-100 bg-red-50/30 hover:border-red-300',
      badge: 'border-red-100 bg-red-50 text-red-700',
      dot: 'bg-red-500',
      accent: 'text-red-700',
    };
  }

  return {
    card: 'border-slate-200 bg-white hover:border-slate-300',
    badge: 'border-slate-200 bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
    accent: 'text-slate-600',
  };
}
