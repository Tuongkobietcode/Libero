import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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

import { BookSidebar } from './sections/BookSidebar';
import { BookHero } from './sections/BookHero';
import { AvailabilityCard } from './sections/AvailabilityCard';
import { CopiesTable } from './sections/CopiesTable';
import { RelatedBooks } from './sections/RelatedBooks';

export default function BookDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const notify = useNotificationsStore((state) => state.push);
  const [feedback, setFeedback] = useState<string | null>(null);

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
      setFeedback('Đặt chỗ thành công. Bạn có thể theo dõi vị trí hàng chờ trong mục Đặt chỗ.');
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

  return (
    <div className="flex flex-col gap-4 py-2">
      <Link
        to="/search"
        className="inline-flex w-fit items-center gap-2 rounded-lg px-1 py-1 text-sm font-semibold text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Quay lại tìm kiếm
      </Link>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <BookSidebar book={book} />

        <main className="flex min-w-0 flex-col gap-6">
          <Card padding="lg">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <BookHero book={book} />
              <div className="xl:border-l xl:border-slate-100 xl:pl-6">
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
              </div>
            </div>
          </Card>

          <CopiesTable book={book} />
          <RelatedBooks currentBookId={book._id} />
        </main>
      </div>
    </div>
  );
}
