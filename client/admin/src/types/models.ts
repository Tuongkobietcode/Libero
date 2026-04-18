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

export type ReportGroupBy = 'day' | 'week' | 'month';
export type OverdueSort = 'overdueDays_desc' | 'overdueDays_asc' | 'dueDate_desc' | 'dueDate_asc';
export type ExportReportType = 'loans' | 'overdue' | 'inventory' | 'fines';
export type ExportReportFormat = 'xlsx' | 'pdf';
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

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
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

export interface LoanPolicyView {
  role: Role.Student | Role.Lecturer | Role.Librarian;
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
  effectiveFrom: string;
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

export interface CsvImportErrorDetail {
  row: number;
  isbn?: string;
  message: string;
}

export interface CsvImportResult {
  successCount: number;
  failedCount: number;
  errors: CsvImportErrorDetail[];
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

export interface FineMemberRef {
  _id: string;
  fullName: string;
  email: string;
  memberCardNo: string;
  role: Role;
  status: MemberStatus;
  isBlocked: boolean;
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
  member: FineMemberRef;
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

export interface PayFinesResult {
  updatedCount: number;
  fines: FineListItem[];
}

export interface FineRateView {
  _id: string;
  ratePerDay: number;
  effectiveFrom: string;
  appliesTo: string;
}

export interface LoanStatsItem {
  period: string;
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  returnedLoans: number;
  lostLoans: number;
}

export interface ReportBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
}

export interface ReportMemberRef {
  _id: string;
  fullName: string;
  email: string;
  memberCardNo: string;
  role: Role;
  status: MemberStatus;
  isBlocked: boolean;
}

export interface OverdueReportItem {
  _id: string;
  member: ReportMemberRef;
  book: ReportBookRef;
  checkoutDate: string;
  dueDate: string;
  status: LoanStatus;
  renewCount: number;
  overdueDays: number;
}

export interface OverdueReportResult {
  items: OverdueReportItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface PopularBookItem {
  book: ReportBookRef;
  checkoutCount: number;
}

export interface InventoryStatusItem {
  book: ReportBookRef;
  status: CopyStatus;
  totalCopies: number;
}

export interface FineStatusSummaryItem {
  status: FineStatus;
  totalAmount: number;
  count: number;
}

export interface FineTrendItem {
  period: string;
  totalAmount: number;
  count: number;
}

export interface MemberDebtItem {
  member: ReportMemberRef;
  unpaidTotal: number;
  fineCount: number;
}

export interface FineSummaryReport {
  summary: FineStatusSummaryItem[];
  trend: FineTrendItem[];
  memberDebts: MemberDebtItem[];
}
