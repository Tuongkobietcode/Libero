import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import LoanCard from '../../components/LoanCard';
import { useAuth } from '../../hooks/useAuth';
import { loanApi } from '../../services/loan.api';
import { LoanStatus, MemberStatus } from '../../types/models';
import { extractErrorMessage } from '../../utils/format';

const PAGE_SIZE = 10;

function buildRenewDisabledReason(
  status: LoanStatus,
  renewCount: number,
  maxRenewals: number,
  memberStatus?: MemberStatus,
  isBlocked?: boolean,
): string | undefined {
  if (status !== LoanStatus.Active) {
    return 'Chi co the gia han phieu muon dang hoat dong.';
  }

  if (memberStatus && memberStatus !== MemberStatus.Active) {
    return 'Tai khoan hien tai khong du dieu kien de gia han.';
  }

  if (isBlocked) {
    return 'Tai khoan cua ban dang bi khoa nen khong the gia han them.';
  }

  if (renewCount >= maxRenewals) {
    return 'Ban da dung het so lan gia han cho phep.';
  }

  return undefined;
}

export default function MyLoansPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loansQuery = useQuery({
    queryKey: ['reader-my-loans', statusFilter, page],
    queryFn: () =>
      loanApi.listMyLoans({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: PAGE_SIZE,
      }),
  });

  const renewMutation = useMutation({
    mutationFn: (loanId: string) => loanApi.renewLoan(loanId),
    onSuccess: () => {
      setFeedback('Gia han thanh cong. Han tra da duoc cap nhat theo chinh sach hien hanh.');
      void queryClient.invalidateQueries({ queryKey: ['reader-my-loans'] });
    },
    onError: (error) => {
      setFeedback(extractErrorMessage(error, 'Khong the gia han phieu muon nay.'));
    },
  });

  const hint = useMemo(
    () => 'Neu dau sach dang co yeu cau dat cho, backend co the tu choi gia han du button van mo.',
    [],
  );
  const loans = loansQuery.data;

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-header">
          <div>
            <h1 className="page-title">Sach dang muon</h1>
            <p className="page-description">Theo doi han tra, so lan gia han con lai va xu ly gia han ngay trong trang ca nhan.</p>
          </div>
          <div className="filter-row">
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | LoanStatus); setPage(1); }}>
              <option value="all">Tat ca</option>
              <option value={LoanStatus.Active}>Dang muon</option>
              <option value={LoanStatus.Overdue}>Qua han</option>
              <option value={LoanStatus.Returned}>Da tra</option>
              <option value={LoanStatus.Lost}>Mat sach</option>
            </select>
          </div>
        </div>

        <div className="notice">{hint}</div>
        {feedback ? <div className={renewMutation.isError ? 'error-banner' : 'success-banner'}>{feedback}</div> : null}
      </section>

      <section className="card">
        {loansQuery.isLoading ? <div className="loading-state">Dang tai danh sach phieu muon...</div> : null}
        {loansQuery.isError ? (
          <div className="error-banner">{extractErrorMessage(loansQuery.error, 'Khong the tai danh sach phieu muon.')}</div>
        ) : null}
        {!loansQuery.isLoading && !loansQuery.isError ? (
          loans && loans.items.length > 0 ? (
            <>
              <div className="loan-list">
                {loans.items.map((loan) => {
                  const disabledReason = buildRenewDisabledReason(
                    loan.status,
                    loan.renewCount,
                    loan.policyMaxRenewals,
                    user?.status,
                    user?.isBlocked,
                  );

                  return (
                    <LoanCard
                      key={loan._id}
                      loan={loan}
                      onRenew={(loanId) => renewMutation.mutate(loanId)}
                      renewing={renewMutation.isPending && renewMutation.variables === loan._id}
                      renewDisabled={Boolean(disabledReason)}
                      renewDisabledReason={disabledReason}
                    />
                  );
                })}
              </div>

              <div className="pagination" style={{ marginTop: 20 }}>
                <button className="button secondary" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                  Trang truoc
                </button>
                <span className="text-muted">
                  Trang {loansQuery.data.pagination.page} / {loansQuery.data.pagination.totalPages || 1}
                </span>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= (loans.pagination.totalPages || 1)}
                >
                  Trang sau
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Ban chua co phieu muon nao</h3>
              <p className="page-description">Khi muon sach tai thu vien, danh sach phieu muon cua ban se hien thi o day.</p>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
