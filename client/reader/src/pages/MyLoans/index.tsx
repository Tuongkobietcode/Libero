import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { loanApi } from '../../services/loan.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { LoanStatus } from '../../types/models';
import { daysUntil, extractErrorMessage } from '../../utils/format';
import { ActiveLoansSection } from './components/ActiveLoansSection';
import { LoanHistorySection } from './components/LoanHistorySection';
import { LoanOverviewSection } from './components/LoanOverviewSection';
import { PolicyGuideModal } from './components/PolicyGuideModal';
import { PAGE_SIZE, buildRenewDisabledReason, toLoanView } from './loanView';

export default function MyLoansPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const notify = useNotificationsStore((state) => state.push);
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const loansQuery = useQuery({
    queryKey: ['reader-my-loans', page],
    queryFn: () =>
      loanApi.listMyLoans({
        page,
        limit: PAGE_SIZE,
      }),
  });

  const renewMutation = useMutation({
    mutationFn: (loanId: string) => loanApi.renewLoan(loanId),
    onSuccess: () => {
      setFeedback('Gia hạn thành công. Hạn trả đã được cập nhật theo chính sách hiện hành.');
      void queryClient.invalidateQueries({ queryKey: ['reader-my-loans'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể gia hạn phiếu mượn này.'),
      });
    },
  });

  const loans = loansQuery.data;

  useEffect(() => {
    if (loansQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(loansQuery.error, 'Không thể tải danh sách phiếu mượn.'),
      });
    }
  }, [loansQuery.error, loansQuery.isError, notify]);

  const loanViews = useMemo(() => {
    if (!loans) {
      return [];
    }

    return loans.items.map((loan) => {
      const disabledReason =
        loan.status === LoanStatus.Active
          ? buildRenewDisabledReason(
              loan.status,
              loan.renewCount,
              loan.policyMaxRenewals,
              user?.status,
              user?.isBlocked,
            )
          : loan.status === LoanStatus.Overdue
            ? 'Vui lòng trả sách sớm. Trả trễ có thể bị phạt.'
            : loan.status === LoanStatus.Lost
              ? 'Phiếu mượn đã ghi nhận mất sách. Vui lòng liên hệ thủ thư để xử lý bồi hoàn.'
              : undefined;

      return toLoanView(loan, disabledReason);
    });
  }, [loans, user?.isBlocked, user?.status]);

  const activeLoanViews = loanViews.filter((view) => view.status !== LoanStatus.Returned);
  const overdueCount = loanViews.filter((view) => view.status === LoanStatus.Overdue).length;
  const dueSoonCount = loanViews.filter((view) => {
    if (view.status !== LoanStatus.Active || !view.source) {
      return false;
    }
    const days = daysUntil(view.source.dueDate);
    return days !== null && days >= 0 && days <= 3;
  }).length;
  const sampleLoan = activeLoanViews[0]?.source ?? loanViews[0]?.source;

  return (
    <div className="flex flex-col gap-6 py-7">
      <LoanOverviewSection
        activeCount={activeLoanViews.length}
        dueSoonCount={dueSoonCount}
        overdueCount={overdueCount}
        onOpenGuide={() => setGuideOpen(true)}
      />

      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{feedback}</div>
      ) : null}

      <ActiveLoansSection
        loans={activeLoanViews}
        loading={loansQuery.isLoading}
        onRenew={(loanId) => renewMutation.mutate(loanId)}
        renewingLoanId={renewMutation.isPending ? renewMutation.variables : undefined}
      />

      <LoanHistorySection loans={loanViews} loading={loansQuery.isLoading} />

      {loans && loans.pagination.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
          <button
            className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
          >
            Trang trước
          </button>
          <span className="font-mono text-sm text-slate-500">
            Trang {loans.pagination.page} / {loans.pagination.totalPages || 1}
          </span>
          <button
            className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:border-brand-200 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={() => setPage((current) => current + 1)}
            disabled={page >= (loans.pagination.totalPages || 1)}
          >
            Trang sau
          </button>
        </div>
      ) : null}

      <PolicyGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} sampleLoan={sampleLoan} />
    </div>
  );
}
