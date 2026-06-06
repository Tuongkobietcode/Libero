import { Clock3, History } from 'lucide-react';

import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { FineStatus } from '../../../types/models';
import { getStatusLabel } from '../../../utils/display';
import { formatAmount, getFineStatusTone, type FineView } from '../fineView';

function FineStatusBadge({ status }: { status: FineStatus }) {
  const tone = getFineStatusTone(status);

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.06em] ${tone.badge}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export function FineHistorySection({
  fines,
  loading,
  totalItems,
}: {
  fines: FineView[];
  loading: boolean;
  totalItems: number;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-slate-400" aria-hidden="true" />
          <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Lịch sử tiền phạt</h2>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-bold text-slate-500">{totalItems} khoản</span>
      </div>

      {loading ? (
        <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" />
      ) : fines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                <th className="px-4 py-4">Tác phẩm</th>
                <th className="px-4 py-4">Lý do</th>
                <th className="px-4 py-4">Ngày phát sinh</th>
                <th className="px-4 py-4">Mốc xử lý</th>
                <th className="px-4 py-4">Số tiền</th>
                <th className="px-4 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {fines.map((fine) => {
                const tone = getFineStatusTone(fine.status);

                return (
                  <tr className="border-b border-slate-100 last:border-b-0" key={fine.id}>
                    <td className="max-w-[340px] px-4 py-4">
                      <p className="m-0 text-sm font-bold text-slate-950">{fine.title}</p>
                      <p className="m-0 mt-1 text-xs font-semibold text-slate-400">{fine.author}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-600">{fine.reason}</td>
                    <td className="px-4 py-4 font-mono text-sm text-slate-600">{fine.createdDate}</td>
                    <td className="px-4 py-4 font-mono text-sm text-slate-600">{fine.resolvedDate}</td>
                    <td className={`px-4 py-4 font-mono text-sm font-black ${tone.amount}`}>{formatAmount(fine.amount)}</td>
                    <td className="px-4 py-4">
                      <FineStatusBadge status={fine.status} />
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
          title="Chưa có lịch sử tiền phạt"
          description="Các khoản đã thanh toán hoặc đã miễn giảm sẽ được ghi lại tại đây."
        />
      )}
    </section>
  );
}
