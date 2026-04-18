import type { MemberStatus, Role, CopyStatus, FineStatus, LoanStatus } from '../../common/types/enums';

export type LoanPolicyRole = Role.Student | Role.Lecturer | Role.Librarian;

export interface RequestActor {
  actorId?: string | null;
  actorRole?: Role;
  ipAddress?: string;
  userAgent?: string;
}

export interface CheckoutLoanDto {
  memberId: string;
  barcode: string;
}

export interface ReturnByBarcodeDto {
  barcode: string;
}

export interface MarkLostDto {
  notes?: string;
  bookValue?: number;
}

export interface LoanHistoryQuery {
  status?: LoanStatus;
  page?: number;
  limit?: number;
}

export interface ListLoansQuery extends LoanHistoryQuery {
  memberId?: string;
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
  overdueDate: Date;
  amount: number;
  status: FineStatus;
  paidAt?: Date | null;
  note?: string;
  createdAt: Date;
}

export interface LoanListItem {
  _id: string;
  member: LoanMemberRef;
  book: LoanBookRef;
  copy: LoanCopyRef;
  checkoutDate: Date;
  dueDate: Date;
  returnDate?: Date | null;
  status: LoanStatus;
  renewCount: number;
  policyLoanDays: number;
  policyMaxRenewals: number;
  policyRenewDays: number;
  notes?: string;
  fineCount: number;
  unpaidFineTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanDetail extends LoanListItem {
  fines: LoanFineView[];
}
