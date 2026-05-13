import mongoose, { Types } from 'mongoose';

import {
  BadRequestError,
  BusinessRuleError,
  NotFoundError,
} from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { FineStatus } from '../../common/types/enums';
import { writeAuditLog } from '../../common/utils/auditLogger';
import { getRequiredMapValue, uniqueObjectIds } from '../../common/utils/collectionHelpers';
import { buildMemberCacheKey } from '../../common/utils/memberCache';
import { buildBookAuthorsMap } from '../../common/utils/bookAuthors';
import type { BookNameRef } from '../../common/utils/bookAuthors';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import { logger } from '../../common/middleware/requestLogger';
import { getRedisClient } from '../../config/redis';
import type { BookDocument } from '../../models/Book.model';
import type { FineRateDocument } from '../../models/FineRate.model';
import type { FineRecordDocument } from '../../models/FineRecord.model';
import type { LoanRecordDocument } from '../../models/LoanRecord.model';
import type { MemberDocument } from '../../models/Member.model';
import { recalculateMemberBlock, type BlockRecalculationResult } from '../../common/utils/memberBlock';
import { notificationService } from '../notification/notification.service';
import { fineRepository, type FineRepository } from './fine.repository';
import type {
  CreateFineRateDto,
  FineBookRef,
  FineListItem,
  FineListResult,
  FineMemberRef,
  FineRateView,
  FineSummary,
  FineHistoryQuery,
  ListFinesQuery,
  PayFinesDto,
  PayFinesResult,
  RequestActor,
  WaiveFineDto,
} from './fine.types';

