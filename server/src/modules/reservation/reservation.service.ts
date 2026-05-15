import mongoose, { Types, type ClientSession } from 'mongoose';

import {
  BadRequestError,
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import {
  CopyStatus,
  MemberStatus,
  NotificationEvent,
  ReservationStatus,
  Role,
} from '../../common/types/enums';
import { writeAuditLog } from '../../common/utils/auditLogger';
import { buildBookAuthorsMap, buildBookCategoriesMap } from '../../common/utils/bookAuthors';
import type { BookNameRef } from '../../common/utils/bookAuthors';
import { getRequiredMapValue, uniqueObjectIds } from '../../common/utils/collectionHelpers';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import { addHours } from '../../common/utils/dateHelpers';
import { logger } from '../../common/middleware/requestLogger';
import { env } from '../../config/env';
import type { BookDocument } from '../../models/Book.model';
import type { BookCopyDocument } from '../../models/BookCopy.model';
import type { MemberDocument } from '../../models/Member.model';
import type { ReservationDocument } from '../../models/Reservation.model';
import { notificationService } from '../notification/notification.service';
import { realtimeHub } from '../../realtime/realtime';
import { reservationRepository, type ReservationRepository } from './reservation.repository';
import type {
  CreateReservationDto,
  ListReservationsQuery,
  RequestActor,
  ReservationBookRef,
  ReservationCopyRef,
  ReservationDetail,
  ReservationHistoryQuery,
  ReservationListItem,
  ReservationMemberRef,
} from './reservation.types';

const ACTIVE_RESERVATION_STATUSES = [ReservationStatus.Waiting, ReservationStatus.Notified] as const;
const HISTORY_RESERVATION_STATUSES = [
  ReservationStatus.Fulfilled,
  ReservationStatus.Cancelled,
  ReservationStatus.Expired,
] as const;

interface NotifyNextResult {
  reservationId: string | null;
}

function createReservationBookRef(
  book: BookDocument,
  authors: BookNameRef[],
  categories: BookNameRef[],
): ReservationBookRef {
  return {
    _id: book._id.toString(),
    isbn: book.isbn,
    title: book.title,
    bookValue: book.bookValue,
    authors,
    categories,
  };
}

function createReservationMemberRef(member: MemberDocument): ReservationMemberRef {
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

function createReservationCopyRef(copy: BookCopyDocument): ReservationCopyRef {
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

export class ReservationService {
  constructor(private readonly repository: ReservationRepository = reservationRepository) {}

  async createReservation(memberId: string, input: CreateReservationDto, actor?: RequestActor): Promise<ReservationDetail> {
    const now = new Date();
    const session = await mongoose.startSession();
    let createdReservationId: string | null = null;

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

        this.assertReservationAllowed(member);

        const [copyCount, availableCopyCount, existingReservation, existingHold] = await Promise.all([
          this.repository.countCopiesByBookId(book._id, session),
          this.repository.countAvailableCopiesByBookId(book._id, session),
          this.repository.findActiveReservationForMemberBook(member._id, book._id, session),
          this.repository.findActiveBookHoldForMemberBook(member._id, book._id, session),
        ]);

        if (copyCount === 0) {
          throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Book has no copies to reserve');
        }

        if (availableCopyCount > 0) {
          throw new BusinessRuleError(ERR.RES_COPY_AVAILABLE, 422, 'Reservation is not allowed while a copy is available');
        }

        if (existingReservation || existingHold) {
          throw new ConflictError(
            ERR.RES_ALREADY_RESERVED,
            409,
            existingReservation
              ? `Member already has an active reservation for this book (position #${existingReservation.queuePosition})`
              : 'Member already has an active hold for this book',
          );
        }

        const lastWaitingReservation = await this.repository.findLastWaitingReservationByBookId(book._id, session);
        const queuePosition = (lastWaitingReservation?.queuePosition ?? 0) + 1;
        const createdReservation = await this.repository.createReservation(
          {
            memberId: member._id,
            bookId: book._id,
            copyId: null,
            queuePosition,
            status: ReservationStatus.Waiting,
            requestDate: now,
            notifiedAt: null,
            holdExpiryAt: null,
          },
          session,
        );

        createdReservationId = createdReservation._id.toString();
      });
    } finally {
      await session.endSession();
    }

    if (!createdReservationId) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Reservation could not be created');
    }

    const result = await this.getReservationDetail(createdReservationId);
    this.writeAudit(actor, 'CREATE_RESERVATION', 'Reservation', createdReservationId, undefined, result);
    this.publishReservationEvent('created', result);
    await this.queueReservationCreatedNotifications(result, isBackofficeRole(actor?.actorRole));

    return result;
  }

  async cancelReservation(reservationId: string, actor?: RequestActor): Promise<ReservationDetail> {
    const currentReservation = await this.repository.findReservationById(reservationId);

    if (!currentReservation) {
      throw new NotFoundError(ERR.RES_NOT_FOUND, 404, 'Reservation not found');
    }

    this.assertCanCancelReservation(actor, currentReservation);

    if (
      currentReservation.status !== ReservationStatus.Waiting &&
      currentReservation.status !== ReservationStatus.Notified
    ) {
      throw new BusinessRuleError(ERR.RES_CANNOT_CANCEL, 422, 'Reservation cannot be cancelled');
    }

    const heldCopyId =
      currentReservation.status === ReservationStatus.Notified
        ? await this.resolveHeldCopyIdOrThrow(currentReservation)
        : null;

    const session = await mongoose.startSession();
    let nextNotifiedReservationId: string | null = null;

    try {
      await session.withTransaction(async () => {
        const cancelledReservation = await this.repository.cancelActiveReservationById(reservationId, session);

        if (!cancelledReservation) {
          throw new BusinessRuleError(ERR.RES_CANNOT_CANCEL, 422, 'Reservation cannot be cancelled');
        }

        await this.repository.decrementWaitingQueuePositions(
          currentReservation.bookId,
          currentReservation.queuePosition,
          session,
        );

        if (heldCopyId) {
          const notifyResult = await this.notifyNextInSession(currentReservation.bookId.toString(), heldCopyId, session);
          nextNotifiedReservationId = notifyResult.reservationId;
        }
      });
    } finally {
      await session.endSession();
    }

    const result = await this.getReservationDetail(reservationId);
    this.writeAudit(
      actor,
      'CANCEL_RESERVATION',
      'Reservation',
      reservationId,
      this.toReservationAuditSnapshot(currentReservation),
      result,
    );

    if (nextNotifiedReservationId) {
      const nextReservation = await this.getReservationDetail(nextNotifiedReservationId);
      this.writeAudit(actor, 'NOTIFY_RESERVATION', 'Reservation', nextNotifiedReservationId, undefined, nextReservation);
      await this.queueReservationNotification(nextReservation);
      await this.queueBackofficeReservationStatusNotification(nextReservation, NotificationEvent.ReservationAdvanced);
    }

    await this.queueBackofficeReservationStatusNotification(result, NotificationEvent.ReservationCancelled);

    return result;
  }

  async notifyNext(bookId: string, copyId: string, actor?: RequestActor): Promise<ReservationDetail | null> {
    const session = await mongoose.startSession();
    let notifiedReservationId: string | null = null;

    try {
      await session.withTransaction(async () => {
        const result = await this.notifyNextInSession(bookId, copyId, session);
        notifiedReservationId = result.reservationId;
      });
    } finally {
      await session.endSession();
    }

    if (!notifiedReservationId) {
      return null;
    }

    const reservation = await this.getReservationDetail(notifiedReservationId);
    this.writeAudit(actor, 'NOTIFY_RESERVATION', 'Reservation', notifiedReservationId, undefined, reservation);
    await this.queueReservationNotification(reservation);
    await this.queueBackofficeReservationStatusNotification(reservation, NotificationEvent.ReservationAdvanced);

    return reservation;
  }

  async expireHold(reservationId: string, actor?: RequestActor): Promise<ReservationDetail> {
    const currentReservation = await this.repository.findReservationById(reservationId);

    if (!currentReservation) {
      throw new NotFoundError(ERR.RES_NOT_FOUND, 404, 'Reservation not found');
    }

    if (currentReservation.status !== ReservationStatus.Notified) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Only notified reservations can expire');
    }

    if (currentReservation.holdExpiryAt && currentReservation.holdExpiryAt.getTime() > Date.now()) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Reservation hold has not expired yet');
    }

    const heldCopyId = await this.resolveHeldCopyIdOrThrow(currentReservation);
    const session = await mongoose.startSession();
    let nextNotifiedReservationId: string | null = null;

    try {
      await session.withTransaction(async () => {
        const expiredReservation = await this.repository.expireNotifiedReservationById(reservationId, session);

        if (!expiredReservation) {
          throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Reservation hold could not be expired');
        }

        await this.repository.decrementWaitingQueuePositions(
          currentReservation.bookId,
          currentReservation.queuePosition,
          session,
        );

        const notifyResult = await this.notifyNextInSession(currentReservation.bookId.toString(), heldCopyId, session);
        nextNotifiedReservationId = notifyResult.reservationId;
      });
    } finally {
      await session.endSession();
    }

    const result = await this.getReservationDetail(reservationId);
    this.writeAudit(
      actor,
      'EXPIRE_RESERVATION',
      'Reservation',
      reservationId,
      this.toReservationAuditSnapshot(currentReservation),
      result,
    );

    if (nextNotifiedReservationId) {
      const nextReservation = await this.getReservationDetail(nextNotifiedReservationId);
      this.writeAudit(actor, 'NOTIFY_RESERVATION', 'Reservation', nextNotifiedReservationId, undefined, nextReservation);
      await this.queueReservationNotification(nextReservation);
      await this.queueBackofficeReservationStatusNotification(nextReservation, NotificationEvent.ReservationAdvanced);
    }

    await this.queueBackofficeReservationStatusNotification(result, NotificationEvent.ReservationExpired);

    return result;
  }

  async getMyReservations(memberId: string, query: ReservationHistoryQuery) {
    return this.listReservationHistory(query, memberId);
  }

  async getAllReservations(query: ListReservationsQuery) {
    const pagination = buildPagination(query);
    const filter = this.buildReservationFilter(query, query.memberId, query.bookId);
    const { reservations, total } = await this.repository.listReservations({
      filter,
      page: pagination.page,
      limit: pagination.limit,
    });
    const items = await this.buildReservationItems(reservations);

    return buildPaginationResult(items, total, pagination);
  }

  private async listReservationHistory(query: ReservationHistoryQuery, memberId: string) {
    const pagination = buildPagination(query);
    const filter = this.buildReservationFilter(query, memberId);
    const { reservations, total } = await this.repository.listReservations({
      filter,
      page: pagination.page,
      limit: pagination.limit,
    });
    const items = await this.buildReservationItems(reservations);

    return buildPaginationResult(items, total, pagination);
  }

  private buildReservationFilter(
    query: ReservationHistoryQuery,
    memberId?: string,
    bookId?: string,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (memberId) {
      filter.memberId = new Types.ObjectId(memberId);
    }

    if (bookId) {
      filter.bookId = new Types.ObjectId(bookId);
    }

    if (query.status) {
      filter.status = query.status;
      return filter;
    }

    if (query.scope === 'active') {
      filter.status = { $in: [...ACTIVE_RESERVATION_STATUSES] };
    } else if (query.scope === 'history') {
      filter.status = { $in: [...HISTORY_RESERVATION_STATUSES] };
    }

    return filter;
  }

  async getReservationDetail(reservationId: string): Promise<ReservationDetail> {
    const reservation = await this.repository.findReservationById(reservationId);

    if (!reservation) {
      throw new NotFoundError(ERR.RES_NOT_FOUND, 404, 'Reservation not found');
    }

    const [item] = await this.buildReservationItems([reservation]);

    if (!item) {
      throw new NotFoundError(ERR.RES_NOT_FOUND, 404, 'Reservation not found');
    }

    return item;
  }

  private async buildReservationItems(reservations: ReservationDocument[]): Promise<ReservationListItem[]> {
    if (reservations.length === 0) {
      return [];
    }

    const memberIds = uniqueObjectIds(reservations.map((reservation) => reservation.memberId));
    const bookIds = uniqueObjectIds(reservations.map((reservation) => reservation.bookId));
    const copyIds = uniqueObjectIds(
      reservations
        .map((reservation) => reservation.copyId)
        .filter((copyId): copyId is Types.ObjectId => copyId instanceof Types.ObjectId),
    );

    const [members, books, copies] = await Promise.all([
      this.repository.findMembersByIds(memberIds),
      this.repository.findBooksByIds(bookIds),
      this.repository.findCopiesByIds(copyIds),
    ]);

    const [authorsByBook, categoriesByBook, queueTotalByBook] = await Promise.all([
      buildBookAuthorsMap(books),
      buildBookCategoriesMap(books),
      this.repository.countActiveReservationsByBookIds(bookIds),
    ]);

    const memberMap = new Map<string, ReservationMemberRef>(
      members.map((member) => [member._id.toString(), createReservationMemberRef(member)]),
    );
    const bookMap = new Map<string, ReservationBookRef>(
      books.map((book) => [
        book._id.toString(),
        createReservationBookRef(
          book,
          authorsByBook.get(book._id.toString()) ?? [],
          categoriesByBook.get(book._id.toString()) ?? [],
        ),
      ]),
    );
    const copyMap = new Map<string, ReservationCopyRef>(
      copies.map((copy) => [copy._id.toString(), createReservationCopyRef(copy)]),
    );

    return reservations.map((reservation) => ({
      _id: reservation._id.toString(),
      member: getRequiredMapValue(memberMap, reservation.memberId.toString(), 'Reservation member not found'),
      book: getRequiredMapValue(bookMap, reservation.bookId.toString(), 'Reservation book not found'),
      copy: reservation.copyId ? copyMap.get(reservation.copyId.toString()) : undefined,
      queuePosition: reservation.queuePosition,
      queueTotal: queueTotalByBook.get(reservation.bookId.toString()) ?? 0,
      status: reservation.status,
      requestDate: reservation.requestDate,
      notifiedAt: reservation.notifiedAt,
      holdExpiryAt: reservation.holdExpiryAt,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
    }));
  }

  private async notifyNextInSession(bookId: string, copyId: string, session: ClientSession): Promise<NotifyNextResult> {
    const nextWaitingReservation = await this.repository.findNextWaitingReservationByBookId(bookId, session);

    if (!nextWaitingReservation) {
      const releasedCopy = await this.repository.updateCopyStatusIfCurrent(
        copyId,
        [CopyStatus.Available, CopyStatus.Reserved, CopyStatus.Borrowed],
        CopyStatus.Available,
        session,
      );

      if (!releasedCopy) {
        throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Held copy could not be released');
      }

      return { reservationId: null };
    }

    const now = new Date();
    const holdExpiryAt = addHours(now, env.HOLD_EXPIRY_HOURS);
    const notifiedReservation = await this.repository.notifyReservationById(
      nextWaitingReservation._id.toString(),
      copyId,
      now,
      holdExpiryAt,
      session,
    );

    if (!notifiedReservation) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Reservation queue could not be advanced');
    }

    const reservedCopy = await this.repository.updateCopyStatusIfCurrent(
      copyId,
      [CopyStatus.Available, CopyStatus.Reserved, CopyStatus.Borrowed],
      CopyStatus.Reserved,
      session,
    );

    if (!reservedCopy) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Book copy could not be reserved');
    }

    return { reservationId: notifiedReservation._id.toString() };
  }

  private async resolveHeldCopyIdOrThrow(reservation: ReservationDocument): Promise<string> {
    if (reservation.copyId) {
      return reservation.copyId.toString();
    }

    const reservedCopy = await this.repository.findReservedCopyByBookId(reservation.bookId);

    if (!reservedCopy) {
      throw new BadRequestError(ERR.COMMON_BAD_REQUEST, 400, 'Held copy not found for reservation');
    }

    return reservedCopy._id.toString();
  }

  private assertReservationAllowed(member: MemberDocument): void {
    if (member.isBlocked) {
      throw new BusinessRuleError(ERR.RES_MEMBER_BLOCKED, 422, 'Member is blocked from creating reservations');
    }

    if (member.status !== MemberStatus.Active) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Member cannot create reservations in the current status');
    }
  }

  private assertCanCancelReservation(actor: RequestActor | undefined, reservation: ReservationDocument): void {
    if (isBorrowerRole(actor?.actorRole)) {
      if (!actor?.actorId || actor.actorId !== reservation.memberId.toString()) {
        throw new ForbiddenError(ERR.AUTH_FORBIDDEN, 403, 'You can only cancel your own reservations');
      }
    }
  }

  private async queueReservationNotification(reservation: ReservationDetail): Promise<void> {
    try {
      await notificationService.enqueueBookAvailable(
        reservation.member._id,
        reservation._id,
        reservation.book.title,
        reservation.copy?.shelfLocation,
        reservation.holdExpiryAt,
      );
    } catch (error) {
      logger.error(
        { err: error, reservationId: reservation._id },
        'Failed to enqueue reservation notification',
      );
    }
  }

  private publishReservationEvent(action: string, reservation: ReservationDetail): void {
    const payload = {
      memberId: reservation.member._id,
      bookId: reservation.book._id,
      status: reservation.status,
      queuePosition: reservation.queuePosition,
    };

    realtimeHub.emitBackofficeEvent({
      type: NotificationEvent.ReservationRequested,
      resource: 'reservation',
      action,
      referenceId: reservation._id,
      payload,
    });

    realtimeHub.emitUserEvent(reservation.member._id, {
      type: NotificationEvent.ReservationCreated,
      resource: 'reservation',
      action,
      referenceId: reservation._id,
      payload,
    });
  }

  private async queueReservationCreatedNotifications(reservation: ReservationDetail, createdByBackoffice: boolean): Promise<void> {
    try {
      await notificationService.enqueueReservationCreated(
        reservation.member._id,
        reservation._id,
        reservation.book.title,
        createdByBackoffice,
      );

      await notificationService.enqueueReservationRequestedForBackoffice(
        reservation._id,
        reservation.member.fullName,
        reservation.member.memberCardNo,
        reservation.book.title,
      );
    } catch (error) {
      logger.error(
        { err: error, reservationId: reservation._id },
        'Failed to enqueue reservation created notification',
      );
    }
  }

  private async queueBackofficeReservationStatusNotification(
    reservation: ReservationDetail,
    eventType:
      | NotificationEvent.ReservationAdvanced
      | NotificationEvent.ReservationCancelled
      | NotificationEvent.ReservationExpired
      | NotificationEvent.ReservationFulfilled,
  ): Promise<void> {
    try {
      await notificationService.enqueueReservationStatusForBackoffice(
        eventType,
        reservation._id,
        reservation.member.fullName,
        reservation.member.memberCardNo,
        reservation.book.title,
      );
    } catch (error) {
      logger.error(
        { err: error, reservationId: reservation._id, eventType },
        'Failed to enqueue backoffice reservation status notification',
      );
    }
  }

  private toReservationAuditSnapshot(reservation: ReservationDocument) {
    return {
      _id: reservation._id.toString(),
      memberId: reservation.memberId.toString(),
      bookId: reservation.bookId.toString(),
      copyId: reservation.copyId?.toString() ?? null,
      queuePosition: reservation.queuePosition,
      status: reservation.status,
      requestDate: reservation.requestDate,
      notifiedAt: reservation.notifiedAt,
      holdExpiryAt: reservation.holdExpiryAt,
      createdAt: reservation.createdAt,
      updatedAt: reservation.updatedAt,
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
      before: before as Record<string, unknown> | undefined,
      after: after as Record<string, unknown> | undefined,
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });
  }
}

export const reservationService = new ReservationService();
