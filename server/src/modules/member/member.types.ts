import type { MemberStatus, Role } from '../../common/types/enums';

export type LoanPolicyRole = Role.Student | Role.Lecturer | Role.Librarian;

export interface RequestActor {
  actorId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateManagedMemberDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  studentId?: string;
  role: Role;
  joinDate?: Date;
  expiryDate?: Date;
  faculty?: string;
  className?: string;
  campus?: string;
  libraryBranch?: string;
  membershipTier?: string;
}

export interface UpdateManagedMemberDto {
  fullName?: string;
  email?: string;
  phone?: string;
  studentId?: string;
  role?: Role;
  joinDate?: Date;
  expiryDate?: Date;
  faculty?: string;
  className?: string;
  campus?: string;
  libraryBranch?: string;
  membershipTier?: string;
}

export interface UpdateMyProfileDto {
  fullName?: string;
  email?: string;
  phone?: string;
  studentId?: string;
  faculty?: string;
  className?: string;
  campus?: string;
}

export interface ListMembersQuery {
  q?: string;
  role?: Role;
  status?: MemberStatus;
  memberCardNo?: string;
  page?: number;
  limit?: number;
}

export interface SuspendMemberDto {
  reason?: string;
}

export interface LoanPolicyUpdateDto {
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
  effectiveFrom?: Date;
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
  lockedUntil?: Date | null;
  joinDate?: Date;
  expiryDate?: Date;
  faculty?: string;
  className?: string;
  campus?: string;
  libraryBranch?: string;
  membershipTier?: string;
  lastLoginAt?: Date | null;
  passwordUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  occurredAt: Date;
}

export interface LoanPolicyView {
  role: LoanPolicyRole;
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
  effectiveFrom: Date;
}
