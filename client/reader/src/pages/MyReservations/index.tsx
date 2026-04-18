import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import ReservationCard from '../../components/ReservationCard';
import { reservationApi } from '../../services/reservation.api';
import type { ReservationScope } from '../../types/models';
import { getReservationScopeLabel } from '../../utils/display';
import { extractErrorMessage } from '../../utils/format';

const PAGE_SIZE = 10;

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
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
      setFeedback('Da huy yeu cau dat cho thanh cong.');
      void queryClient.invalidateQueries({ queryKey: ['reader-my-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reader-book-detail-active-reservations'] });
    },
    onError: (error) => {
      setFeedback(extractErrorMessage(error, 'Khong the huy yeu cau dat cho luc nay.'));
    },
  });
  const reservations = reservationsQuery.data;

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-header">
          <div>
            <h1 className="page-title">Dat cho cua toi</h1>
            <p className="page-description">Theo doi vi tri hang cho, thoi gian giu sach va lich su cac yeu cau da xu ly.</p>
          </div>
          <div className="filter-row">
            <select value={scope} onChange={(event) => { setScope(event.target.value as ReservationScope); setPage(1); }}>
              <option value="active">{getReservationScopeLabel('active')}</option>
              <option value="history">{getReservationScopeLabel('history')}</option>
              <option value="all">{getReservationScopeLabel('all')}</option>
            </select>
          </div>
        </div>

        {feedback ? <div className={cancelMutation.isError ? 'error-banner' : 'success-banner'}>{feedback}</div> : null}
      </section>

      <section className="card">
        {reservationsQuery.isLoading ? <div className="loading-state">Dang tai dat cho...</div> : null}
        {reservationsQuery.isError ? (
          <div className="error-banner">{extractErrorMessage(reservationsQuery.error, 'Khong the tai danh sach dat cho.')}</div>
        ) : null}
        {!reservationsQuery.isLoading && !reservationsQuery.isError ? (
          reservations && reservations.items.length > 0 ? (
            <>
              <div className="reservation-list">
                {reservations.items.map((reservation) => (
                  <ReservationCard
                    key={reservation._id}
                    reservation={reservation}
                    onCancel={(reservationId) => cancelMutation.mutate(reservationId)}
                    canceling={cancelMutation.isPending && cancelMutation.variables === reservation._id}
                  />
                ))}
              </div>

              <div className="pagination" style={{ marginTop: 20 }}>
                <button className="button secondary" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                  Trang truoc
                </button>
                <span className="text-muted">
                  Trang {reservationsQuery.data.pagination.page} / {reservationsQuery.data.pagination.totalPages || 1}
                </span>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= (reservations.pagination.totalPages || 1)}
                >
                  Trang sau
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Khong co yeu cau dat cho nao</h3>
              <p className="page-description">Khi mot dau sach het ban sao available, ban co the dat cho tu trang chi tiet sach.</p>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
