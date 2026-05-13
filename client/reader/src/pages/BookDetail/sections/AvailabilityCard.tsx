import { Link, useLocation } from 'react-router-dom';
import { Clock, Info, LockKeyhole, ShieldAlert } from 'lucide-react';

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

function getBorrowedCount(book: BookDetail): number {
  return book.copies.filter(
    (copy) => copy.status === CopyStatus.Borrowed || copy.status === CopyStatus.Reserved,
  ).length;
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
  const borrowed = getBorrowedCount(book);
  const isAvailable = book.availableCopies > 0;
  const canHold =
    isAvailable && !activeHold && !activeReservation && isAuthenticated && canReaderReserve && !isBlocked;
  const canReserve =
    !isAvailable && !activeReservation && isAuthenticated && canReaderReserve && !isBlocked;

  return (
    <aside>
      <h2 className="mb-4 text-base font-extrabold text-slate-900">Tình trạng sách</h2>

      <div className="mb-5 grid gap-3">
        <div className="flex gap-4 rounded-xl bg-slate-50 p-4">
          <span
            className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${
              isAvailable ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}
          >
            <LockKeyhole className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <strong className={`block text-2xl leading-tight ${isAvailable ? 'text-emerald-600' : 'text-red-600'}`}>
              {book.availableCopies}/{book.totalCopies}
            </strong>
            <p className="text-sm text-slate-500">Bản có sẵn</p>
            <p className="text-sm text-slate-500">
              {isAvailable ? 'Bạn có thể đặt giữ hoặc mượn tại quầy.' : 'Hiện tất cả bản sao đều đang được mượn.'}
            </p>
          </div>
        </div>
        <div className="flex gap-4 rounded-xl bg-white p-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600">
            <ShieldAlert className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <strong className="block text-2xl leading-tight text-amber-600">{borrowed}</strong>
            <p className="text-sm text-slate-500">Bản đang mượn hoặc giữ</p>
            <p className="text-sm text-slate-500">Trong thư viện</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/45 p-5">
        {isAvailable && activeHold ? (
          <p className="text-sm text-slate-700">
            Bạn đã đặt giữ sách này. Vui lòng đến thư viện nhận trước{' '}
            <strong>{new Date(activeHold.holdExpiryAt).toLocaleString('vi-VN')}</strong>.
          </p>
        ) : isAvailable && canHold ? (
          <>
            <p className="text-center text-sm font-bold text-slate-800">Sách đang có bản sẵn</p>
            <p className="mt-2 text-center text-sm text-slate-600">
              Đặt giữ sẽ khóa tạm 1 bản trong 24 giờ để bạn đến thư viện nhận sách.
            </p>
            <Button
              fullWidth
              className="mt-4"
              onClick={onHold}
              isLoading={isHolding}
              aria-label="Đặt giữ sách này"
            >
              Đặt giữ
            </Button>
          </>
        ) : isAvailable ? (
          <p className="text-sm text-slate-700">
            {isAuthenticated
              ? 'Chỉ sinh viên và giảng viên mới được đặt giữ trên giao diện bạn đọc.'
              : 'Đăng nhập để đặt giữ sách đang có sẵn.'}
          </p>
        ) : activeReservation ? (
          <p className="text-sm text-slate-700">
            Bạn đã có yêu cầu đặt chỗ đang hiệu lực. Vị trí hiện tại:{' '}
            <strong>#{activeReservation.queuePosition}</strong>.
          </p>
        ) : canReserve ? (
          <>
            <p className="text-center text-sm font-bold text-slate-800">Tất cả bản sao hiện không có sẵn</p>
            <p className="mt-2 text-center text-sm text-slate-600">
              Hãy đặt chỗ để được mượn ngay khi sách được trả.
            </p>
            <Button
              fullWidth
              className="mt-4"
              onClick={onReserve}
              isLoading={isReserving}
              aria-label="Đặt chỗ sách này"
            >
              Đặt chỗ
            </Button>
          </>
        ) : isAuthenticated ? (
          <p className="text-sm text-slate-700">
            {isBlocked
              ? 'Tài khoản của bạn đang bị khóa nên không thể đặt chỗ. Vui lòng xử lý các nghĩa vụ còn tồn tại với thư viện.'
              : 'Chỉ sinh viên và giảng viên mới được đặt chỗ trên giao diện bạn đọc.'}
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-700">Đăng nhập để đặt chỗ khi đầu sách không còn bản sao sẵn.</p>
            <Link to="/login" state={{ from: location }} className="mt-4 block">
              <Button fullWidth>Đăng nhập để đặt chỗ</Button>
            </Link>
          </>
        )}

        <div className="mt-4 grid gap-2 text-sm text-slate-500">
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden />
            Đặt giữ có hiệu lực trong 24 giờ; đặt chỗ được xử lý theo hàng đợi.
          </p>
          <p className="flex items-center gap-2">
            <Info className="h-4 w-4" aria-hidden />
            Hệ thống sẽ gửi thông báo khi trạng thái mượn hoặc đặt chỗ thay đổi.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {feedback}
        </div>
      ) : null}
    </aside>
  );
}
