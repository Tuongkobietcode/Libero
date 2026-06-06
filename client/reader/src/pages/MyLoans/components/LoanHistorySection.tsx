import { Clock3, History } from 'lucide-react';

import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { type LoanStatus as LoanStatusValue } from '../../../types/models';
import { formatDateTime } from '../../../utils/format';
import { getLoanTone, type LoanView } from '../loanView';

function LoanStatusBadge({ status, label }: { status: LoanStatusValue; label: string }) {
  const tone = getLoanTone(status);

  return (
    <span className={`inline-flex min-h-8 items-center rounded-full border px-4 text-xs font-black uppercase tracking-[0.06em] ${tone.status}`}>
      {label}
    </span>
  );
}

export function LoanHistorySection({ loans, loading }: { loans: LoanView[]; loading: boolean }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex items-center gap-3">
        <History className="h-6 w-6 text-slate-400" aria-hidden="true" />
        <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Lịch sử mượn</h2>
      </div>

      {loading ? (
        <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100" />
      ) : loans.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                <th className="px-4 py-4">Tác phẩm</th>
                <th className="px-4 py-4">Barcode bản sao</th>
                <th className="px-4 py-4">Ngày mượn</th>
                <th className="px-4 py-4">Ngày trả thực tế</th>
                <th className="px-4 py-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr className="border-b border-slate-100 last:border-b-0" key={loan.id}>
                  <td className="max-w-[360px] px-4 py-4 text-sm font-bold text-slate-950">{loan.title}</td>
                  <td className="px-4 py-4 font-mono text-sm font-semibold text-slate-600">{loan.code}</td>
                  <td className="px-4 py-4 font-mono text-sm text-slate-600">{loan.source ? formatDateTime(loan.source.checkoutDate) : '-'}</td>
                  <td className="px-4 py-4 text-sm font-medium text-slate-600">{loan.returnLabel}</td>
                  <td className="px-4 py-4">
                    <LoanStatusBadge status={loan.status} label={loan.statusLabel} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ReaderEmptyState
          icon={Clock3}
          title="Chưa có lịch sử mượn"
          description="Khi bạn mượn hoặc trả sách, dữ liệu sẽ được ghi lại tại đây."
        />
      )}
    </section>
  );
}
