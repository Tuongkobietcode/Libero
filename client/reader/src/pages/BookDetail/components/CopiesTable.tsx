import { MapPin } from 'lucide-react';

import type { BookDetail } from '../../../types/models';
import { CopyStatus } from '../../../types/models';

interface CopiesTableProps {
  book: BookDetail;
}

function statusLabel(status: CopyStatus): string {
  if (status === CopyStatus.Available) return 'Có sẵn';
  if (status === CopyStatus.Borrowed) return 'Đang mượn';
  if (status === CopyStatus.Reserved) return 'Đang giữ chỗ';
  if (status === CopyStatus.Damaged) return 'Bảo trì';
  if (status === CopyStatus.Lost) return 'Thất lạc';
  return status;
}

function statusClass(status: CopyStatus): string {
  if (status === CopyStatus.Available) return 'border-emerald-600 text-emerald-700 bg-emerald-50';
  if (status === CopyStatus.Borrowed) return 'border-blue-600 text-blue-700 bg-blue-50';
  if (status === CopyStatus.Reserved) return 'border-amber-500 text-amber-700 bg-amber-50';
  if (status === CopyStatus.Lost) return 'border-red-600 text-red-700 bg-red-50';
  return 'border-slate-500 text-slate-600 bg-slate-50';
}

function conditionLabel(status: CopyStatus): string {
  if (status === CopyStatus.Available) return 'Như mới';
  if (status === CopyStatus.Borrowed || status === CopyStatus.Reserved) return 'Tốt';
  if (status === CopyStatus.Damaged) return 'Rách gáy, cần đóng lại';
  if (status === CopyStatus.Lost) return 'Đang đối soát';
  return 'Cần kiểm tra';
}

export function CopiesTable({ book }: CopiesTableProps) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-base font-black uppercase tracking-[0.08em] text-slate-800">
        Kho bản sao vật lý ({book.copies.length})
      </h2>

      <div className="mt-3 overflow-hidden rounded-xl border-2 border-slate-950/90 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead className="border-b border-slate-500 bg-slate-50 text-xs font-black uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã barcode</th>
                <th className="px-4 py-3">Vị trí kệ</th>
                <th className="px-4 py-3">Tình trạng</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {book.copies.map((copy) => (
                <tr key={copy._id} className="text-sm font-medium text-slate-600">
                  <td className="px-4 py-3 font-mono font-black text-slate-700">{copy.barcode}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" aria-hidden />
                      {copy.shelfLocation || 'Đang cập nhật'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{conditionLabel(copy.status)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border-2 px-3 py-0.5 text-xs font-black ${statusClass(copy.status)}`}>
                      {statusLabel(copy.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
