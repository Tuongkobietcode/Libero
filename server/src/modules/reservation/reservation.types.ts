import type { CopyStatus, MemberStatus, ReservationStatus, Role } from '../../common/types/enums';

export type ReservationScope = 'all' | 'active' | 'history';

export interface RequestActor {
  actorId?: string | null;
  actorRole?: Role;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateReservationDto {
  bookId: string;
}

export interface ReservationHistoryQuery {
  scope?: ReservationScope;
  status?: ReservationStatus;
  page?: number;
  limit?: number;
}

export interface ListReservationsQuery extends ReservationHistoryQuery {
  bookId?: string;
  memberId?: string;
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
  requestDate: Date;
  notifiedAt?: Date | null;
  holdExpiryAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReservationDetail extends ReservationListItem {}
