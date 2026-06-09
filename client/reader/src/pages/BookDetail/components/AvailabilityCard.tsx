import { Link, useLocation } from 'react-router-dom';
import { Bookmark, CalendarClock, Info } from 'lucide-react';

import type { BookDetail, BookHoldListItem, ReservationListItem } from '../../../types/models';
import { Button } from '../../../components/ui/Button';
import { CopyStatus } from '../../../types/models';

interface AvailabilityCardProps {
  book: BookDetail;
  isAuthenticated: boolean;
  canReaderReserve: boolean;
  isBlocked: boolean;
  activeReservation?: ReservationListItem;
  activeHold?: BookHoldListItem;
  feedback: string | null;
  isReserving: boolean;
  isHolding: boolean;
  onReserve: () => void;
  onHold: () => void;
}

function getBusyCount(book: BookDetail): number {
  return book.copies.filter((copy) => copy.status === CopyStatus.Borrowed || copy.status === CopyStatus.Reserved).length;
}

export function AvailabilityCard({
  book,
  isAuthenticated,
  canReaderReserve,
  isBlocked,
  activeReservation,
  activeHold,
  feedback,
  isReserving,
  isHolding,
  onReserve,
  onHold,
}: AvailabilityCardProps) {
  const location = useLocation();
  const isAvailable = book.availableCopies > 0;
  const busyCount = getBusyCount(book);
  const canHold = isAvailable && !activeHold && !activeReservation && isAuthenticated && canReaderReserve && !isBlocked;
  const canReserve = !isAvailable && !activeReservation && isAuthenticated && canReaderReserve && !isBlocked;

  const actionLabel = isAvailable ? 'Đặt giữ sách' : 'Đặt chỗ sách';
  const helperText = isBlocked
    ? 'Tài khoản của bạn đang bị khóa nên không thể đặt chỗ thêm. Vui lòng xử lý các nghĩa vụ còn tồn tại với thư viện.'
    : activeHold
      ? 'Bản sách đang được giữ cho bạn. Vui lòng đến thư viện trước thời hạn để nhận sách.'
    : isAvailable
      ? 'Đặt giữ sách tại kệ tối đa 2 ngày để bạn đến nhận mượn.'
      : 'Đặt chỗ sẽ đưa bạn vào hàng chờ và thông báo khi có bản trả.';

  return (
    <aside className="mt-5 w-full">
      <div className="rounded-xl border-2 border-slate-950/90 bg-slate-50 p-3.5">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">Tổng số cuốn</dt>
            <dd className="mt-1.5 text-lg font-black tracking-tight text-slate-900">{book.totalCopies} bản sao</dd>
          </div>
          <div>
            <dt className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">Sẵn có</dt>
            <dd
              className={`mt-1.5 text-lg font-black tracking-tight ${
                book.availableCopies > 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {book.availableCopies} bản
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4">
        {activeHold ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">
            Bạn đã đặt giữ sách này. Vui lòng đến thư viện nhận trước{' '}
            <strong>{new Date(activeHold.holdExpiryAt).toLocaleString('vi-VN')}</strong>.
          </div>
        ) : activeReservation ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold leading-6 text-sky-800">
            Bạn đang ở vị trí <strong>#{activeReservation.queuePosition}</strong> trong hàng chờ.
          </div>
        ) : canHold ? (
          <Button
            fullWidth
            size="lg"
            className="h-12 rounded-xl text-sm font-black shadow-[0_14px_28px_-18px_rgba(2,132,199,0.7)]"
            onClick={onHold}
            isLoading={isHolding}
            aria-label="Đặt giữ sách này"
          >
            <Bookmark className="h-4 w-4" aria-hidden />
            {actionLabel}
          </Button>
        ) : canReserve ? (
          <Button
            fullWidth
            size="lg"
            className="h-12 rounded-xl !bg-amber-600 text-sm font-black !text-white shadow-[0_14px_28px_-18px_rgba(217,119,6,0.8)] hover:!bg-amber-700 active:!bg-amber-800 focus-visible:!ring-amber-500"
            onClick={onReserve}
            isLoading={isReserving}
            aria-label="Đặt chỗ sách này"
          >
            <CalendarClock className="h-4 w-4" aria-hidden />
            {actionLabel}
          </Button>
        ) : isAuthenticated ? (
          <Button fullWidth size="lg" disabled className="h-12 rounded-xl text-sm font-black">
            <Bookmark className="h-4 w-4" aria-hidden />
            {isBlocked ? 'Tài khoản đang bị khóa' : actionLabel}
          </Button>
        ) : (
          <Link to="/login" state={{ from: location }} className="block">
            <Button fullWidth size="lg" className="h-12 rounded-xl text-sm font-black">
              Đăng nhập để đặt sách
            </Button>
          </Link>
        )}
      </div>

      <p className="mx-auto mt-3 max-w-[250px] text-center text-xs font-semibold leading-5 text-slate-400">
        {helperText}
      </p>

      {feedback ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {feedback}
        </div>
      ) : null}

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs font-semibold text-slate-400">
        <Info className="h-4 w-4" aria-hidden />
        {busyCount} bản đang được mượn hoặc giữ.
      </p>
    </aside>
  );
}
