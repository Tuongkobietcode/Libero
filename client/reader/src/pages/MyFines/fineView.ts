import { FineStatus, type FineListItem } from '../../types/models';
import { formatDate, formatDateTime, formatList } from '../../utils/format';

export const LIST_LIMIT = 100;

export type SummaryTone = 'red' | 'emerald' | 'blue' | 'slate';

export interface FineView {
  id: string;
  loanId: string;
  bookId: string;
  title: string;
  author: string;
  isbn: string;
  reason: string;
  amount: number;
  overdueDate: string;
  createdDate: string;
  resolvedDate: string;
  status: FineStatus;
  note: string;
  coverImage?: string;
  source: FineListItem;
}

export function formatAmount(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

export function getFineReason(fine: FineListItem): string {
  const note = fine.note?.toLowerCase() ?? '';

  if (fine.status === FineStatus.Waived) {
    return 'Miễn giảm tiền phạt';
  }

  if (note.includes('mất') || note.includes('lost')) {
    return 'Bồi thường mất sách';
  }

  return 'Trả sách trễ hạn';
}

export function mapFine(fine: FineListItem): FineView {
  const paidDate = fine.paidAt ? formatDateTime(fine.paidAt) : null;
  const waivedDate = fine.status === FineStatus.Waived ? formatDateTime(fine.createdAt) : null;

  return {
    id: fine._id,
    loanId: fine.loanId,
    bookId: fine.book._id,
    title: fine.book.title,
    author: formatList(fine.book.authors, 'Tác giả đang cập nhật'),
    isbn: fine.book.isbn,
    reason: getFineReason(fine),
    amount: fine.amount,
    overdueDate: formatDate(fine.overdueDate),
    createdDate: formatDateTime(fine.createdAt),
    resolvedDate: paidDate ?? waivedDate ?? '-',
    status: fine.status,
    note:
      fine.note ??
      (fine.status === FineStatus.Paid && paidDate
        ? `Đã thanh toán ngày ${paidDate}`
        : fine.status === FineStatus.Waived
          ? 'Đã được thủ thư miễn giảm theo quy định'
          : 'Chưa thanh toán'),
    coverImage: fine.book.coverImage,
    source: fine,
  };
}

export function getFineStatusTone(status: FineStatus) {
  if (status === FineStatus.Unpaid) {
    return {
      card: 'border-red-100 bg-red-50/30 hover:border-red-300',
      badge: 'border-red-100 bg-red-50 text-red-700',
      icon: 'bg-red-50 text-red-600',
      amount: 'text-red-600',
      dot: 'bg-red-500',
    };
  }

  if (status === FineStatus.Paid) {
    return {
      card: 'border-emerald-100 bg-white hover:border-emerald-300',
      badge: 'border-emerald-100 bg-emerald-50 text-emerald-700',
      icon: 'bg-emerald-50 text-emerald-600',
      amount: 'text-emerald-600',
      dot: 'bg-emerald-500',
    };
  }

  return {
    card: 'border-sky-100 bg-white hover:border-sky-300',
    badge: 'border-sky-100 bg-sky-50 text-brand-700',
    icon: 'bg-blue-50 text-brand-700',
    amount: 'text-brand-700',
    dot: 'bg-brand-600',
  };
}
