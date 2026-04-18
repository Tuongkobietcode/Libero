import { Types, type ClientSession, type FilterQuery } from 'mongoose';

import { FineStatus, LoanStatus, ReservationStatus } from '../../common/types/enums';
import type { CopyStatus } from '../../common/types/enums';
import { BookModel, type BookDocument } from '../../models/Book.model';
import { BookCopyModel, type BookCopyDocument } from '../../models/BookCopy.model';
import { FineRateModel, type FineRateDocument } from '../../models/FineRate.model';
import { FineRecordModel, type FineRecord, type FineRecordDocument } from '../../models/FineRecord.model';
import { LoanPolicyModel, type LoanPolicyDocument } from '../../models/LoanPolicy.model';
import { LoanRecordModel, type LoanRecord, type LoanRecordDocument } from '../../models/LoanRecord.model';
import { MemberModel, type MemberDocument } from '../../models/Member.model';
import { ReservationModel, type ReservationDocument } from '../../models/Reservation.model';

interface ListLoansParams {
  filter: FilterQuery<LoanRecord>;
  page: number;
  limit: number;
}

interface FineTotalAggregate {
  _id: Types.ObjectId | null;
  total: number;
}

export class LoanRepository {
  async findBookCopyByBarcode(barcode: string, session?: ClientSession): Promise<BookCopyDocument | null> {
    let query = BookCopyModel.findOne({ barcode: barcode.trim() });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findBookCopyById(copyId: string | Types.ObjectId, session?: ClientSession): Promise<BookCopyDocument | null> {
    let query = BookCopyModel.findById(copyId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async updateCopyStatusIfCurrent(
    copyId: string | Types.ObjectId,
    currentStatuses: CopyStatus[],
    nextStatus: CopyStatus,
    session: ClientSession,
  ): Promise<BookCopyDocument | null> {
    return BookCopyModel.findOneAndUpdate(
      {
        _id: copyId,
        status: { $in: currentStatuses },
      },
      {
        $set: {
          status: nextStatus,
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async findBookById(bookId: string | Types.ObjectId, session?: ClientSession): Promise<BookDocument | null> {
    let query = BookModel.findById(bookId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findMemberById(memberId: string | Types.ObjectId, session?: ClientSession): Promise<MemberDocument | null> {
    let query = MemberModel.findById(memberId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async updateMemberBlockedStatus(
    memberId: string | Types.ObjectId,
    isBlocked: boolean,
    session?: ClientSession,
  ): Promise<void> {
    let query = MemberModel.updateOne(
      { _id: memberId },
      {
        $set: {
          isBlocked,
        },
      },
    );

    if (session) {
      query = query.session(session);
    }

    await query.exec();
  }

  async findLoanPolicyByRole(role: string, session?: ClientSession): Promise<LoanPolicyDocument | null> {
    let query = LoanPolicyModel.findOne({ role });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async countActiveLoans(memberId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    let query = LoanRecordModel.countDocuments({
      memberId,
      status: { $in: [LoanStatus.Active, LoanStatus.Overdue] },
    });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async hasActiveLoanForBook(
    memberId: string | Types.ObjectId,
    bookId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<boolean> {
    let query = LoanRecordModel.exists({
      memberId,
      bookId,
      status: { $in: [LoanStatus.Active, LoanStatus.Overdue] },
    });

    if (session) {
      query = query.session(session);
    }

    const existingLoan = await query.exec();
    return existingLoan !== null;
  }

  async createLoanRecord(input: Omit<LoanRecord, 'createdAt' | 'updatedAt'>, session: ClientSession): Promise<LoanRecordDocument> {
    const loan = new LoanRecordModel(input);
    await loan.save({ session });
    return loan;
  }

  async findNotifiedReservationForMemberBook(
    memberId: string | Types.ObjectId,
    bookId: string | Types.ObjectId,
    copyId: string | Types.ObjectId,
    currentTime: Date,
    session?: ClientSession,
  ): Promise<ReservationDocument | null> {
    let query = ReservationModel.findOne({
      memberId,
      bookId,
      copyId,
      status: ReservationStatus.Notified,
      $or: [
        { holdExpiryAt: null },
        { holdExpiryAt: { $gte: currentTime } },
      ],
    });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async fulfillReservationById(reservationId: string | Types.ObjectId, session: ClientSession): Promise<void> {
    await ReservationModel.updateOne(
      { _id: reservationId },
      {
        $set: {
          status: ReservationStatus.Fulfilled,
          copyId: null,
          holdExpiryAt: null,
        },
      },
      { session },
    ).exec();
  }

  async findReservationById(
    reservationId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ReservationDocument | null> {
    let query = ReservationModel.findById(reservationId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findLoanById(loanId: string | Types.ObjectId, session?: ClientSession): Promise<LoanRecordDocument | null> {
    let query = LoanRecordModel.findById(loanId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findActiveLoanByCopyId(copyId: string | Types.ObjectId, session?: ClientSession): Promise<LoanRecordDocument | null> {
    let query = LoanRecordModel.findOne({
      copyId,
      status: { $in: [LoanStatus.Active, LoanStatus.Overdue] },
    }).sort({ checkoutDate: -1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async renewLoanById(
    loanId: string | Types.ObjectId,
    dueDate: Date,
    renewCount: number,
    session?: ClientSession,
  ): Promise<LoanRecordDocument | null> {
    return LoanRecordModel.findOneAndUpdate(
      {
        _id: loanId,
        status: LoanStatus.Active,
      },
      {
        $set: {
          dueDate,
          renewCount,
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async markLoanReturned(
    loanId: string | Types.ObjectId,
    returnedAt: Date,
    session: ClientSession,
  ): Promise<LoanRecordDocument | null> {
    return LoanRecordModel.findOneAndUpdate(
      {
        _id: loanId,
        status: { $in: [LoanStatus.Active, LoanStatus.Overdue] },
      },
      {
        $set: {
          status: LoanStatus.Returned,
          returnDate: returnedAt,
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async markLoanLost(
    loanId: string | Types.ObjectId,
    notes: string | undefined,
    session: ClientSession,
  ): Promise<LoanRecordDocument | null> {
    return LoanRecordModel.findOneAndUpdate(
      {
        _id: loanId,
        status: { $in: [LoanStatus.Active, LoanStatus.Overdue] },
      },
      {
        $set: {
          status: LoanStatus.Lost,
          ...(notes !== undefined ? { notes } : {}),
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async findWaitingReservationByBookId(bookId: string | Types.ObjectId, session?: ClientSession): Promise<ReservationDocument | null> {
    let query = ReservationModel.findOne({
      bookId,
      status: ReservationStatus.Waiting,
    }).sort({ queuePosition: 1, createdAt: 1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async notifyReservationById(
    reservationId: string | Types.ObjectId,
    copyId: string | Types.ObjectId,
    notifiedAt: Date,
    holdExpiryAt: Date,
    session: ClientSession,
  ): Promise<ReservationDocument | null> {
    return ReservationModel.findOneAndUpdate(
      {
        _id: reservationId,
        status: ReservationStatus.Waiting,
      },
      {
        $set: {
          status: ReservationStatus.Notified,
          copyId,
          notifiedAt,
          holdExpiryAt,
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async hasWaitingReservationForBook(bookId: string | Types.ObjectId, session?: ClientSession): Promise<boolean> {
    let query = ReservationModel.exists({
      bookId,
      status: ReservationStatus.Waiting,
    });

    if (session) {
      query = query.session(session);
    }

    const waitingReservation = await query.exec();
    return waitingReservation !== null;
  }

  async findFineRatesEffectiveOnOrBefore(date: Date, session?: ClientSession): Promise<FineRateDocument[]> {
    let query = FineRateModel.find({ effectiveFrom: { $lte: date } }).sort({ effectiveFrom: -1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async createFineRecords(input: Array<Omit<FineRecord, 'createdAt'>>, session: ClientSession): Promise<FineRecordDocument[]> {
    return FineRecordModel.insertMany(input, {
      session,
      ordered: false,
    });
  }

  async sumUnpaidFines(memberId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    let query = FineRecordModel.aggregate<FineTotalAggregate>([
      {
        $match: {
          memberId: new Types.ObjectId(memberId.toString()),
          status: FineStatus.Unpaid,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    if (session) {
      query = query.session(session);
    }

    const result = await query.exec();
    return result[0]?.total ?? 0;
  }

  async listLoans(params: ListLoansParams): Promise<{ loans: LoanRecordDocument[]; total: number }> {
    const { filter, page, limit } = params;
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      LoanRecordModel.find(filter)
        .sort({ checkoutDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      LoanRecordModel.countDocuments(filter).exec(),
    ]);

    return { loans, total };
  }

  async findFineRecordsByLoanIds(loanIds: Types.ObjectId[]): Promise<FineRecordDocument[]> {
    return FineRecordModel.find({
      loanId: { $in: loanIds },
    })
      .sort({ overdueDate: 1, createdAt: 1 })
      .exec();
  }

  async findMembersByIds(memberIds: Types.ObjectId[]): Promise<MemberDocument[]> {
    return MemberModel.find({
      _id: { $in: memberIds },
    }).exec();
  }

  async findBooksByIds(bookIds: Types.ObjectId[]): Promise<BookDocument[]> {
    return BookModel.find({
      _id: { $in: bookIds },
    }).exec();
  }

  async findCopiesByIds(copyIds: Types.ObjectId[]): Promise<BookCopyDocument[]> {
    return BookCopyModel.find({
      _id: { $in: copyIds },
    }).exec();
  }
}

export const loanRepository = new LoanRepository();
