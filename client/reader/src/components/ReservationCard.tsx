import { useCountdown } from '../hooks/useCountdown';
import type { ReservationListItem } from '../types/models';
import { ReservationStatus } from '../types/models';
import { getStatusLabel } from '../utils/display';
import { formatDateTime } from '../utils/format';

interface ReservationCardProps {
  reservation: ReservationListItem;
  onCancel?: (reservationId: string) => void;
  canceling?: boolean;
}

function getReservationBadgeClass(status: ReservationStatus): string {
  if (status === ReservationStatus.Waiting) {
    return 'info';
  }

  if (status === ReservationStatus.Notified) {
    return 'warning';
  }

  if (status === ReservationStatus.Fulfilled) {
    return 'success';
  }

  if (status === ReservationStatus.Cancelled || status === ReservationStatus.Expired) {
    return 'muted';
  }

  return 'muted';
}

export default function ReservationCard({ reservation, onCancel, canceling }: ReservationCardProps) {
  const countdown = useCountdown(reservation.holdExpiryAt);
  const canCancel =
    reservation.status === ReservationStatus.Waiting || reservation.status === ReservationStatus.Notified;

  return (
    <article className="list-card">
      <div className="card-header">
        <div>
          <h3 className="list-card-title">{reservation.book.title}</h3>
          <p className="list-card-subtitle">Yeu cau luc {formatDateTime(reservation.requestDate)}</p>
        </div>
        <span className={`badge ${getReservationBadgeClass(reservation.status)}`}>{getStatusLabel(reservation.status)}</span>
      </div>

      <div className="meta-list">
        <div className="meta-row">
          <span className="meta-label">Vi tri hang cho</span>
          <span>#{reservation.queuePosition}</span>
        </div>
        {reservation.notifiedAt ? (
          <div className="meta-row">
            <span className="meta-label">Da thong bao</span>
            <span>{formatDateTime(reservation.notifiedAt)}</span>
          </div>
        ) : null}
        {reservation.holdExpiryAt ? (
          <div className="meta-row">
            <span className="meta-label">Han giu sach</span>
            <span>{formatDateTime(reservation.holdExpiryAt)}</span>
          </div>
        ) : null}
        {reservation.status === ReservationStatus.Notified ? (
          <div className="notice">
            {countdown.isExpired
              ? 'Thoi gian giu sach da het. He thong se cap nhat hang cho sau.'
              : `Con lai ${countdown.label} de den thu vien nhan sach.`}
          </div>
        ) : null}
      </div>

      {canCancel ? (
        <div className="action-row" style={{ marginTop: 16 }}>
          <button className="button secondary" type="button" onClick={() => onCancel?.(reservation._id)} disabled={canceling}>
            {canceling ? 'Dang huy...' : 'Huy yeu cau'}
          </button>
        </div>
      ) : null}
    </article>
  );
}
