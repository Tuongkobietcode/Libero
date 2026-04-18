import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import FineCard from '../../components/FineCard';
import { useAuth } from '../../hooks/useAuth';
import { fineApi } from '../../services/fine.api';
import { FineStatus } from '../../types/models';
import { extractErrorMessage, formatCurrency } from '../../utils/format';

const PAGE_SIZE = 10;

export default function MyFinesPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'all' | FineStatus>('all');
  const [page, setPage] = useState(1);

  const finesQuery = useQuery({
    queryKey: ['reader-my-fines', statusFilter, page],
    queryFn: () =>
      fineApi.getMyFines({
        status: statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit: PAGE_SIZE,
      }),
  });
  const fines = finesQuery.data;

  return (
    <div className="page-stack">
      <section className="card">
        <div className="card-header">
          <div>
            <h1 className="page-title">Tien phat cua toi</h1>
            <p className="page-description">Reader chi xem cong no va lich su xu ly. Thanh toan va mien phat duoc thuc hien tai thu vien.</p>
          </div>
          <div className="filter-row">
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as 'all' | FineStatus); setPage(1); }}>
              <option value="all">Tat ca</option>
              <option value={FineStatus.Unpaid}>Chua thanh toan</option>
              <option value={FineStatus.Paid}>Da thanh toan</option>
              <option value={FineStatus.Waived}>Da mien</option>
            </select>
          </div>
        </div>

        {user?.isBlocked ? (
          <div className="warning-banner">
            Tai khoan cua ban dang bi han che muon sach vi tong tien phat chua thanh toan vuot nguong cho phep.
          </div>
        ) : null}

        {finesQuery.data ? (
          <div className="summary-grid">
            <div className="list-card">
              <h3 className="list-card-title">Chua thanh toan</h3>
              <p className="list-card-subtitle">{formatCurrency(finesQuery.data.summary.unpaidTotal)}</p>
            </div>
            <div className="list-card">
              <h3 className="list-card-title">Da thanh toan</h3>
              <p className="list-card-subtitle">{formatCurrency(finesQuery.data.summary.paidTotal)}</p>
            </div>
            <div className="list-card">
              <h3 className="list-card-title">Da mien</h3>
              <p className="list-card-subtitle">{formatCurrency(finesQuery.data.summary.waivedTotal)}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="card">
        {finesQuery.isLoading ? <div className="loading-state">Dang tai tien phat...</div> : null}
        {finesQuery.isError ? (
          <div className="error-banner">{extractErrorMessage(finesQuery.error, 'Khong the tai danh sach tien phat.')}</div>
        ) : null}
        {!finesQuery.isLoading && !finesQuery.isError ? (
          fines && fines.items.length > 0 ? (
            <>
              <div className="fine-list">
                {fines.items.map((fine) => (
                  <FineCard key={fine._id} fine={fine} />
                ))}
              </div>

              <div className="pagination" style={{ marginTop: 20 }}>
                <button className="button secondary" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                  Trang truoc
                </button>
                <span className="text-muted">
                  Trang {finesQuery.data.pagination.page} / {finesQuery.data.pagination.totalPages || 1}
                </span>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= (fines.pagination.totalPages || 1)}
                >
                  Trang sau
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <h3>Khong co ban ghi tien phat nao</h3>
              <p className="page-description">Khi phat sinh tien phat qua han hoac boi thuong, danh sach se hien thi tai day.</p>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
