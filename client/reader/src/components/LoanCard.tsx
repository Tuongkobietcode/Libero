import type { LoanListItem } from '../types/models';
import { LoanStatus } from '../types/models';
import { getStatusLabel } from '../utils/display';
import { daysUntil, formatCurrency, formatDate, formatDateTime } from '../utils/format';

interface LoanCardProps {
  loan: LoanListItem;
  onRenew?: (loanId: string) => void;
  renewing?: boolean;
  renewDisabled?: boolean;
  renewDisabledReason?: string;
}

function getLoanBadgeClass(status: LoanStatus): string {
  if (status === LoanStatus.Active) {
    return 'info';
  }

  if (status === LoanStatus.Overdue) {
    return 'danger';
  }

  if (status === LoanStatus.Returned) {
    return 'success';
  }

  return 'muted';
}

export default function LoanCard({
  loan,
  onRenew,
  renewing,
  renewDisabled = false,
  renewDisabledReason,
}: LoanCardProps) {
  const daysLeft = daysUntil(loan.dueDate);
  const canShowRenewButton = loan.status === LoanStatus.Active;

  return (
    <article className="list-card">
      <div className="card-header">
        <div>
          <h3 className="list-card-title">{loan.book.title}</h3>
          <p className="list-card-subtitle">Ma sach: {loan.copy.barcode} • Han tra: {formatDateTime(loan.dueDate)}</p>
        </div>
        <span className={`badge ${getLoanBadgeClass(loan.status)}`}>{getStatusLabel(loan.status)}</span>
      </div>

      <div className="meta-list">
        <div className="meta-row">
          <span className="meta-label">Ngay muon</span>
          <span>{formatDate(loan.checkoutDate)}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Gia han</span>
          <span>
            {loan.renewCount}/{loan.policyMaxRenewals} lan
          </span>
        </div>
        <div className="meta-row">
          <span className="meta-label">Tien phat chua thanh toan</span>
          <span>{formatCurrency(loan.unpaidFineTotal)}</span>
        </div>
        {daysLeft !== null ? (
          <div className="meta-row">
            <span className="meta-label">Tinh trang han</span>
            <span>
              {daysLeft >= 0 ? `Con ${daysLeft} ngay` : `Tre ${Math.abs(daysLeft)} ngay`}
            </span>
          </div>
        ) : null}
      </div>

      {canShowRenewButton ? (
        <>
          <div className="action-row" style={{ marginTop: 16 }}>
            <button
              className="button"
              type="button"
              onClick={() => onRenew?.(loan._id)}
              disabled={!onRenew || renewDisabled || renewing}
              title={renewDisabledReason}
            >
              {renewing ? 'Dang xu ly...' : 'Gia han'}
            </button>
          </div>
          {renewDisabledReason ? <p className="text-muted" style={{ marginTop: 10 }}>{renewDisabledReason}</p> : null}
        </>
      ) : null}
    </article>
  );
}
