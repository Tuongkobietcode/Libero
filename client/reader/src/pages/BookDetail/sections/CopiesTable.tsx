import type { BookDetail } from '../../../types/models';
import { Badge } from '../../../components/ui/Badge';
import { Card } from '../../../components/ui/Card';
import { CopyStatus } from '../../../types/models';
import { getStatusLabel } from '../../../utils/display';
import { formatDate } from '../../../utils/format';

interface CopiesTableProps {
  book: BookDetail;
}

function copyTone(status: CopyStatus): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === CopyStatus.Available) return 'success';
  if (status === CopyStatus.Borrowed) return 'danger';
  if (status === CopyStatus.Reserved) return 'warning';
  return 'neutral';
}

export function CopiesTable({ book }: CopiesTableProps) {
  return (
    <Card padding="md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-900">Danh sách bản sao</h2>
        <span className="text-sm text-slate-500">{book.copies.length} bản</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-bold">Mã bản sao</th>
              <th className="px-4 py-3 font-bold">Vị trí</th>
              <th className="px-4 py-3 font-bold">Tình trạng</th>
              <th className="px-4 py-3 font-bold">Ngày trả dự kiến</th>
              <th className="px-4 py-3 font-bold">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {book.copies.map((copy) => (
              <tr key={copy._id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-700">{copy.barcode}</td>
                <td className="px-4 py-3 text-slate-600">{copy.shelfLocation || '—'}</td>
                <td className="px-4 py-3">
                  <Badge tone={copyTone(copy.status)}>{getStatusLabel(copy.status)}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(copy.currentDueDate)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {copy.status === CopyStatus.Available ? 'Có thể mượn tại quầy' : 'Đang mượn'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
