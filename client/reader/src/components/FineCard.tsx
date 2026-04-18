import type { FineListItem } from '../types/models';
import { FineStatus } from '../types/models';
import { getStatusLabel } from '../utils/display';
import { formatCurrency, formatDate } from '../utils/format';

interface FineCardProps {
  fine: FineListItem;
}

function getFineBadgeClass(status: FineStatus): string {
  if (status === FineStatus.Unpaid) {
    return 'danger';
  }

  if (status === FineStatus.Paid) {
    return 'success';
  }

  return 'muted';
}

export default function FineCard({ fine }: FineCardProps) {
  return (
    <article className="list-card">
      <div className="card-header">
        <div>
          <h3 className="list-card-title">{fine.book.title}</h3>
          <p className="list-card-subtitle">Ngay qua han: {formatDate(fine.overdueDate)}</p>
        </div>
        <span className={`badge ${getFineBadgeClass(fine.status)}`}>{getStatusLabel(fine.status)}</span>
      </div>

      <div className="meta-list">
        <div className="meta-row">
          <span className="meta-label">So tien</span>
          <span>{formatCurrency(fine.amount)}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">ISBN</span>
          <span>{fine.book.isbn}</span>
        </div>
        {fine.note ? (
          <div className="meta-row">
            <span className="meta-label">Ghi chu</span>
            <span>{fine.note}</span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
