import mongoose, { Types } from 'mongoose';

import {
  BadRequestError,
  BusinessRuleError,
  ForbiddenError,
  NotFoundError,
} from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import {
  CopyStatus,
  FineStatus,
  LoanStatus,
  MemberStatus,
  Role,
} from '../../common/types/enums';
import { writeAuditLog } from '../../common/utils/auditLogger';
import { getRequiredMapValue, uniqueObjectIds } from '../../common/utils/collectionHelpers';
import { addDays, addHours } from '../../common/utils/dateHelpers';
import { buildOverdueDates, getApplicableFineRate } from '../../common/utils/loanFine';
import { buildMemberCacheKey } from '../../common/utils/memberCache';
import { recalculateMemberBlock, type BlockRecalculationResult } from '../../common/utils/memberBlock';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import { logger } from '../../common/middleware/requestLogger';
import { env } from '../../config/env';
import { getRedisClient } from '../../config/redis';
import type { BookDocument } from '../../models/Book.model';
import type { BookCopyDocument } from '../../models/BookCopy.model';
import type { FineRecordDocument } from '../../models/FineRecord.model';
import type { LoanRecordDocument } from '../../models/LoanRecord.model';
import type { MemberDocument } from '../../models/Member.model';
import { notificationService } from '../notification/notification.service';
import { loanRepository, type LoanRepository } from './loan.repository';
import type {
  CheckoutLoanDto,
  ListLoansQuery,
  LoanBookRef,
  LoanCopyRef,
  LoanDetail,
  LoanFineView,
  LoanHistoryQuery,
  LoanListItem,
  LoanMemberRef,
  LoanPolicyRole,
  MarkLostDto,
  RequestActor,
  ReturnByBarcodeDto,
} from './loan.types';

function normalizeLoanStatus(loan: Pick<LoanRecordDocument, 'status' | 'dueDate' | 'returnDate'>): LoanStatus {
  if (loan.returnDate) {
    return loan.status;
  }

  if (loan.status === LoanStatus.Active && loan.dueDate.getTime() < Date.now()) {
    return LoanStatus.Overdue;
  }

  return loan.status;
}

