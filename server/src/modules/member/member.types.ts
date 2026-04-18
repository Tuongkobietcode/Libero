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
}

export interface UpdateManagedMemberDto {
  fullName?: string;
  email?: string;
  phone?: string;
  studentId?: string;
  role?: Role;
  joinDate?: Date;
  expiryDate?: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanPolicyView {
  role: LoanPolicyRole;
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
  effectiveFrom: Date;
}