function createFineMemberRef(member: MemberDocument): FineMemberRef {
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

function createFineBookRef(book: BookDocument, authors: BookNameRef[]): FineBookRef {
  return {
    _id: book._id.toString(),
    isbn: book.isbn,
    title: book.title,
    bookValue: book.bookValue,
    authors,
  };
}

function createFineRateView(fineRate: FineRateDocument): FineRateView {
  return {
    _id: fineRate._id.toString(),
    ratePerDay: fineRate.ratePerDay,
    effectiveFrom: fineRate.effectiveFrom,
    appliesTo: fineRate.appliesTo,
  };
}

function isReasonTooShort(reason: string): boolean {
  return reason.trim().length < 10;
}

export class FineService {
  constructor(private readonly repository: FineRepository = fineRepository) {}

  async payFines(input: PayFinesDto, actor?: RequestActor): Promise<PayFinesResult> {
    const now = new Date();
    const session = await mongoose.startSession();
    const memberBlockChanges = new Map<string, BlockRecalculationResult>();

    try {
      await session.withTransaction(async () => {
        const fines = await this.repository.findFinesByIds(input.fineIds, session);

        if (fines.length !== input.fineIds.length) {
          throw new NotFoundError(ERR.FINE_NOT_FOUND, 404, 'One or more fines were not found');
        }

        this.assertAllFinesUnpaid(fines);

        await this.repository.markFinesPaid(input.fineIds, now, session);

        const memberIds = uniqueObjectIds(fines.map((fine) => fine.memberId));

        for (const memberId of memberIds) {
          const blockChange = await recalculateMemberBlock(memberId.toString(), this.repository, session);
          memberBlockChanges.set(memberId.toString(), blockChange);
        }
      });
    } finally {
      await session.endSession();
    }

    const updatedFines = await this.repository.findFinesByIds(input.fineIds);
    await this.handleBlockChangeAudits(memberBlockChanges, actor);

    const fineItems = await this.buildFineItems(updatedFines);

    for (const fine of fineItems) {
      this.writeAudit(actor, 'PAY_FINE', 'FineRecord', fine._id, undefined, fine);
    }

    return {
      updatedCount: fineItems.length,
      fines: fineItems,
    };
  }

  async waiveFine(fineId: string, input: WaiveFineDto, actor?: RequestActor): Promise<FineListItem> {
    if (isReasonTooShort(input.reason)) {
      throw new BadRequestError(ERR.FINE_WAIVE_NO_REASON, 400, 'Waive reason must be at least 10 characters');
    }

    if (!actor?.actorId) {
      throw new BadRequestError(ERR.COMMON_BAD_REQUEST, 400, 'Actor is required to waive a fine');
    }

    const currentFine = await this.repository.findFineById(fineId);

    if (!currentFine) {
      throw new NotFoundError(ERR.FINE_NOT_FOUND, 404, 'Fine not found');
    }

    this.assertFineUnpaid(currentFine);

    const session = await mongoose.startSession();
    let memberBlockChange: BlockRecalculationResult | null = null;

    try {
      await session.withTransaction(async () => {
        const waivedFine = await this.repository.waiveFine(fineId, actor.actorId as string, input.reason.trim(), session);

        if (!waivedFine) {
          throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Fine could not be waived');
        }

        memberBlockChange = await recalculateMemberBlock(waivedFine.memberId.toString(), this.repository, session);
      });
    } finally {
      await session.endSession();
    }

    await this.handleSingleBlockChange(currentFine.memberId.toString(), memberBlockChange, actor);

    const updatedFine = await this.repository.findFineById(fineId);

    if (!updatedFine) {
      throw new NotFoundError(ERR.FINE_NOT_FOUND, 404, 'Fine not found');
    }

    const [result] = await this.buildFineItems([updatedFine]);

    if (!result) {
      throw new NotFoundError(ERR.FINE_NOT_FOUND, 404, 'Fine not found');
    }

    this.writeAudit(actor, 'WAIVE_FINE', 'FineRecord', fineId, this.toFineAuditSnapshot(currentFine), result);

    return result;
  }

  async getMyFines(memberId: string, query: FineHistoryQuery): Promise<FineListResult> {
    return this.listFines(query, memberId);
  }

  async getAllFines(query: ListFinesQuery): Promise<FineListResult> {
    return this.listFines(query, query.memberId);
  }

  async listFineRates(): Promise<FineRateView[]> {
    const fineRates = await this.repository.listFineRates();
    return fineRates.map((fineRate) => createFineRateView(fineRate));
  }

  async createFineRate(input: CreateFineRateDto, actor?: RequestActor): Promise<FineRateView> {
    const fineRate = await this.repository.createFineRate({
      ratePerDay: input.ratePerDay,
      effectiveFrom: input.effectiveFrom,
      appliesTo: input.appliesTo?.trim() || 'all',
    });
    const result = createFineRateView(fineRate);

    this.writeAudit(actor, 'CREATE_FINE_RATE', 'FineRate', fineRate._id.toString(), undefined, result);

    return result;
  }

  async getFineRate(date: Date): Promise<FineRateView | null> {
    const fineRate = await this.repository.findFineRateByDate(date);

    return fineRate ? createFineRateView(fineRate) : null;
  }

  private async listFines(query: FineHistoryQuery | ListFinesQuery, memberId?: string): Promise<FineListResult> {
    const pagination = buildPagination(query);
    const listFilter = this.buildFineFilter(query.status, memberId);
    const summaryFilter = this.buildFineFilter(undefined, memberId);
    const [{ fines, total }, summary] = await Promise.all([
      this.repository.listFines({
        filter: listFilter,
        page: pagination.page,
        limit: pagination.limit,
      }),
      this.getFineSummary(summaryFilter),
    ]);
    const items = await this.buildFineItems(fines);
    const paginationResult = buildPaginationResult(items, total, pagination);

    return {
      summary,
      items: paginationResult.items,
      pagination: paginationResult.pagination,
    };
  }

  private buildFineFilter(status?: FineStatus, memberId?: string): Record<string, unknown> {
    const filter: Record<string, unknown> = {};

    if (memberId) {
      filter.memberId = new Types.ObjectId(memberId);
    }

    if (status) {
      filter.status = status;
    }

    return filter;
  }

  private async getFineSummary(filter: Record<string, unknown>): Promise<FineSummary> {
    const buckets = await this.repository.aggregateFineSummary(filter);
    const totalByStatus = new Map<FineStatus, number>(buckets.map((bucket) => [bucket._id, bucket.total]));

    return {
      unpaidTotal: totalByStatus.get(FineStatus.Unpaid) ?? 0,
      paidTotal: totalByStatus.get(FineStatus.Paid) ?? 0,
      waivedTotal: totalByStatus.get(FineStatus.Waived) ?? 0,
    };
  }

  private async buildFineItems(fines: FineRecordDocument[]): Promise<FineListItem[]> {
    if (fines.length === 0) {
      return [];
    }

    const memberIds = uniqueObjectIds(fines.map((fine) => fine.memberId));
    const loanIds = uniqueObjectIds(fines.map((fine) => fine.loanId));
    const [members, loans] = await Promise.all([
      this.repository.findMembersByIds(memberIds),
      this.repository.findLoansByIds(loanIds),
    ]);
    const bookIds = uniqueObjectIds(loans.map((loan) => loan.bookId));
    const books = await this.repository.findBooksByIds(bookIds);
    const authorsByBook = await buildBookAuthorsMap(books);

    const memberMap = new Map<string, FineMemberRef>(
      members.map((member) => [member._id.toString(), createFineMemberRef(member)]),
    );
    const loanMap = new Map<string, LoanRecordDocument>(loans.map((loan) => [loan._id.toString(), loan]));
    const bookMap = new Map<string, FineBookRef>(
      books.map((book) => [
        book._id.toString(),
        createFineBookRef(book, authorsByBook.get(book._id.toString()) ?? []),
      ]),
    );

    return fines.map((fine) => {
      const member = getRequiredMapValue(memberMap, fine.memberId.toString(), 'Fine member not found');
      const loan = getRequiredMapValue(loanMap, fine.loanId.toString(), 'Fine loan not found');
      const book = getRequiredMapValue(bookMap, loan.bookId.toString(), 'Fine book not found');

      return {
        _id: fine._id.toString(),
        loanId: fine.loanId.toString(),
        member,
        book,
        overdueDate: fine.overdueDate,
        amount: fine.amount,
        status: fine.status,
        paidAt: fine.paidAt,
        waivedBy: fine.waivedBy?.toString() ?? null,
        note: fine.note,
        createdAt: fine.createdAt,
      };
    });
  }

  private assertFineUnpaid(fine: Pick<FineRecordDocument, 'status'>): void {
    if (fine.status === FineStatus.Paid) {
      throw new BusinessRuleError(ERR.FINE_ALREADY_PAID, 422, 'Fine has already been paid');
    }

    if (fine.status === FineStatus.Waived) {
      throw new BusinessRuleError(ERR.FINE_ALREADY_WAIVED, 422, 'Fine has already been waived');
    }
  }

  private assertAllFinesUnpaid(fines: FineRecordDocument[]): void {
    for (const fine of fines) {
      this.assertFineUnpaid(fine);
    }
  }

  private async handleBlockChangeAudits(
    memberBlockChanges: Map<string, BlockRecalculationResult>,
    actor?: RequestActor,
  ): Promise<void> {
    for (const [memberId, blockChange] of memberBlockChanges.entries()) {
      await this.handleSingleBlockChange(memberId, blockChange, actor);
    }
  }

  private async handleSingleBlockChange(
    memberId: string,
    blockChange: BlockRecalculationResult | null,
    actor?: RequestActor,
  ): Promise<void> {
    if (!blockChange?.changed) {
      return;
    }

    await this.invalidateMemberCache(memberId);
    this.writeAudit(
      actor,
      blockChange.isBlocked ? 'BLOCK_MEMBER' : 'UNBLOCK_MEMBER',
      'Member',
      memberId,
      { isBlocked: blockChange.wasBlocked, reason: 'fine threshold' },
      { isBlocked: blockChange.isBlocked, reason: 'fine threshold' },
    );
    await this.enqueueMemberBlockStatusNotification(memberId, blockChange);
  }

  private async invalidateMemberCache(memberId: string): Promise<void> {
    try {
      await getRedisClient().del(buildMemberCacheKey(memberId));
    } catch {
      return;
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

  private toFineAuditSnapshot(fine: FineRecordDocument) {
    return {
      _id: fine._id.toString(),
      loanId: fine.loanId.toString(),
      memberId: fine.memberId.toString(),
      overdueDate: fine.overdueDate,
      amount: fine.amount,
      status: fine.status,
      paidAt: fine.paidAt,
      waivedBy: fine.waivedBy?.toString() ?? null,
      note: fine.note,
      createdAt: fine.createdAt,
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

export const fineService = new FineService();
