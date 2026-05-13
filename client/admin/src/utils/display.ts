import { BookHoldStatus, CopyStatus, FineStatus, LoanStatus, MemberStatus, ReservationStatus, Role } from '../types/models';

const roleLabelMap: Record<Role, string> = {
  [Role.Student]: 'Sinh viên',
  [Role.Lecturer]: 'Giảng viên',
  [Role.Librarian]: 'Thủ thư',
  [Role.Admin]: 'Quản trị viên',
};

const bookHoldStatusLabelMap: Record<BookHoldStatus, string> = {
  [BookHoldStatus.Active]: 'Đang chờ lấy',
  [BookHoldStatus.Fulfilled]: 'Đã nhận',
  [BookHoldStatus.Cancelled]: 'Đã trả lại',
  [BookHoldStatus.Expired]: 'Hết hạn',
};

const statusLabelMap = new Map<string, string>([
  [LoanStatus.Active, 'Đang mượn'],
  [LoanStatus.Overdue, 'Quá hạn'],
  [LoanStatus.Returned, 'Đã trả'],
  [LoanStatus.Lost, 'Mất sách'],
  [ReservationStatus.Waiting, 'Đang chờ'],
  [ReservationStatus.Notified, 'Đã thông báo'],
  [ReservationStatus.Fulfilled, 'Đã hoàn tất'],
  [ReservationStatus.Cancelled, 'Đã hủy'],
  [ReservationStatus.Expired, 'Hết hạn'],
  [FineStatus.Unpaid, 'Chưa thanh toán'],
  [FineStatus.Paid, 'Đã thanh toán'],
  [FineStatus.Waived, 'Đã miễn'],
  [CopyStatus.Available, 'Sẵn sàng'],
  [CopyStatus.Borrowed, 'Đang mượn'],
  [CopyStatus.Reserved, 'Đang giữ chỗ'],
  [CopyStatus.Damaged, 'Hư hỏng'],
  [CopyStatus.Lost, 'Thất lạc'],
  [MemberStatus.Active, 'Hoạt động'],
  [MemberStatus.Suspended, 'Tạm khóa'],
  [MemberStatus.Expired, 'Hết hạn'],
  [MemberStatus.Pending, 'Chờ duyệt'],
]);

export function getRoleLabel(role?: Role | string | null): string {
  if (!role) {
    return '-';
  }

  return roleLabelMap[role as Role] ?? role;
}

export function getBookHoldStatusLabel(status?: BookHoldStatus | string | null): string {
  if (!status) {
    return '-';
  }

  return bookHoldStatusLabelMap[status as BookHoldStatus] ?? status;
}

export function getStatusLabel(status?: string | null): string {
  if (!status) {
    return '-';
  }

  return statusLabelMap.get(status) ?? status;
}
