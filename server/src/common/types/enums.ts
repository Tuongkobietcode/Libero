export enum Role {
  Student = 'student',
  Lecturer = 'lecturer',
  Librarian = 'librarian',
  Admin = 'admin',
}

export enum MemberStatus {
  Active = 'active',
  Suspended = 'suspended',
  Expired = 'expired',
  Pending = 'pending',
}

export enum CopyStatus {
  Available = 'available',
  Borrowed = 'borrowed',
  Reserved = 'reserved',
  Damaged = 'damaged',
  Lost = 'lost',
}

export enum LoanStatus {
  Active = 'ACTIVE',
  Overdue = 'OVERDUE',
  Returned = 'RETURNED',
  Lost = 'LOST',
}

export enum ReservationStatus {
  Waiting = 'WAITING',
  Notified = 'NOTIFIED',
  Fulfilled = 'FULFILLED',
  Cancelled = 'CANCELLED',
  Expired = 'EXPIRED',
}

export enum FineStatus {
  Unpaid = 'UNPAID',
  Paid = 'PAID',
  Waived = 'WAIVED',
}

export enum NotificationEvent {
  DueReminder = 'DUE_REMINDER',
  Overdue = 'OVERDUE',
  BookAvailable = 'BOOK_AVAILABLE',
  HoldExpiring = 'HOLD_EXPIRING',
  CheckoutConfirmation = 'CHECKOUT_CONFIRMATION',
  AccountBlocked = 'ACCOUNT_BLOCKED',
  AccountActivated = 'ACCOUNT_ACTIVATED',
}
