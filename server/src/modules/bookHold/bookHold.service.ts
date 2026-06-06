import mongoose, { Types, type ClientSession, type FilterQuery } from 'mongoose';

import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { BookHoldStatus, CopyStatus, MemberStatus, NotificationEvent, Role } from '../../common/types/enums';
import { writeAuditLog } from '../../common/utils/auditLogger';
import { buildBookAuthorsMap, buildBookCategoriesMap, type BookNameRef } from '../../common/utils/bookAuthors';
import { getRequiredMapValue, uniqueObjectIds } from '../../common/utils/collectionHelpers';
import { addHours } from '../../common/utils/dateHelpers';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import { logger } from '../../common/middleware/requestLogger';
import { env } from '../../config/env';
import type { BookDocument } from '../../models/Book.model';
import type { BookCopyDocument } from '../../models/BookCopy.model';
import type { BookHoldDocument } from '../../models/BookHold.model';
import type { MemberDocument } from '../../models/Member.model';
import { notificationService } from '../notification/notification.service';
import { reservationService } from '../reservation/reservation.service';
import { realtimeHub } from '../../realtime/realtime';
import { bookHoldRepository, type BookHoldRepository } from './bookHold.repository';
import type {
  BookHoldBookRef,
  BookHoldCopyRef,
  BookHoldDetail,
  BookHoldListItem,
  BookHoldMemberRef,
  CreateBookHoldDto,
  ListBookHoldsQuery,
  RequestActor,
} from './bookHold.types';

const MAX_ACTIVE_HOLDS_PER_MEMBER = 3;
const BOOK_HOLD_EXPIRY_HOURS = 24;

function createMemberRef(member: MemberDocument): BookHoldMemberRef {
  return {
    _id: member._id.toString(),
    fullName: member.fullName,
    email: member.email,
    memberCardNo: member.memberCardNo,
    role: member.role,
    status: member.status,
    isBlocked: member.isBlocked,
  };
}

function createBookRef(book: BookDocument, authors: BookNameRef[], categories: BookNameRef[]): BookHoldBookRef {
  return {
    _id: book._id.toString(),
    isbn: book.isbn,
    title: book.title,
    bookValue: book.bookValue,
    coverImage: book.coverImage,
    authors,
    categories,
  };
}

function createCopyRef(copy: BookCopyDocument): BookHoldCopyRef {
  return {
    _id: copy._id.toString(),
    barcode: copy.barcode,
    status: copy.status,
    shelfLocation: copy.shelfLocation,
  };
}

function isBorrowerRole(role: Role | undefined): role is Role.Student | Role.Lecturer {
  return role === Role.Student || role === Role.Lecturer;
}

function isBackofficeRole(role: Role | undefined): role is Role.Admin | Role.Librarian {
  return role === Role.Admin || role === Role.Librarian;
}

export class BookHoldService {
  constructor(private readonly repository: BookHoldRepository = bookHoldRepository) {}

  async createHold(memberId: string, input: CreateBookHoldDto, actor?: RequestActor): Promise<BookHoldDetail> {
    const now = new Date();
    const holdExpiryAt = addHours(now, BOOK_HOLD_EXPIRY_HOURS);
    const session = await mongoose.startSession();
    let createdHoldId: string | null = null;

    try {
      await session.withTransaction(async () => {
        const [member, book] = await Promise.all([
          this.repository.findMemberById(memberId, session),
          this.repository.findBookById(input.bookId, session),
        ]);

        if (!member) {
          throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
        }

        if (!book || book.isDeleted) {
          throw new NotFoundError(ERR.CAT_BOOK_NOT_FOUND, 404, 'Book not found');
        }

        this.assertHoldAllowed(member);

        const [activeHoldCount, existingHold, existingReservation] = await Promise.all([
          this.repository.countActiveHoldsByMember(member._id, session),
          this.repository.findActiveHoldForMemberBook(member._id, book._id, session),
          this.repository.findActiveReservationForMemberBook(member._id, book._id, session),
        ]);

        if (activeHoldCount >= MAX_ACTIVE_HOLDS_PER_MEMBER) {
          throw new BusinessRuleError(ERR.HOLD_LIMIT_REACHED, 422, 'Bạn đã đặt giữ tối đa 3 sách cùng lúc');
        }

        if (existingHold || existingReservation) {
          throw new BusinessRuleError(ERR.HOLD_ALREADY_ACTIVE, 409, 'Member already has an active hold or reservation for this book');
        }

        const availableCopy = await this.repository.findAvailableCopyByBookId(book._id, session);

        if (!availableCopy) {
          throw new BusinessRuleError(ERR.HOLD_COPY_UNAVAILABLE, 422, 'No available copy can be held');
        }

        const reservedCopy = await this.repository.updateCopyStatusIfCurrent(
          availableCopy._id,
          [CopyStatus.Available],
          CopyStatus.Reserved,
          session,
        );

        if (!reservedCopy) {
          throw new BusinessRuleError(ERR.HOLD_COPY_UNAVAILABLE, 422, 'Book copy could not be held');
        }

        const createdHold = await this.repository.createBookHold(
          {
            memberId: member._id,
            bookId: book._id,
            copyId: reservedCopy._id,
            status: BookHoldStatus.Active,
            requestDate: now,
            holdExpiryAt,
            fulfilledAt: null,
            cancelledAt: null,
            expiredAt: null,
          },
          session,
        );

        createdHoldId = createdHold._id.toString();
      });
    } finally {
      await session.endSession();
    }

    if (!createdHoldId) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Book hold could not be created');
    }

