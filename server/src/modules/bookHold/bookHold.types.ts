import type { BookHoldStatus, CopyStatus, MemberStatus, Role } from '../../common/types/enums';
import type { BookNameRef } from '../../common/utils/bookAuthors';

export interface RequestActor {
  actorId?: string | null;
  actorRole?: Role;
  ipAddress?: string;
  userAgent?: string;
}

export interface CreateBookHoldDto {
  bookId: string;
}

export interface CreateBookHoldForMemberDto extends CreateBookHoldDto {
  memberId: string;
}

export interface ListBookHoldsQuery {
  status?: BookHoldStatus;
  memberId?: string;
  bookId?: string;
  page?: number;
  limit?: number;
}

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
  requestDate: Date;
  holdExpiryAt: Date;
  fulfilledAt?: Date | null;
  cancelledAt?: Date | null;
  expiredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookHoldDetail extends BookHoldListItem {}
