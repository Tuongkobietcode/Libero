import { CopyStatus, FineStatus, LoanStatus, MemberStatus, ReservationStatus, Role } from '../types/models';

const roleLabelMap: Record<Role, string> = {
  [Role.Student]: 'Sinh vien',
  [Role.Lecturer]: 'Giang vien',
  [Role.Librarian]: 'Thu thu',
  [Role.Admin]: 'Quan tri vien',
};

const statusLabelMap: Record<string, string> = {
  [LoanStatus.Active]: 'Dang muon',
  [LoanStatus.Overdue]: 'Qua han',
  [LoanStatus.Returned]: 'Da tra',
  [LoanStatus.Lost]: 'Mat sach',
  [ReservationStatus.Waiting]: 'Dang cho',
  [ReservationStatus.Notified]: 'Da thong bao',
  [ReservationStatus.Fulfilled]: 'Da hoan tat',
  [ReservationStatus.Cancelled]: 'Da huy',
  [ReservationStatus.Expired]: 'Het han',
  [FineStatus.Unpaid]: 'Chua thanh toan',
  [FineStatus.Paid]: 'Da thanh toan',
  [FineStatus.Waived]: 'Da mien',
  [CopyStatus.Available]: 'Co san',
  [CopyStatus.Borrowed]: 'Dang muon',
  [CopyStatus.Reserved]: 'Dang giu cho',
  [CopyStatus.Damaged]: 'Hu hong',
  [CopyStatus.Lost]: 'That lac',
  [MemberStatus.Active]: 'Hoat dong',
  [MemberStatus.Suspended]: 'Tam khoa',
  [MemberStatus.Expired]: 'Het han',
  [MemberStatus.Pending]: 'Cho duyet',
};

export function getRoleLabel(role?: Role | string | null): string {
  if (!role) {
    return '-';
  }

  return roleLabelMap[role as Role] ?? role;
}

export function getStatusLabel(status?: string | null): string {
  if (!status) {
    return '-';
  }

  return statusLabelMap[status] ?? status;
}

export function getReservationScopeLabel(scope: 'all' | 'active' | 'history'): string {
  if (scope === 'active') {
    return 'Dang hieu luc';
  }

  if (scope === 'history') {
    return 'Lich su';
  }

  return 'Tat ca';
}
