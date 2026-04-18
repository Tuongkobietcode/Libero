import { Types, type ClientSession, type FilterQuery } from 'mongoose';

import { FineStatus } from '../../common/types/enums';
import { BookModel, type BookDocument } from '../../models/Book.model';
import { FineRateModel, type FineRate, type FineRateDocument } from '../../models/FineRate.model';
import { FineRecordModel, type FineRecord, type FineRecordDocument } from '../../models/FineRecord.model';
import { LoanRecordModel, type LoanRecordDocument } from '../../models/LoanRecord.model';
import { MemberModel, type MemberDocument } from '../../models/Member.model';

interface ListFinesParams {
  filter: FilterQuery<FineRecord>;
  page: number;
  limit: number;
}

interface FineSummaryAggregate {
  _id: FineStatus;
  total: number;
}

export class FineRepository {
  async findFineById(fineId: string | Types.ObjectId, session?: ClientSession): Promise<FineRecordDocument | null> {
    let query = FineRecordModel.findById(fineId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findFinesByIds(
    fineIds: Array<string | Types.ObjectId>,
    session?: ClientSession,
  ): Promise<FineRecordDocument[]> {
    let query = FineRecordModel.find({
      _id: {
        $in: fineIds,
      },
    }).sort({ createdAt: -1, overdueDate: -1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async markFinesPaid(
    fineIds: Array<string | Types.ObjectId>,
    paidAt: Date,
    session: ClientSession,
  ): Promise<void> {
    await FineRecordModel.updateMany(
      {
        _id: {
          $in: fineIds,
        },
      },
      {
        $set: {
          status: FineStatus.Paid,
          paidAt,
        },
      },
      { session },
    ).exec();
  }

  async waiveFine(
    fineId: string | Types.ObjectId,
    waivedBy: string | Types.ObjectId,
    reason: string,
    session: ClientSession,
  ): Promise<FineRecordDocument | null> {
    return FineRecordModel.findOneAndUpdate(
      {
        _id: fineId,
        status: FineStatus.Unpaid,
      },
      {
        $set: {
          status: FineStatus.Waived,
          waivedBy,
          note: reason,
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async listFines(params: ListFinesParams): Promise<{ fines: FineRecordDocument[]; total: number }> {
    const { filter, page, limit } = params;
    const skip = (page - 1) * limit;

    const [fines, total] = await Promise.all([
      FineRecordModel.find(filter)
        .sort({ createdAt: -1, overdueDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      FineRecordModel.countDocuments(filter).exec(),
    ]);

    return { fines, total };
  }

  async aggregateFineSummary(filter: FilterQuery<FineRecord>): Promise<FineSummaryAggregate[]> {
    return FineRecordModel.aggregate<FineSummaryAggregate>([
      {
        $match: filter,
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
        },
      },
    ]).exec();
  }

  async findMembersByIds(memberIds: Types.ObjectId[]): Promise<MemberDocument[]> {
    if (memberIds.length === 0) {
      return [];
    }

    return MemberModel.find({
      _id: {
        $in: memberIds,
      },
    }).exec();
  }

  async findLoansByIds(loanIds: Types.ObjectId[]): Promise<LoanRecordDocument[]> {
    if (loanIds.length === 0) {
      return [];
    }

    return LoanRecordModel.find({
      _id: {
        $in: loanIds,
      },
    }).exec();
  }

  async findBooksByIds(bookIds: Types.ObjectId[]): Promise<BookDocument[]> {
    if (bookIds.length === 0) {
      return [];
    }

    return BookModel.find({
      _id: {
        $in: bookIds,
      },
    }).exec();
  }

  async findMemberById(memberId: string | Types.ObjectId, session?: ClientSession): Promise<MemberDocument | null> {
    let query = MemberModel.findById(memberId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async sumUnpaidFines(memberId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    let query = FineRecordModel.aggregate<{ _id: null; total: number }>([
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

  async listFineRates(): Promise<FineRateDocument[]> {
    return FineRateModel.find({}).sort({ effectiveFrom: -1, _id: -1 }).exec();
  }

  async createFineRate(input: Omit<FineRate, never>): Promise<FineRateDocument> {
    const fineRate = new FineRateModel(input);
    await fineRate.save();
    return fineRate;
  }

  async findFineRateByDate(date: Date, session?: ClientSession): Promise<FineRateDocument | null> {
    let query = FineRateModel.findOne({
      effectiveFrom: {
        $lte: date,
      },
    }).sort({ effectiveFrom: -1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }
}

export const fineRepository = new FineRepository();
