import { Clock3, History } from 'lucide-react';

import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { getStatusLabel } from '../../../utils/display';
import { formatDateTime } from '../../../utils/format';
import { getReservationStatusTone, type ReservationView } from '../reservationView';

function RequestStatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.06em] ${className}`}>
      {label}
    </span>
  );
}

export function ReservationHistorySection({
  reservations,
  loading,
}: {
  reservations: ReservationView[];
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex items-center gap-3">
        <History className="h-6 w-6 text-slate-400" aria-hidden="true" />
        <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Lịch sử đặt chỗ</h2>
      </div>

      {loading ? (
        <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" />
      ) : reservations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                <th className="px-4 py-4">Tác phẩm</th>
                <th className="px-4 py-4">Vị trí hàng chờ</th>
                <th className="px-4 py-4">Ngày đặt chỗ</th>
                <th className="px-4 py-4">Mốc xử lý</th>
                <th className="px-4 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => {
                const tone = getReservationStatusTone(reservation.status);

                return (
                  <tr className="border-b border-slate-100 last:border-b-0" key={reservation.id}>
                    <td className="max-w-[360px] px-4 py-4 text-sm font-bold text-slate-950">{reservation.title}</td>
                    <td className="px-4 py-4 font-mono text-sm font-semibold text-slate-600">
                      #{reservation.queuePosition} / {reservation.queueTotal}
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-slate-600">{formatDateTime(reservation.source.requestDate)}</td>
                    <td className="px-4 py-4 font-mono text-sm text-slate-600">{reservation.completedDate}</td>
                    <td className="px-4 py-4">
                      <RequestStatusBadge label={getStatusLabel(reservation.status)} className={tone.badge} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ReaderEmptyState
          icon={Clock3}
          title="Chưa có lịch sử đặt chỗ"
          description="Các yêu cầu đã hoàn tất, đã hủy hoặc hết hạn sẽ được ghi lại tại đây."
        />
      )}
    </section>
  );
}
