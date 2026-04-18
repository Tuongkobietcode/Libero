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

export type ReservationScope = 'all' | 'active' | 'history';

export interface AuthUser {
  _id: string;
  role: Role;
  isBlocked: boolean;
  fullName?: string;
  email?: string;
  memberCardNo?: string;
  status?: MemberStatus;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  studentId?: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface RegisterResponse {
  memberId: string;
  status: MemberStatus | string;
}

export interface BookNameRef {
  _id: string;
  name: string;
}

export interface MemberView {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  studentId?: string;
  role: Role;
  memberCardNo: string;
  status: MemberStatus;
  isBlocked: boolean;
  failedLoginCount: number;
  lockedUntil?: string | null;
  joinDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookCopyView {
  _id: string;
  barcode: string;
  status: CopyStatus;
  shelfLocation?: string;
  acquiredDate?: string;
  currentDueDate?: string;
  currentLoanStatus?: LoanStatus;
}

export interface BookListItem {
  _id: string;
  isbn: string;
  title: string;
  authors: BookNameRef[];
  categories: BookNameRef[];
  bookValue?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookDetail extends BookListItem {
  copies: BookCopyView[];
}

export interface LoanBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
}

export interface LoanCopyRef {
  _id: string;
  barcode: string;
  status: CopyStatus;
  shelfLocation?: string;
}

export interface LoanMemberRef {
  _id: string;
  fullName: string;
  email: string;
  memberCardNo: string;
  role: Role;
  status: MemberStatus;
  isBlocked: boolean;
}

export interface LoanFineView {
  _id: string;
  overdueDate: string;
  amount: number;
  status: FineStatus;
  paidAt?: string | null;
  note?: string;
  createdAt: string;
}

export interface LoanListItem {
  _id: string;
  member: LoanMemberRef;
  book: LoanBookRef;
  copy: LoanCopyRef;
  checkoutDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: LoanStatus;
  renewCount: number;
  policyLoanDays: number;
  policyMaxRenewals: number;
  policyRenewDays: number;
  notes?: string;
  fineCount: number;
  unpaidFineTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoanDetail extends LoanListItem {
  fines: LoanFineView[];
}

export interface ReservationBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
}

export interface ReservationCopyRef {
  _id: string;
  barcode: string;
  status: CopyStatus;
  shelfLocation?: string;
}

export interface ReservationMemberRef {
  _id: string;
  fullName: string;
  email: string;
  memberCardNo: string;
  role: Role;
  status: MemberStatus;
  isBlocked: boolean;
}

export interface ReservationListItem {
  _id: string;
  member: ReservationMemberRef;
  book: ReservationBookRef;
  copy?: ReservationCopyRef;
  queuePosition: number;
  status: ReservationStatus;
  requestDate: string;
  notifiedAt?: string | null;
  holdExpiryAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FineSummary {
  unpaidTotal: number;
  paidTotal: number;
  waivedTotal: number;
}

export interface FineBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
}

export interface FineListItem {
  _id: string;
  loanId: string;
  member: LoanMemberRef;
  book: FineBookRef;
  overdueDate: string;
  amount: number;
  status: FineStatus;
  paidAt?: string | null;
  waivedBy?: string | null;
  note?: string;
  createdAt: string;
}

export interface FineListResult {
  summary: FineSummary;
  items: FineListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
