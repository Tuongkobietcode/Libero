import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, X } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { catalogApi } from '../../services/catalog.api';
import { bookHoldApi } from '../../services/bookHold.api';
import { reservationApi } from '../../services/reservation.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { queryKeys } from '../../lib/queryKeys';
import { BookHoldStatus, ReservationStatus, Role } from '../../types/models';
import { extractErrorMessage } from '../../utils/format';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';

import { BookSidebar } from './components/BookSidebar';
import { BookHero } from './components/BookHero';
import { AvailabilityCard } from './components/AvailabilityCard';
import { CopiesTable } from './components/CopiesTable';
import { RelatedBooks } from './components/RelatedBooks';

export default function BookDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const notify = useNotificationsStore((state) => state.push);
  const [feedback, setFeedback] = useState<string | null>(null);

  function closeModal() {
    if (location.key && location.key !== 'default') {
      navigate(-1);
      return;
    }

    navigate('/search');
  }

  const bookQuery = useQuery({
    queryKey: queryKeys.bookDetail(id),
    queryFn: () => catalogApi.getBook(id),
    enabled: Boolean(id),
    meta: { errorMessage: 'Không thể tải thông tin sách.' },
  });

  const myReservationsQuery = useQuery({
    queryKey: ['reader', 'book-detail-active-reservations', user?._id ?? ''] as const,
    queryFn: () => reservationApi.listMyReservations({ scope: 'active', page: 1, limit: 100 }),
    enabled: isAuthenticated,
  });

  const myBookHoldsQuery = useQuery({
    queryKey: ['reader', 'book-detail-active-holds', user?._id ?? ''] as const,
    queryFn: () => bookHoldApi.listMyHolds({ status: BookHoldStatus.Active, page: 1, limit: 100 }),
    enabled: isAuthenticated,
  });

  const reserveMutation = useMutation({
    mutationFn: () => reservationApi.createReservation(id),
    onSuccess: () => {
      setFeedback('Đặt chỗ thành công. Bạn có thể theo dõi vị trí hàng chờ trong mục Đặt trước.');
      void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail-active-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reader', 'my-reservations'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể tạo yêu cầu đặt chỗ lúc này.'),
      });
    },
  });

  const holdMutation = useMutation({
    mutationFn: () => bookHoldApi.createHold(id),
    onSuccess: () => {
      setFeedback('Đặt giữ thành công. Thư viện đã giữ một bản sách cho bạn trong 24 giờ.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookDetail(id) });
      void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail-active-holds'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể tạo yêu cầu đặt giữ lúc này.'),
      });
    },
  });

  const activeReservation = useMemo(() => {
    return myReservationsQuery.data?.items.find(
      (reservation) =>
        reservation.book._id === id &&
        (reservation.status === ReservationStatus.Waiting || reservation.status === ReservationStatus.Notified),
    );
  }, [id, myReservationsQuery.data?.items]);

  const book = bookQuery.data;
  const activeHold = useMemo(() => {
    return myBookHoldsQuery.data?.items.find((hold) => hold.book._id === id && hold.status === BookHoldStatus.Active);
  }, [id, myBookHoldsQuery.data?.items]);

  useEffect(() => {
    setFeedback(null);
  }, [id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeModal();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  if (bookQuery.isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!book) {
    return (
      <Card padding="lg" className="text-center">
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy đầu sách</h2>
        <p className="mt-1 text-sm text-slate-500">Có thể sách đã bị gỡ khỏi thư viện.</p>
        <Link to="/search" className="mt-4 inline-flex text-sm font-semibold text-brand-600">
          ← Quay lại tìm kiếm
        </Link>
      </Card>
    );
  }

  const canReaderReserve = user?.role === Role.Student || user?.role === Role.Lecturer;
  const isBlocked = Boolean(user?.isBlocked);

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-3 py-6 sm:px-5 sm:py-12" role="dialog" aria-modal="true" aria-labelledby="book-detail-title">
      <button
        type="button"
        className="fixed inset-0 cursor-default"
        aria-label="Đóng chi tiết sách"
        onClick={closeModal}
      />

      <div className="relative mx-auto flex h-[min(80vh,760px)] w-full max-w-[980px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_34px_90px_-34px_rgba(2,8,23,0.75)]">
        <header className="flex shrink-0 items-center justify-between border-b-2 border-slate-950/90 bg-slate-50 px-5 py-3.5">
          <h1 id="book-detail-title" className="m-0 inline-flex items-center gap-2.5 font-display text-xl font-black uppercase tracking-[0.08em] text-slate-500">
            <BookOpen className="h-7 w-7 text-brand-600" aria-hidden />
            Chi tiết tác phẩm
          </h1>
          <button
            type="button"
            onClick={closeModal}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            aria-label="Đóng chi tiết sách"
          >
            <X className="h-6 w-6" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <section className="grid lg:grid-cols-[290px_minmax(0,1fr)]">
            <aside className="p-5 lg:border-r-2 lg:border-slate-950/90">
              <BookSidebar book={book} />
              <AvailabilityCard
                book={book}
                isAuthenticated={isAuthenticated}
                canReaderReserve={canReaderReserve}
                isBlocked={isBlocked}
                activeReservation={activeReservation}
                activeHold={activeHold}
                feedback={feedback}
                isReserving={reserveMutation.isPending}
                isHolding={holdMutation.isPending}
                onReserve={() => reserveMutation.mutate()}
                onHold={() => holdMutation.mutate()}
              />
            </aside>

            <main className="min-w-0 p-5 lg:p-6">
              <BookHero book={book} />
              <CopiesTable book={book} />
            </main>
          </section>

          <div className="border-t border-slate-200 bg-surface px-5 py-5">
            <RelatedBooks currentBookId={book._id} />
          </div>
        </div>

      </div>
    </div>,
    document.body,
  );
}
