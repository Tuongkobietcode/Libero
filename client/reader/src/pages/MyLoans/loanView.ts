import { LoanStatus, MemberStatus, type LoanListItem } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { daysUntil, formatDate, formatDateTime, formatList } from '../../utils/format';

export const PAGE_SIZE = 10;

export interface LoanView {
  id: string;
  title: string;
  author: string;
  code: string;
  isbn: string;
  checkoutLabel: string;
  dueLabel: string;
  dueStatus: string;
  returnLabel: string;
  status: LoanStatus;
  statusLabel: string;
  renewRemaining?: string;
  renewBlockedTitle?: string;
  renewBlockedDescription?: string;
  coverImage?: string;
  source?: LoanListItem;
  renewDisabledReason?: string;
}

export function buildRenewDisabledReason(
  status: LoanStatus,
  renewCount: number,
  maxRenewals: number,
  memberStatus?: MemberStatus,
  isBlocked?: boolean,
): string | undefined {
  if (status !== LoanStatus.Active) {
    return 'Chỉ có thể gia hạn phiếu mượn đang hoạt động.';
  }

  if (memberStatus && memberStatus !== MemberStatus.Active) {
    return 'Tài khoản hiện tại không đủ điều kiện để gia hạn.';
  }

  if (isBlocked) {
    return 'Tài khoản của bạn đang bị khóa nên không thể gia hạn thêm.';
  }

  if (renewCount >= maxRenewals) {
    return 'Bạn đã dùng hết số lần gia hạn cho phép.';
  }

  return undefined;
}

export function toLoanView(loan: LoanListItem, renewDisabledReason?: string): LoanView {
  const daysLeft = daysUntil(loan.dueDate);
  const isReturned = loan.status === LoanStatus.Returned;

  return {
    id: loan._id,
    title: loan.book.title,
    author: formatList(loan.book.authors, 'Chưa cập nhật tác giả'),
    code: loan.copy.barcode,
    isbn: loan.book.isbn,
    checkoutLabel: formatDate(loan.checkoutDate),
    dueLabel: formatDate(loan.dueDate),
    dueStatus: isReturned
      ? `Đã trả ${formatDate(loan.returnDate ?? loan.dueDate)}`
      : daysLeft === null
        ? '-'
        : daysLeft >= 0
          ? `Còn ${daysLeft} ngày`
          : `Quá hạn ${Math.abs(daysLeft)} ngày`,
    returnLabel: loan.returnDate ? formatDateTime(loan.returnDate) : `— ${getStatusLabel(loan.status)}`,
    status: loan.status,
    statusLabel: getStatusLabel(loan.status),
    renewRemaining:
      loan.status === LoanStatus.Active ? `Còn ${Math.max(0, loan.policyMaxRenewals - loan.renewCount)} lần gia hạn` : undefined,
    renewBlockedTitle: renewDisabledReason ? 'Không thể gia hạn' : undefined,
    renewBlockedDescription: renewDisabledReason,
    coverImage: loan.book.coverImage,
    source: loan,
    renewDisabledReason,
  };
}

export function getLoanTone(status: LoanStatus) {
  if (status === LoanStatus.Overdue) {
    return {
      card: 'border-red-200 bg-red-50/30 hover:border-red-300',
      status: 'border-red-200 bg-red-50 text-red-600',
      accent: 'text-red-600',
      dot: 'bg-red-500',
    };
  }

  if (status === LoanStatus.Lost) {
    return {
      card: 'border-red-200 bg-red-50/30 hover:border-red-300',
      status: 'border-red-200 bg-red-50 text-red-700',
      accent: 'text-red-700',
      dot: 'bg-red-600',
    };
  }

  if (status === LoanStatus.Returned) {
    return {
      card: 'border-slate-200 bg-white hover:border-slate-300',
      status: 'border-slate-200 bg-slate-100 text-slate-600',
      accent: 'text-slate-600',
      dot: 'bg-slate-400',
    };
  }

  return {
    card: 'border-sky-100 bg-white hover:border-sky-300',
    status: 'border-sky-100 bg-sky-50 text-brand-700',
    accent: 'text-brand-700',
    dot: 'bg-brand-600',
  };
}

