import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { fineApi } from '../../services/fine.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { FineStatus } from '../../types/models';
import { extractErrorMessage } from '../../utils/format';
import { FineHistorySection } from './components/FineHistorySection';
import { FinePolicyModal } from './components/FinePolicyModal';
import { FineOverviewSection } from './components/FineOverviewSection';
import { UnpaidFinesSection } from './components/UnpaidFinesSection';
import { LIST_LIMIT, mapFine } from './fineView';

export default function MyFinesPage() {
  const { user } = useAuth();
  const notify = useNotificationsStore((state) => state.push);
  const [guideOpen, setGuideOpen] = useState(false);
  const [unpaidPage, setUnpaidPage] = useState(1);

  const unpaidFinesQuery = useQuery({
    queryKey: ['reader-my-fines', FineStatus.Unpaid, unpaidPage],
    queryFn: () => fineApi.getMyFines({ status: FineStatus.Unpaid, page: unpaidPage, limit: LIST_LIMIT }),
  });

  const paidFinesQuery = useQuery({
    queryKey: ['reader-my-fines', FineStatus.Paid],
    queryFn: () => fineApi.getMyFines({ status: FineStatus.Paid, page: 1, limit: LIST_LIMIT }),
  });

  const waivedFinesQuery = useQuery({
    queryKey: ['reader-my-fines', FineStatus.Waived],
    queryFn: () => fineApi.getMyFines({ status: FineStatus.Waived, page: 1, limit: LIST_LIMIT }),
  });

  useEffect(() => {
    if (unpaidFinesQuery.isError || paidFinesQuery.isError || waivedFinesQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(
          unpaidFinesQuery.error ?? paidFinesQuery.error ?? waivedFinesQuery.error,
          'Không thể tải danh sách tiền phạt.',
        ),
      });
    }
  }, [
    notify,
    paidFinesQuery.error,
    paidFinesQuery.isError,
    unpaidFinesQuery.error,
    unpaidFinesQuery.isError,
    waivedFinesQuery.error,
    waivedFinesQuery.isError,
  ]);

  const unpaidFines = useMemo(
    () => (unpaidFinesQuery.data?.items ?? []).map(mapFine),
    [unpaidFinesQuery.data?.items],
  );

  const historyFines = useMemo(() => {
    const items = [
      ...(paidFinesQuery.data?.items ?? []),
      ...(waivedFinesQuery.data?.items ?? []),
    ];

    return items
      .sort((left, right) => {
        const leftDate = left.paidAt ?? left.createdAt;
        const rightDate = right.paidAt ?? right.createdAt;
        return new Date(rightDate).getTime() - new Date(leftDate).getTime();
      })
      .map(mapFine);
  }, [paidFinesQuery.data?.items, waivedFinesQuery.data?.items]);

  const summary = unpaidFinesQuery.data?.summary ?? paidFinesQuery.data?.summary ?? waivedFinesQuery.data?.summary;
  const unpaidTotalItems = unpaidFinesQuery.data?.pagination.totalItems ?? unpaidFines.length;
  const unpaidTotalPages = unpaidFinesQuery.data?.pagination.totalPages ?? 1;
  const paidTotalItems = paidFinesQuery.data?.pagination.totalItems ?? 0;
  const waivedTotalItems = waivedFinesQuery.data?.pagination.totalItems ?? 0;
  const historyTotalItems = paidTotalItems + waivedTotalItems;
  const showBlockedWarning = Boolean(user?.isBlocked);

  return (
    <div className="flex flex-col gap-6 py-7">
      <FineOverviewSection
        showBlockedWarning={showBlockedWarning}
        unpaidTotal={summary?.unpaidTotal ?? 0}
        unpaidCount={unpaidTotalItems}
        paidTotal={summary?.paidTotal ?? 0}
        paidCount={paidTotalItems}
        waivedTotal={summary?.waivedTotal ?? 0}
        waivedCount={waivedTotalItems}
        onOpenGuide={() => setGuideOpen(true)}
      />

      <UnpaidFinesSection
        fines={unpaidFines}
        loading={unpaidFinesQuery.isLoading}
        page={unpaidPage}
        totalItems={unpaidTotalItems}
        totalPages={unpaidTotalPages}
        onPageChange={setUnpaidPage}
      />

      <FineHistorySection
        fines={historyFines}
        loading={paidFinesQuery.isLoading || waivedFinesQuery.isLoading}
        totalItems={historyTotalItems}
      />

      <FinePolicyModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