    const result = await this.getHoldDetail(createdHoldId);
    this.writeAudit(actor, 'CREATE_BOOK_HOLD', 'BookHold', createdHoldId, undefined, result);
    this.publishHoldEvent('created', result);
    await this.queueHoldNotification(result, isBackofficeRole(actor?.actorRole));
    await this.queueBackofficeHoldCreatedNotification(result, isBackofficeRole(actor?.actorRole));

    return result;
  }

  async cancelHold(holdId: string, actor?: RequestActor): Promise<BookHoldDetail> {
    const currentHold = await this.repository.findBookHoldById(holdId);

    if (!currentHold) {
      throw new NotFoundError(ERR.HOLD_NOT_FOUND, 404, 'Book hold not found');
    }

    this.assertCanCancelHold(actor, currentHold);

    if (currentHold.status !== BookHoldStatus.Active) {
      throw new BusinessRuleError(ERR.HOLD_CANNOT_CANCEL, 422, 'Book hold cannot be cancelled');
    }

    await this.releaseHoldInternal(currentHold, BookHoldStatus.Cancelled, actor);
    return this.getHoldDetail(holdId);
  }

  async expireHold(holdId: string, actor?: RequestActor): Promise<BookHoldDetail> {
    const currentHold = await this.repository.findBookHoldById(holdId);

    if (!currentHold) {
      throw new NotFoundError(ERR.HOLD_NOT_FOUND, 404, 'Book hold not found');
    }

    if (currentHold.status !== BookHoldStatus.Active) {
      throw new BusinessRuleError(ERR.HOLD_CANNOT_CANCEL, 422, 'Only active holds can expire');
    }

    if (currentHold.holdExpiryAt.getTime() > Date.now()) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Book hold has not expired yet');
    }

    await this.releaseHoldInternal(currentHold, BookHoldStatus.Expired, actor);
    return this.getHoldDetail(holdId);
  }

  async listMyHolds(memberId: string, query: ListBookHoldsQuery) {
    return this.listHolds({ ...query, memberId });
  }

  async listHolds(query: ListBookHoldsQuery) {
    const pagination = buildPagination(query);
    const filter: FilterQuery<BookHoldDocument> = {};

    if (query.memberId) {
      filter.memberId = new Types.ObjectId(query.memberId);
    }

    if (query.bookId) {
      filter.bookId = new Types.ObjectId(query.bookId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    const { holds, total } = await this.repository.listBookHolds({
      filter,
      page: pagination.page,
      limit: pagination.limit,
    });
    const items = await this.buildHoldItems(holds);

    return buildPaginationResult(items, total, pagination);
  }

  private async releaseHoldInternal(currentHold: BookHoldDocument, nextStatus: BookHoldStatus.Cancelled | BookHoldStatus.Expired, actor?: RequestActor): Promise<void> {
    const session = await mongoose.startSession();
    let nextReservationId: string | null = null;

    try {
      await session.withTransaction(async () => {
        const now = new Date();
        const updatedHold =
          nextStatus === BookHoldStatus.Cancelled
            ? await this.repository.cancelActiveHoldById(currentHold._id, now, session)
            : await this.repository.expireActiveHoldById(currentHold._id, now, session);

        if (!updatedHold) {
          throw new BusinessRuleError(ERR.HOLD_CANNOT_CANCEL, 422, 'Book hold could not be released');
        }

        nextReservationId = await this.releaseCopyToReservationQueue(currentHold.bookId.toString(), currentHold.copyId.toString(), session);
      });
    } finally {
      await session.endSession();
    }

    const result = await this.getHoldDetail(currentHold._id.toString());
    this.writeAudit(
      actor,
      nextStatus === BookHoldStatus.Cancelled ? 'CANCEL_BOOK_HOLD' : 'EXPIRE_BOOK_HOLD',
      'BookHold',
      currentHold._id.toString(),
      this.toAuditSnapshot(currentHold),
      result,
    );

    if (nextReservationId) {
      await this.queueReservationAdvancedNotification(nextReservationId);
    }

    await this.queueBackofficeHoldStatusNotification(
      result,
      nextStatus === BookHoldStatus.Cancelled ? NotificationEvent.BookHoldCancelled : NotificationEvent.BookHoldExpired,
    );
  }

  private async releaseCopyToReservationQueue(bookId: string, copyId: string, session: ClientSession): Promise<string | null> {
    const nextWaitingReservation = await this.repository.findNextWaitingReservationByBookId(bookId, session);

    if (!nextWaitingReservation) {
      const releasedCopy = await this.repository.updateCopyStatusIfCurrent(
        copyId,
        [CopyStatus.Reserved],
        CopyStatus.Available,
        session,
      );

      if (!releasedCopy) {
        throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Held copy could not be released');
      }

      return null;
    }

    const now = new Date();
    const holdExpiryAt = addHours(now, env.HOLD_EXPIRY_HOURS);
    const notifiedReservation = await this.repository.notifyReservationById(
      nextWaitingReservation._id,
      copyId,
      now,
      holdExpiryAt,
      session,
    );

    if (!notifiedReservation) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Reservation queue could not be advanced');
    }

    return notifiedReservation._id.toString();
  }

  private async getHoldDetail(holdId: string): Promise<BookHoldDetail> {
    const hold = await this.repository.findBookHoldById(holdId);

    if (!hold) {
      throw new NotFoundError(ERR.HOLD_NOT_FOUND, 404, 'Book hold not found');
    }

    const [item] = await this.buildHoldItems([hold]);
    return item;
  }

  private async buildHoldItems(holds: BookHoldDocument[]): Promise<BookHoldListItem[]> {
    if (holds.length === 0) {
      return [];
    }

    const memberIds = uniqueObjectIds(holds.map((hold) => hold.memberId));
    const bookIds = uniqueObjectIds(holds.map((hold) => hold.bookId));
    const copyIds = uniqueObjectIds(holds.map((hold) => hold.copyId));
    const [members, books, copies] = await Promise.all([
      this.repository.findMembersByIds(memberIds),
      this.repository.findBooksByIds(bookIds),
      this.repository.findCopiesByIds(copyIds),
    ]);
    const [authorsByBook, categoriesByBook] = await Promise.all([
      buildBookAuthorsMap(books),
      buildBookCategoriesMap(books),
    ]);

    const memberMap = new Map(members.map((member) => [member._id.toString(), member]));
    const bookMap = new Map(books.map((book) => [book._id.toString(), book]));
    const copyMap = new Map(copies.map((copy) => [copy._id.toString(), copy]));

    return holds.map((hold) => {
      const bookId = hold.bookId.toString();
      return {
        _id: hold._id.toString(),
        member: createMemberRef(getRequiredMapValue(memberMap, hold.memberId.toString(), 'Book hold member not found')),
        book: createBookRef(
          getRequiredMapValue(bookMap, bookId, 'Book hold book not found'),
          authorsByBook.get(bookId) ?? [],
          categoriesByBook.get(bookId) ?? [],
        ),
        copy: createCopyRef(getRequiredMapValue(copyMap, hold.copyId.toString(), 'Book hold copy not found')),
        status: hold.status,
        requestDate: hold.requestDate,
        holdExpiryAt: hold.holdExpiryAt,
        fulfilledAt: hold.fulfilledAt,
        cancelledAt: hold.cancelledAt,
        expiredAt: hold.expiredAt,
        createdAt: hold.createdAt,
        updatedAt: hold.updatedAt,
      };
    });
  }

  private assertHoldAllowed(member: MemberDocument): void {
    if (member.isBlocked) {
      throw new BusinessRuleError(ERR.RES_MEMBER_BLOCKED, 422, 'Member is blocked from creating holds');
    }

    if (member.status !== MemberStatus.Active) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Member cannot create holds in the current status');
    }

    if (!isBorrowerRole(member.role)) {
      throw new ForbiddenError(ERR.AUTH_FORBIDDEN, 403, 'Only students and lecturers can create holds');
    }
  }

  private assertCanCancelHold(actor: RequestActor | undefined, hold: BookHoldDocument): void {
    if (isBackofficeRole(actor?.actorRole)) {
      return;
    }

    if (!actor?.actorId || actor.actorId !== hold.memberId.toString()) {
      throw new ForbiddenError(ERR.AUTH_FORBIDDEN, 403, 'You can only cancel your own holds');
    }
  }

  private async queueHoldNotification(hold: BookHoldDetail, createdByBackoffice: boolean): Promise<void> {
    try {
      await notificationService.enqueueBookHoldCreated(
        hold.member._id,
        hold._id,
        hold.book._id,
        hold.book.title,
        hold.copy.shelfLocation,
        hold.holdExpiryAt,
        createdByBackoffice,
      );
    } catch (error) {
      logger.error({ err: error, holdId: hold._id }, 'Failed to enqueue book hold notification');
    }
  }

  private async queueBackofficeHoldCreatedNotification(hold: BookHoldDetail, createdByBackoffice: boolean): Promise<void> {
    try {
      await notificationService.enqueueBookHoldCreatedForBackoffice(
        hold._id,
        hold.member.fullName,
        hold.member.memberCardNo,
        hold.book.title,
        createdByBackoffice,
      );
    } catch (error) {
      logger.error({ err: error, holdId: hold._id }, 'Failed to enqueue backoffice book hold notification');
    }
  }

  private async queueBackofficeHoldStatusNotification(
    hold: BookHoldDetail,
    eventType: NotificationEvent.BookHoldCancelled | NotificationEvent.BookHoldExpired | NotificationEvent.BookHoldFulfilled,
  ): Promise<void> {
    try {
      await notificationService.enqueueBookHoldStatusForBackoffice(
        eventType,
        hold._id,
        hold.member.fullName,
        hold.member.memberCardNo,
        hold.book.title,
      );
    } catch (error) {
      logger.error({ err: error, holdId: hold._id, eventType }, 'Failed to enqueue backoffice book hold status notification');
    }
  }

  private async queueReservationAdvancedNotification(reservationId: string): Promise<void> {
    try {
      const reservation = await reservationService.getReservationDetail(reservationId);
      await notificationService.enqueueBookAvailable(
        reservation.member._id,
        reservation._id,
        reservation.book.title,
        reservation.copy?.shelfLocation,
        reservation.holdExpiryAt,
      );
    } catch (error) {
      logger.error({ err: error, reservationId }, 'Failed to enqueue advanced reservation notification');
    }
  }

  private publishHoldEvent(action: string, hold: BookHoldDetail): void {
    const payload = {
      memberId: hold.member._id,
      bookId: hold.book._id,
      copyId: hold.copy._id,
      status: hold.status,
    };

    realtimeHub.emitBackofficeEvent({
      type: NotificationEvent.BookHoldCreated,
      resource: 'bookHold',
      action,
      referenceId: hold._id,
      payload,
    });

    realtimeHub.emitUserEvent(hold.member._id, {
      type: NotificationEvent.BookHoldCreated,
      resource: 'bookHold',
      action,
      referenceId: hold._id,
      payload,
    });
  }

  private toAuditSnapshot(hold: BookHoldDocument) {
    return {
      _id: hold._id.toString(),
      memberId: hold.memberId.toString(),
      bookId: hold.bookId.toString(),
      copyId: hold.copyId.toString(),
      status: hold.status,
      requestDate: hold.requestDate,
      holdExpiryAt: hold.holdExpiryAt,
      fulfilledAt: hold.fulfilledAt,
      cancelledAt: hold.cancelledAt,
      expiredAt: hold.expiredAt,
      createdAt: hold.createdAt,
      updatedAt: hold.updatedAt,
    };
  }

  private writeAudit(
    actor: RequestActor | undefined,
    action: string,
    entity: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
  ): void {
    writeAuditLog({
      actorId: actor?.actorId ?? null,
      action,
      entity,
      entityId,
      before,
      after,
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });
  }
}

export const bookHoldService = new BookHoldService();