function createLoanMemberRef(member: MemberDocument): LoanMemberRef {
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

function createLoanBookRef(book: BookDocument): LoanBookRef {
  return {
    _id: book._id.toString(),
    isbn: book.isbn,
    title: book.title,
    bookValue: book.bookValue,
  };
}

function createLoanCopyRef(copy: BookCopyDocument): LoanCopyRef {
  return {
    _id: copy._id.toString(),
    barcode: copy.barcode,
    status: copy.status,
    shelfLocation: copy.shelfLocation,
  };
}

function createLoanFineView(fine: FineRecordDocument): LoanFineView {
  return {
    _id: fine._id.toString(),
    overdueDate: fine.overdueDate,
    amount: fine.amount,
    status: fine.status,
    paidAt: fine.paidAt,
    note: fine.note,
    createdAt: fine.createdAt,
  };
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function isBorrowerRole(role: Role | undefined): role is LoanPolicyRole {
  return role === Role.Student || role === Role.Lecturer || role === Role.Librarian;
}

export class LoanService {
  constructor(private readonly repository: LoanRepository = loanRepository) {}

  async checkout(input: CheckoutLoanDto, actor?: RequestActor): Promise<LoanDetail> {
    const now = new Date();
    const session = await mongoose.startSession();
    let createdLoanId: string | null = null;

    try {
      await session.withTransaction(async () => {
        const copy = await this.repository.findBookCopyByBarcode(input.barcode, session);

        if (!copy) {
          throw new NotFoundError(ERR.CAT_COPY_NOT_FOUND, 404, 'Book copy not found');
        }

        const member = await this.repository.findMemberById(input.memberId, session);

        if (!member) {
          throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
        }

        if (member.status !== MemberStatus.Active) {
          throw new BusinessRuleError(ERR.LOAN_MEMBER_SUSPENDED, 422, 'Member is not eligible to borrow');
        }

        if (member.isBlocked) {
          throw new BusinessRuleError(ERR.LOAN_MEMBER_BLOCKED, 422, 'Member is blocked from new checkouts');
        }

        if (!isBorrowerRole(member.role)) {
          throw new BadRequestError(ERR.COMMON_BAD_REQUEST, 400, 'Loan policy is not configured for this member role');
        }

        const policy = await this.repository.findLoanPolicyByRole(member.role, session);
        const memberId = member._id.toString();
        const copyId = copy._id.toString();

        if (!policy) {
          throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Loan policy not found');
        }

        const activeLoanCount = await this.repository.countActiveLoans(memberId, session);

        if (activeLoanCount >= policy.maxBooks) {
          throw new BusinessRuleError(ERR.LOAN_MAX_BOOKS, 422, 'Member has reached the loan limit');
        }

        if (await this.repository.hasActiveLoanForBook(memberId, copy.bookId, session)) {
          throw new BusinessRuleError(ERR.LOAN_DUPLICATE_BOOK, 422, 'Member already has an active loan for this book');
        }

        let borrowedCopy: BookCopyDocument | null = null;
        let reservationId: string | null = null;

        if (copy.status === CopyStatus.Available) {
          borrowedCopy = await this.repository.updateCopyStatusIfCurrent(
            copyId,
            [CopyStatus.Available],
            CopyStatus.Borrowed,
            session,
          );
        } else if (copy.status === CopyStatus.Reserved) {
          const reservation = await this.repository.findNotifiedReservationForMemberBook(
            memberId,
            copy.bookId,
            copyId,
            now,
            session,
          );

          if (!reservation) {
            throw new BusinessRuleError(ERR.LOAN_COPY_NOT_AVAILABLE, 422, 'Book copy is not available for checkout');
          }

          borrowedCopy = await this.repository.updateCopyStatusIfCurrent(
            copyId,
            [CopyStatus.Reserved],
            CopyStatus.Borrowed,
            session,
          );
          reservationId = reservation._id.toString();
        } else {
          throw new BusinessRuleError(ERR.LOAN_COPY_NOT_AVAILABLE, 422, 'Book copy is not available for checkout');
        }

        if (!borrowedCopy) {
          throw new BusinessRuleError(ERR.LOAN_COPY_NOT_AVAILABLE, 422, 'Book copy is not available for checkout');
        }

        const createdLoan = await this.repository.createLoanRecord(
          {
            memberId: member._id,
            copyId: borrowedCopy._id,
            bookId: borrowedCopy.bookId,
            checkoutDate: now,
            dueDate: addDays(now, policy.loanDays),
            returnDate: null,
            status: LoanStatus.Active,
            renewCount: 0,
            policyLoanDays: policy.loanDays,
            policyMaxRenewals: policy.maxRenewals,
            policyRenewDays: policy.renewDays,
          },
          session,
        );

        createdLoanId = createdLoan._id.toString();

        if (reservationId) {
          await this.repository.fulfillReservationById(reservationId, session);
        }
      });
    } finally {
      await session.endSession();
    }

    if (!createdLoanId) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Checkout failed');
    }

    const result = await this.getLoanDetail(createdLoanId);

    this.writeAudit(actor, 'CHECKOUT', 'LoanRecord', createdLoanId, undefined, result);
    await this.enqueueCheckoutNotification(result);

    return result;
  }

  async returnByLoanId(loanId: string, actor?: RequestActor): Promise<LoanDetail> {
    return this.returnLoanInternal(loanId, actor);
  }

  async returnByBarcode(input: ReturnByBarcodeDto, actor?: RequestActor): Promise<LoanDetail> {
    const copy = await this.repository.findBookCopyByBarcode(input.barcode);

    if (!copy) {
      throw new NotFoundError(ERR.CAT_COPY_NOT_FOUND, 404, 'Book copy not found');
    }

    const loan = await this.repository.findActiveLoanByCopyId(copy._id.toString());

    if (!loan) {
      throw new NotFoundError(ERR.LOAN_NOT_FOUND, 404, 'Active loan not found for this barcode');
    }

    return this.returnLoanInternal(loan._id.toString(), actor);
  }

  async renewLoan(loanId: string, actor?: RequestActor): Promise<LoanDetail> {
    const loan = await this.repository.findLoanById(loanId);

    if (!loan) {
      throw new NotFoundError(ERR.LOAN_NOT_FOUND, 404, 'Loan not found');
    }

    this.assertCanManageLoan(actor, loan);

    const member = await this.repository.findMemberById(loan.memberId);

    if (!member) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    if (member.status !== MemberStatus.Active) {
      throw new BusinessRuleError(ERR.LOAN_MEMBER_SUSPENDED, 422, 'Member cannot renew loans in the current status');
    }

    if (loan.status === LoanStatus.Returned || loan.status === LoanStatus.Lost) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Loan is no longer renewable');
    }

    if (loan.status === LoanStatus.Overdue || loan.dueDate.getTime() < Date.now()) {
      throw new BusinessRuleError(ERR.LOAN_RENEW_OVERDUE, 422, 'Overdue loans cannot be renewed');
    }

    if (loan.renewCount >= loan.policyMaxRenewals) {
      throw new BusinessRuleError(ERR.LOAN_RENEW_MAX, 422, 'Maximum renewals reached');
    }

    if (await this.repository.hasWaitingReservationForBook(loan.bookId)) {
      throw new BusinessRuleError(ERR.LOAN_RENEW_HAS_RESERVATION, 422, 'Loan cannot be renewed because the book is reserved');
    }

    const renewedLoan = await this.repository.renewLoanById(
      loan._id.toString(),
      addDays(loan.dueDate, loan.policyRenewDays),
      loan.renewCount + 1,
    );

    if (!renewedLoan) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Loan could not be renewed');
    }

    const renewedLoanId = renewedLoan._id.toString();
    const result = await this.getLoanDetail(renewedLoanId);

    this.writeAudit(actor, 'RENEW_LOAN', 'LoanRecord', renewedLoanId, this.toLoanAuditSnapshot(loan), result);

    return result;
  }

  async markLost(loanId: string, input: MarkLostDto, actor?: RequestActor): Promise<LoanDetail> {
    const currentLoan = await this.repository.findLoanById(loanId);

    if (!currentLoan) {
      throw new NotFoundError(ERR.LOAN_NOT_FOUND, 404, 'Loan not found');
    }

    if (currentLoan.status === LoanStatus.Returned || currentLoan.status === LoanStatus.Lost) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Loan is no longer active');
    }

    const member = await this.repository.findMemberById(currentLoan.memberId);

    if (!member) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    const book = await this.repository.findBookById(currentLoan.bookId);

    if (!book) {
      throw new NotFoundError(ERR.CAT_BOOK_NOT_FOUND, 404, 'Book not found');
    }

    const resolvedBookValue = book.bookValue ?? input.bookValue;

    if (resolvedBookValue === undefined) {
      throw new BadRequestError(
        ERR.COMMON_BAD_REQUEST,
        400,
        'Book value is required to mark this loan as lost',
      );
    }

    const now = new Date();
    const session = await mongoose.startSession();
    let blockChange: BlockRecalculationResult | null = null;

    try {
      await session.withTransaction(async () => {
        const lostLoan = await this.repository.markLoanLost(currentLoan._id.toString(), input.notes, session);

        if (!lostLoan) {
          throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Loan could not be marked as lost');
        }

        const updatedCopy = await this.repository.updateCopyStatusIfCurrent(
          lostLoan.copyId,
          [CopyStatus.Borrowed],
          CopyStatus.Lost,
          session,
        );

        if (!updatedCopy) {
          throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Book copy could not be marked as lost');
        }

        await this.repository.createFineRecords(
          [
            {
              loanId: lostLoan._id,
              memberId: lostLoan.memberId,
              overdueDate: now,
              amount: resolvedBookValue,
              status: FineStatus.Unpaid,
              note: input.notes ? `Mất sách: ${input.notes}` : 'Mất sách',
            },
          ],
          session,
        );

        blockChange = await recalculateMemberBlock(member._id.toString(), this.repository, session);
      });
    } finally {
      await session.endSession();
    }

    const lostBlockChange = blockChange as BlockRecalculationResult | null;

    if (lostBlockChange && lostBlockChange.changed) {
      await this.invalidateMemberCache(member._id.toString());
      this.writeAudit(
        actor,
        lostBlockChange.isBlocked ? 'BLOCK_MEMBER' : 'UNBLOCK_MEMBER',
        'Member',
        member._id.toString(),
        { isBlocked: lostBlockChange.wasBlocked, reason: 'fine threshold' },
        { isBlocked: lostBlockChange.isBlocked, reason: 'fine threshold' },
      );
      await this.enqueueMemberBlockStatusNotification(member._id.toString(), lostBlockChange);
    }

    const currentLoanId = currentLoan._id.toString();
    const result = await this.getLoanDetail(currentLoanId);

    this.writeAudit(actor, 'MARK_LOST', 'LoanRecord', currentLoanId, this.toLoanAuditSnapshot(currentLoan), result);

    return result;
  }

  async getMyLoans(memberId: string, query: LoanHistoryQuery) {
    return this.getLoanHistory(memberId, query);
  }

  async listLoans(query: ListLoansQuery) {
    const pagination = buildPagination(query);
    const filter = this.buildLoanFilter(query, query.memberId);
    const { loans, total } = await this.repository.listLoans({
      filter,
      page: pagination.page,
      limit: pagination.limit,
    });
    const items = await this.buildLoanListItems(loans);

    return buildPaginationResult(items, total, pagination);
  }

  async getLoanDetail(loanId: string): Promise<LoanDetail> {
    const loan = await this.repository.findLoanById(loanId);

    if (!loan) {
      throw new NotFoundError(ERR.LOAN_NOT_FOUND, 404, 'Loan not found');
    }

    const [item] = await this.buildLoanDetails([loan]);

    if (!item) {
      throw new NotFoundError(ERR.LOAN_NOT_FOUND, 404, 'Loan not found');
    }

    return item;
  }

  private async getLoanHistory(memberId: string, query: LoanHistoryQuery) {
    const pagination = buildPagination(query);
    const filter = this.buildLoanFilter(query, memberId);
    const { loans, total } = await this.repository.listLoans({
      filter,
      page: pagination.page,
      limit: pagination.limit,
    });
    const items = await this.buildLoanListItems(loans);

    return buildPaginationResult(items, total, pagination);
  }

  private buildLoanFilter(query: LoanHistoryQuery, memberId?: string): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (memberId) {
      filter.memberId = new Types.ObjectId(memberId);
    }

    if (query.status === LoanStatus.Overdue) {
      filter.$or = [
        { status: LoanStatus.Overdue },
        {
          status: LoanStatus.Active,
          dueDate: { $lt: new Date() },
          returnDate: null,
        },
      ];
    } else if (query.status === LoanStatus.Active) {
      filter.status = LoanStatus.Active;
      filter.dueDate = { $gte: new Date() };
      filter.returnDate = null;
    } else if (query.status) {
      filter.status = query.status;
    }

    return filter;
  }

  private async returnLoanInternal(loanId: string, actor?: RequestActor): Promise<LoanDetail> {
    const currentLoan = await this.repository.findLoanById(loanId);

    if (!currentLoan) {
      throw new NotFoundError(ERR.LOAN_NOT_FOUND, 404, 'Loan not found');
    }

    if (currentLoan.status === LoanStatus.Returned) {
      throw new BusinessRuleError(ERR.LOAN_ALREADY_RETURNED, 422, 'Loan has already been returned');
    }

    if (currentLoan.status === LoanStatus.Lost) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Lost loans cannot be returned');
    }

    const member = await this.repository.findMemberById(currentLoan.memberId);

    if (!member) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    const now = new Date();
    const session = await mongoose.startSession();
    let blockChange: BlockRecalculationResult | null = null;
    let notifiedReservationId: string | null = null;

    try {
      await session.withTransaction(async () => {
        const returnedLoan = await this.repository.markLoanReturned(currentLoan._id.toString(), now, session);

        if (!returnedLoan) {
          throw new BusinessRuleError(ERR.LOAN_ALREADY_RETURNED, 422, 'Loan has already been returned');
        }

        const overdueDates = buildOverdueDates(currentLoan.dueDate, now);

        if (overdueDates.length > 0) {
          const latestOverdueDate = overdueDates.at(-1);

          if (!latestOverdueDate) {
            throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Overdue fine calculation failed');
          }

          const fineRates = await this.repository.findFineRatesEffectiveOnOrBefore(latestOverdueDate, session);
          const fineRecords: Array<{
            loanId: Types.ObjectId;
            memberId: Types.ObjectId;
            overdueDate: Date;
            amount: number;
            status: FineStatus;
            note: string;
          }> = [];

          for (const overdueDate of overdueDates) {
            const fineRate = getApplicableFineRate(fineRates, overdueDate);

            fineRecords.push({
              loanId: returnedLoan._id,
              memberId: returnedLoan.memberId,
              overdueDate,
              amount: fineRate.ratePerDay,
              status: FineStatus.Unpaid,
              note: 'Quá hạn',
            });
          }

          try {
            await this.repository.createFineRecords(fineRecords, session);
          } catch (error) {
            if (!isDuplicateKeyError(error)) {
              throw error;
            }
          }

          blockChange = await recalculateMemberBlock(member._id.toString(), this.repository, session);
        }

        const waitingReservation = await this.repository.findWaitingReservationByBookId(currentLoan.bookId, session);

        if (waitingReservation) {
          const holdExpiryAt = addHours(now, env.HOLD_EXPIRY_HOURS);
          const notifiedReservation = await this.repository.notifyReservationById(
            waitingReservation._id.toString(),
            currentLoan.copyId,
            now,
            holdExpiryAt,
            session,
          );

          if (!notifiedReservation) {
            throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Reservation queue could not be advanced');
          }

          notifiedReservationId = notifiedReservation._id.toString();

          const reservedCopy = await this.repository.updateCopyStatusIfCurrent(
            currentLoan.copyId,
            [CopyStatus.Borrowed],
            CopyStatus.Reserved,
            session,
          );

          if (!reservedCopy) {
            throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Book copy could not be reserved');
          }
        } else {
          const availableCopy = await this.repository.updateCopyStatusIfCurrent(
            currentLoan.copyId,
            [CopyStatus.Borrowed],
            CopyStatus.Available,
            session,
          );

          if (!availableCopy) {
            throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Book copy could not be returned to inventory');
          }
        }
      });
    } finally {
      await session.endSession();
    }

    const returnBlockChange = blockChange as BlockRecalculationResult | null;

    if (returnBlockChange && returnBlockChange.changed) {
      await this.invalidateMemberCache(member._id.toString());
      this.writeAudit(
        actor,
        returnBlockChange.isBlocked ? 'BLOCK_MEMBER' : 'UNBLOCK_MEMBER',
        'Member',
        member._id.toString(),
        { isBlocked: returnBlockChange.wasBlocked, reason: 'fine threshold' },
        { isBlocked: returnBlockChange.isBlocked, reason: 'fine threshold' },
      );
      await this.enqueueMemberBlockStatusNotification(member._id.toString(), returnBlockChange);
    }

    if (notifiedReservationId) {
      await this.enqueueReservationAvailableNotification(notifiedReservationId);
    }

    const currentLoanId = currentLoan._id.toString();
    const result = await this.getLoanDetail(currentLoanId);

    this.writeAudit(actor, 'RETURN_BOOK', 'LoanRecord', currentLoanId, this.toLoanAuditSnapshot(currentLoan), result);

    return result;
  }

  private async buildLoanListItems(loans: LoanRecordDocument[]): Promise<LoanListItem[]> {
    const details = await this.buildLoanDetails(loans);
    return details.map((detail) => {
      const { fines, ...item } = detail;
      void fines;
      return item;
    });
  }

  private async buildLoanDetails(loans: LoanRecordDocument[]): Promise<LoanDetail[]> {
    if (loans.length === 0) {
      return [];
    }

    const memberIds = uniqueObjectIds(loans.map((loan) => loan.memberId));
    const bookIds = uniqueObjectIds(loans.map((loan) => loan.bookId));
    const copyIds = uniqueObjectIds(loans.map((loan) => loan.copyId));
    const loanIds = uniqueObjectIds(loans.map((loan) => loan._id));

    const [members, books, copies, fineRecords] = await Promise.all([
      this.repository.findMembersByIds(memberIds),
      this.repository.findBooksByIds(bookIds),
      this.repository.findCopiesByIds(copyIds),
      this.repository.findFineRecordsByLoanIds(loanIds),
    ]);

    const memberMap = new Map<string, LoanMemberRef>(members.map((member) => [member._id.toString(), createLoanMemberRef(member)]));
    const bookMap = new Map<string, LoanBookRef>(books.map((book) => [book._id.toString(), createLoanBookRef(book)]));
    const copyMap = new Map<string, LoanCopyRef>(copies.map((copy) => [copy._id.toString(), createLoanCopyRef(copy)]));
    const fineMap = new Map<string, LoanFineView[]>();

    for (const fine of fineRecords) {
      const loanFineList = fineMap.get(fine.loanId.toString()) ?? ([] as LoanFineView[]);
      loanFineList.push(createLoanFineView(fine));
      fineMap.set(fine.loanId.toString(), loanFineList);
    }

    return loans.map((loan) => {
      const member = getRequiredMapValue(memberMap, loan.memberId.toString(), 'Loan member not found');
      const book = getRequiredMapValue(bookMap, loan.bookId.toString(), 'Loan book not found');
      const copy = getRequiredMapValue(copyMap, loan.copyId.toString(), 'Loan copy not found');
      const fines = fineMap.get(loan._id.toString()) ?? [];
      const unpaidFineTotal = fines
        .filter((fine) => fine.status === FineStatus.Unpaid)
        .reduce((total, fine) => total + fine.amount, 0);

      return {
        _id: loan._id.toString(),
        member,
        book,
        copy,
        checkoutDate: loan.checkoutDate,
        dueDate: loan.dueDate,
        returnDate: loan.returnDate,
        status: normalizeLoanStatus(loan),
        renewCount: loan.renewCount,
        policyLoanDays: loan.policyLoanDays,
        policyMaxRenewals: loan.policyMaxRenewals,
        policyRenewDays: loan.policyRenewDays,
        notes: loan.notes,
        fineCount: fines.length,
        unpaidFineTotal,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
        fines,
      };
    });
  }

  private assertCanManageLoan(actor: RequestActor | undefined, loan: LoanRecordDocument): void {
    const actorRole = actor?.actorRole;
    const actorId = actor?.actorId;

    if (actorRole === Role.Student || actorRole === Role.Lecturer) {
      if (!actorId || actorId !== loan.memberId.toString()) {
        throw new ForbiddenError(ERR.AUTH_FORBIDDEN, 403, 'You can only manage your own loans');
      }
    }
  }

  private async invalidateMemberCache(memberId: string): Promise<void> {
    try {
      await getRedisClient().del(buildMemberCacheKey(memberId));
    } catch {
      return;
    }
  }

  private async enqueueCheckoutNotification(loan: LoanDetail): Promise<void> {
    try {
      await notificationService.enqueueCheckoutConfirmation(
        loan.member._id,
        loan._id,
        [
          {
            title: loan.book.title,
            barcode: loan.copy.barcode,
            dueDate: loan.dueDate,
          },
        ],
      );
    } catch (error) {
      logger.error({ err: error, loanId: loan._id }, 'Failed to enqueue checkout confirmation');
    }
  }

  private async enqueueReservationAvailableNotification(reservationId: string): Promise<void> {
    try {
      const reservation = await this.repository.findReservationById(reservationId);

      if (!reservation) {
        return;
      }

      const [book, copy] = await Promise.all([
        this.repository.findBookById(reservation.bookId),
        reservation.copyId ? this.repository.findBookCopyById(reservation.copyId) : Promise.resolve(null),
      ]);

      if (!book) {
        return;
      }

      await notificationService.enqueueBookAvailable(
        reservation.memberId.toString(),
        reservation._id.toString(),
        book.title,
        copy?.shelfLocation,
        reservation.holdExpiryAt,
      );
    } catch (error) {
      logger.error(
        { err: error, reservationId },
        'Failed to enqueue reservation availability notification',
      );
    }
  }

  private async enqueueMemberBlockStatusNotification(
    memberId: string,
    blockChange: BlockRecalculationResult,
  ): Promise<void> {
    try {
      if (blockChange.isBlocked) {
        await notificationService.enqueueAccountBlocked(
          memberId,
          memberId,
          'Outstanding unpaid fines exceeded the allowed threshold.',
          blockChange.totalUnpaid,
        );
        return;
      }

      await notificationService.enqueueAccountActivated(memberId, memberId);
    } catch (error) {
      logger.error(
        { err: error, memberId, isBlocked: blockChange.isBlocked },
        'Failed to enqueue member block status notification',
      );
    }
  }

  private toLoanAuditSnapshot(loan: LoanRecordDocument) {
    return {
      _id: loan._id.toString(),
      memberId: loan.memberId.toString(),
      copyId: loan.copyId.toString(),
      bookId: loan.bookId.toString(),
      checkoutDate: loan.checkoutDate,
      dueDate: loan.dueDate,
      returnDate: loan.returnDate,
      status: loan.status,
      renewCount: loan.renewCount,
      policyLoanDays: loan.policyLoanDays,
      policyMaxRenewals: loan.policyMaxRenewals,
      policyRenewDays: loan.policyRenewDays,
      notes: loan.notes,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
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

export const loanService = new LoanService();
