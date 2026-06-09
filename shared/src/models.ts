import type {
  BookHoldStatus,
  CopyStatus,
  FineStatus,
  LoanStatus,
  MemberStatus,
  NotificationEvent,
  ReservationStatus,
  Role,
} from './enums';

export type ISODateString = string;
export type ReportGroupBy = 'day' | 'week' | 'month';
export type OverdueSort = 'overdueDays_desc' | 'overdueDays_asc' | 'dueDate_desc' | 'dueDate_asc';
export type ExportReportType = 'loans' | 'overdue' | 'inventory' | 'fines';
export type ExportReportFormat = 'xlsx' | 'pdf';
export type ReservationScope = 'all' | 'active' | 'history';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

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
  phone: string;
  studentId: string;
  faculty: string;
  className: string;
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
  lockedUntil?: ISODateString | null;
  joinDate?: ISODateString;
  expiryDate?: ISODateString;
  faculty?: string;
  className?: string;
  membershipTier?: string;
  lastLoginAt?: ISODateString | null;
  passwordUpdatedAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface MemberStatsView {
  activeLoans: number;
  overdueLoans: number;
  completedLoans: number;
  activeReservations: number;
  unpaidFineTotal: number;
  unpaidFineCount: number;
}

export type MemberActivityKind =
  | 'LOAN_CHECKOUT'
  | 'LOAN_RETURNED'
  | 'RESERVATION_CREATED'
  | 'RESERVATION_CANCELLED'
  | 'FINE_PAID';

export interface MemberActivityItem {
  id: string;
  kind: MemberActivityKind;
  title: string;
  description: string;
  occurredAt: ISODateString;
}

export interface LoanPolicyView {
  role: Role.Student | Role.Lecturer | Role.Librarian;
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
  effectiveFrom: ISODateString;
}

export interface BookCopyView {
  _id: string;
  barcode: string;
  status: CopyStatus;
  shelfLocation?: string;
  acquiredDate?: ISODateString;
  currentDueDate?: ISODateString;
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
  language?: string;
  pageCount?: number;
  bookSize?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
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

export interface CategoryFacet {
  _id: string;
  name: string;
  count: number;
}

export interface CategoryListItem extends CategoryFacet {
  canDelete: boolean;
}

export interface CatalogFacets {
  categories: CategoryFacet[];
  statuses: {
    available: number;
    borrowing: number;
    soon: number;
  };
  publishYear: {
    min: number | null;
    max: number | null;
  };
}

export interface LoanBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
  coverImage?: string;
  authors: BookNameRef[];
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
  overdueDate: ISODateString;
  amount: number;
  status: FineStatus;
  paidAt?: ISODateString | null;
  note?: string;
  createdAt: ISODateString;
}

export interface LoanListItem {
  _id: string;
  member: LoanMemberRef;
  book: LoanBookRef;
  copy: LoanCopyRef;
  checkoutDate: ISODateString;
  dueDate: ISODateString;
  returnDate?: ISODateString | null;
  status: LoanStatus;
  renewCount: number;
  policyLoanDays: number;
  policyMaxRenewals: number;
  policyRenewDays: number;
  notes?: string;
  fineCount: number;
  unpaidFineTotal: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface LoanDetail extends LoanListItem {
  fines: LoanFineView[];
}

export interface ReservationBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
  coverImage?: string;
  authors: BookNameRef[];
  categories: BookNameRef[];
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
  queueTotal: number;
  status: ReservationStatus;
  requestDate: ISODateString;
  notifiedAt?: ISODateString | null;
  holdExpiryAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface ReservationDetail extends ReservationListItem {}

export interface BookHoldMemberRef {
  _id: string;
  fullName: string;
  email: string;
  memberCardNo: string;
  role: Role;
  status: MemberStatus;
  isBlocked: boolean;
}

export interface BookHoldBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
  coverImage?: string;
  authors: BookNameRef[];
  categories: BookNameRef[];
}

export interface BookHoldCopyRef {
  _id: string;
  barcode: string;
  status: CopyStatus;
  shelfLocation?: string;
}

export interface BookHoldListItem {
  _id: string;
  member: BookHoldMemberRef;
  book: BookHoldBookRef;
  copy: BookHoldCopyRef;
  status: BookHoldStatus;
  requestDate: ISODateString;
  holdExpiryAt: ISODateString;
  fulfilledAt?: ISODateString | null;
  cancelledAt?: ISODateString | null;
  expiredAt?: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface BookHoldDetail extends BookHoldListItem {}

export interface NotificationListItem {
  _id: string;
  eventType: NotificationEvent;
  referenceId: string;
  title: string;
  body?: string;
  link?: string;
  readAt?: ISODateString | null;
  sentAt: ISODateString;
}

export interface NotificationListResult extends PaginatedResult<NotificationListItem> {
  unreadTotal: number;
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
  coverImage?: string;
  authors: BookNameRef[];
}

export interface FineListItem {
  _id: string;
  loanId: string;
  member: FineMemberRef;
  book: FineBookRef;
  overdueDate: ISODateString;
  amount: number;
  status: FineStatus;
  paidAt?: ISODateString | null;
  waivedBy?: string | null;
  note?: string;
  createdAt: ISODateString;
}

export interface FineListResult {
  summary: FineSummary;
  items: FineListItem[];
  pagination: PaginationMeta;
}

export interface PayFinesResult {
  updatedCount: number;
  fines: FineListItem[];
}

export interface FineRateView {
  _id: string;
  ratePerDay: number;
  effectiveFrom: ISODateString;
  appliesTo: string;
}

export interface ReportBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
  coverImage?: string;
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

export interface LoanStatsItem {
  period: string;
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  returnedLoans: number;
  lostLoans: number;
}

export interface OverdueReportItem {
  _id: string;
  member: ReportMemberRef;
  book: ReportBookRef;
  checkoutDate: ISODateString;
  dueDate: ISODateString;
  status: LoanStatus;
  renewCount: number;
  overdueDays: number;
}

export interface OverdueReportResult {
  items: OverdueReportItem[];
  pagination: PaginationMeta;
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
