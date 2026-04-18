import type { FineStatus, MemberStatus, Role } from '../../common/types/enums';

export interface RequestActor {
  actorId?: string | null;
  actorRole?: Role;
  ipAddress?: string;
  userAgent?: string;
}

export interface FineSummary {
  unpaidTotal: number;
  paidTotal: number;
  waivedTotal: number;
}

export interface PayFinesDto {
  fineIds: string[];
}

export interface WaiveFineDto {
  reason: string;
}

export interface ListFinesQuery {
  memberId?: string;
  status?: FineStatus;
  page?: number;
  limit?: number;
}

export interface FineHistoryQuery {
  status?: FineStatus;
  page?: number;
  limit?: number;
}

export interface CreateFineRateDto {
  ratePerDay: number;
  effectiveFrom: Date;
  appliesTo?: string;
}

export interface FineRateView {
  _id: string;
  ratePerDay: number;
  effectiveFrom: Date;
  appliesTo: string;
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
  overdueDate: Date;
  amount: number;
  status: FineStatus;
  paidAt?: Date | null;
  waivedBy?: string | null;
  note?: string;
  createdAt: Date;
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
