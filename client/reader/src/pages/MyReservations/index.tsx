import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookHoldApi } from '../../services/bookHold.api';
import { reservationApi } from '../../services/reservation.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { BookHoldStatus, ReservationStatus } from '../../types/models';
import { extractErrorMessage } from '../../utils/format';
import { ActiveHoldsSection } from './components/ActiveHoldsSection';
import { ActiveReservationsSection } from './components/ActiveReservationsSection';
import { AdvanceTabs } from './components/AdvanceTabs';
import { GuideModal } from './components/GuideModal';
import { HoldHistorySection } from './components/HoldHistorySection';
import { ReservationHistorySection } from './components/ReservationHistorySection';
import { ReservationOverviewSection } from './components/ReservationOverviewSection';
import {
  LIST_LIMIT,
  countExpiringSoon,
  getBookHoldCompletionDate,
  mapBookHold,
  mapReservation,
  type AdvanceTab,
} from './reservationView';

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [activeTab, setActiveTab] = useState<AdvanceTab>('holds');
  const [guideType, setGuideType] = useState<AdvanceTab | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const activeHoldsQuery = useQuery({
    queryKey: ['reader-my-book-holds', 'active'],
    queryFn: () => bookHoldApi.listMyHolds({ status: BookHoldStatus.Active, page: 1, limit: LIST_LIMIT }),
  });

  const fulfilledHoldsQuery = useQuery({
    queryKey: ['reader-my-book-holds', BookHoldStatus.Fulfilled],
    queryFn: () => bookHoldApi.listMyHolds({ status: BookHoldStatus.Fulfilled, page: 1, limit: LIST_LIMIT }),
  });

  const cancelledHoldsQuery = useQuery({
    queryKey: ['reader-my-book-holds', BookHoldStatus.Cancelled],
    queryFn: () => bookHoldApi.listMyHolds({ status: BookHoldStatus.Cancelled, page: 1, limit: LIST_LIMIT }),
  });

  const expiredHoldsQuery = useQuery({
    queryKey: ['reader-my-book-holds', BookHoldStatus.Expired],
    queryFn: () => bookHoldApi.listMyHolds({ status: BookHoldStatus.Expired, page: 1, limit: LIST_LIMIT }),
  });

  const activeReservationsQuery = useQuery({
    queryKey: ['reader-my-reservations', 'active', 1],
    queryFn: () => reservationApi.listMyReservations({ scope: 'active', page: 1, limit: LIST_LIMIT }),
  });

  const historyReservationsQuery = useQuery({
    queryKey: ['reader-my-reservations', 'history', 1],
    queryFn: () => reservationApi.listMyReservations({ scope: 'history', page: 1, limit: LIST_LIMIT }),
  });

  const cancelHoldMutation = useMutation({
    mutationFn: (holdId: string) => bookHoldApi.cancelHold(holdId),
    onSuccess: () => {
      setFeedback('Đã hủy yêu cầu đặt giữ thành công.');
      void queryClient.invalidateQueries({ queryKey: ['reader-my-book-holds'] });
      void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail-active-holds'] });
      void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['reader', 'search-books'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể hủy yêu cầu đặt giữ lúc này.'),
      });
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: (reservationId: string) => reservationApi.cancelReservation(reservationId),
    onSuccess: () => {
      setFeedback('Đã hủy yêu cầu đặt chỗ thành công.');
      void queryClient.invalidateQueries({ queryKey: ['reader-my-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reader', 'my-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reader-book-detail-active-reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['reader', 'book-detail-active-reservations'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể hủy yêu cầu đặt chỗ lúc này.'),
      });
    },
  });

  useEffect(() => {
    if (
      activeHoldsQuery.isError ||
      fulfilledHoldsQuery.isError ||
      cancelledHoldsQuery.isError ||
      expiredHoldsQuery.isError
    ) {
      notify({
        level: 'error',
        message: extractErrorMessage(
          activeHoldsQuery.error ?? fulfilledHoldsQuery.error ?? cancelledHoldsQuery.error ?? expiredHoldsQuery.error,
          'Không thể tải danh sách đặt giữ.',
        ),
      });
    }
  }, [
    activeHoldsQuery.error,
    activeHoldsQuery.isError,
    fulfilledHoldsQuery.error,
    fulfilledHoldsQuery.isError,
    cancelledHoldsQuery.error,
    cancelledHoldsQuery.isError,
    expiredHoldsQuery.error,
    expiredHoldsQuery.isError,
    notify,
  ]);

  useEffect(() => {
    if (activeReservationsQuery.isError || historyReservationsQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(activeReservationsQuery.error ?? historyReservationsQuery.error, 'Không thể tải danh sách đặt chỗ.'),
      });
    }
  }, [
    activeReservationsQuery.error,
    activeReservationsQuery.isError,
    historyReservationsQuery.error,
    historyReservationsQuery.isError,
    notify,
  ]);

  const activeHolds = useMemo(
    () => (activeHoldsQuery.data?.items ?? []).map(mapBookHold),
    [activeHoldsQuery.data?.items],
  );
  const holdHistory = useMemo(() => {
    const historyItems = [
      ...(fulfilledHoldsQuery.data?.items ?? []),
      ...(cancelledHoldsQuery.data?.items ?? []),
      ...(expiredHoldsQuery.data?.items ?? []),
    ];

    return historyItems
      .sort((left, right) => {
        const leftDate = getBookHoldCompletionDate(left) ?? left.updatedAt;
        const rightDate = getBookHoldCompletionDate(right) ?? right.updatedAt;
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
      })
      .map(mapBookHold);
  }, [cancelledHoldsQuery.data?.items, expiredHoldsQuery.data?.items, fulfilledHoldsQuery.data?.items]);
  const activeReservations = useMemo(
    () => (activeReservationsQuery.data?.items ?? []).map(mapReservation),
    [activeReservationsQuery.data?.items],
  );
  const reservationHistory = useMemo(
    () => (historyReservationsQuery.data?.items ?? []).map(mapReservation),
    [historyReservationsQuery.data?.items],
  );

  const holdSummary = useMemo(
    () => ({
      active: activeHolds.length,
      expiring: countExpiringSoon(activeHolds),
      history: holdHistory.length,
    }),
    [activeHolds, holdHistory.length],
  );
  const reservationSummary = useMemo(
    () => ({
      waiting: activeReservations.filter((reservation) => reservation.status === ReservationStatus.Waiting).length,
      notified: activeReservations.filter((reservation) => reservation.status === ReservationStatus.Notified).length,
      history: reservationHistory.length,
    }),
    [activeReservations, reservationHistory.length],
  );

  const isHoldTab = activeTab === 'holds';

  return (
    <div className="flex flex-col gap-6 py-7">
      <AdvanceTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          setFeedback(null);
        }}
      />

      <ReservationOverviewSection
        activeTab={activeTab}
        holdSummary={holdSummary}
        reservationSummary={reservationSummary}
        onOpenGuide={() => setGuideType(activeTab)}
      />

      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{feedback}</div>
      ) : null}

      {isHoldTab ? (
        <>
          <ActiveHoldsSection
            holds={activeHolds}
            loading={activeHoldsQuery.isLoading}
            onCancel={(holdId) => cancelHoldMutation.mutate(holdId)}
            cancelingHoldId={cancelHoldMutation.isPending ? cancelHoldMutation.variables : undefined}
          />
          <HoldHistorySection
            holds={holdHistory}
            loading={fulfilledHoldsQuery.isLoading || cancelledHoldsQuery.isLoading || expiredHoldsQuery.isLoading}
          />
        </>
      ) : (
        <>
          <ActiveReservationsSection
            reservations={activeReservations}
            loading={activeReservationsQuery.isLoading}
            onCancel={(reservationId) => cancelReservationMutation.mutate(reservationId)}
            cancelingReservationId={cancelReservationMutation.isPending ? cancelReservationMutation.variables : undefined}
          />
          <ReservationHistorySection reservations={reservationHistory} loading={historyReservationsQuery.isLoading} />
        </>
      )}

      <GuideModal type={guideType} onClose={() => setGuideType(null)} />
    </div>
  );
}
