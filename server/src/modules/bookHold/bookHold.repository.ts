import { Types, type ClientSession, type FilterQuery } from 'mongoose';

import { BookHoldStatus, CopyStatus, ReservationStatus } from '../../common/types/enums';
import { BookModel, type BookDocument } from '../../models/Book.model';
import { BookCopyModel, type BookCopyDocument } from '../../models/BookCopy.model';
import { BookHoldModel, type BookHold, type BookHoldDocument } from '../../models/BookHold.model';
import { MemberModel, type MemberDocument } from '../../models/Member.model';
import { ReservationModel, type ReservationDocument } from '../../models/Reservation.model';

interface ListBookHoldsParams {
  filter: FilterQuery<BookHold>;
  page: number;
  limit: number;
}

export class BookHoldRepository {
  async findMemberById(memberId: string | Types.ObjectId, session?: ClientSession): Promise<MemberDocument | null> {
    let query = MemberModel.findById(memberId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findBookById(bookId: string | Types.ObjectId, session?: ClientSession): Promise<BookDocument | null> {
    let query = BookModel.findById(bookId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findAvailableCopyByBookId(bookId: string | Types.ObjectId, session: ClientSession): Promise<BookCopyDocument | null> {
    return BookCopyModel.findOne({
      bookId,
      status: CopyStatus.Available,
    })
      .sort({ createdAt: 1 })
      .session(session)
      .exec();
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
      { $set: { status: nextStatus } },
      { new: true, session },
    ).exec();
  }

  async countActiveHoldsByMember(memberId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    let query = BookHoldModel.countDocuments({
      memberId,
      status: BookHoldStatus.Active,
    });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findActiveHoldForMemberBook(
    memberId: string | Types.ObjectId,
    bookId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<BookHoldDocument | null> {
    let query = BookHoldModel.findOne({
      memberId,
      bookId,
      status: BookHoldStatus.Active,
    }).sort({ requestDate: -1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findActiveReservationForMemberBook(
    memberId: string | Types.ObjectId,
    bookId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ReservationDocument | null> {
    let query = ReservationModel.findOne({
      memberId,
      bookId,
      status: { $in: [ReservationStatus.Waiting, ReservationStatus.Notified] },
    }).sort({ requestDate: -1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async createBookHold(input: Omit<BookHold, 'createdAt' | 'updatedAt'>, session: ClientSession): Promise<BookHoldDocument> {
    const hold = new BookHoldModel(input);
    await hold.save({ session });
    return hold;
  }

  async findBookHoldById(holdId: string | Types.ObjectId, session?: ClientSession): Promise<BookHoldDocument | null> {
    let query = BookHoldModel.findById(holdId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async cancelActiveHoldById(holdId: string | Types.ObjectId, cancelledAt: Date, session: ClientSession): Promise<BookHoldDocument | null> {
    return BookHoldModel.findOneAndUpdate(
      {
        _id: holdId,
        status: BookHoldStatus.Active,
      },
      {
        $set: {
          status: BookHoldStatus.Cancelled,
          cancelledAt,
        },
      },
      { new: true, session },
    ).exec();
  }

  async expireActiveHoldById(holdId: string | Types.ObjectId, expiredAt: Date, session: ClientSession): Promise<BookHoldDocument | null> {
    return BookHoldModel.findOneAndUpdate(
      {
        _id: holdId,
        status: BookHoldStatus.Active,
      },
      {
        $set: {
          status: BookHoldStatus.Expired,
          expiredAt,
        },
      },
      { new: true, session },
    ).exec();
  }

  async listBookHolds(params: ListBookHoldsParams): Promise<{ holds: BookHoldDocument[]; total: number }> {
    const { filter, page, limit } = params;
    const skip = (page - 1) * limit;
    const [holds, total] = await Promise.all([
      BookHoldModel.find(filter).sort({ requestDate: -1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      BookHoldModel.countDocuments(filter).exec(),
    ]);

    return { holds, total };
  }

  async findMembersByIds(memberIds: Types.ObjectId[]): Promise<MemberDocument[]> {
    if (memberIds.length === 0) {
      return [];
    }

    return MemberModel.find({ _id: { $in: memberIds } }).exec();
  }

  async findBooksByIds(bookIds: Types.ObjectId[]): Promise<BookDocument[]> {
    if (bookIds.length === 0) {
      return [];
    }

    return BookModel.find({ _id: { $in: bookIds } }).exec();
  }

  async findCopiesByIds(copyIds: Types.ObjectId[]): Promise<BookCopyDocument[]> {
    if (copyIds.length === 0) {
      return [];
    }

    return BookCopyModel.find({ _id: { $in: copyIds } }).exec();
  }

  async findNextWaitingReservationByBookId(bookId: string | Types.ObjectId, session: ClientSession): Promise<ReservationDocument | null> {
    return ReservationModel.findOne({
      bookId,
      status: ReservationStatus.Waiting,
    })
      .sort({ queuePosition: 1, requestDate: 1, createdAt: 1 })
      .session(session)
      .exec();
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
      { new: true, session },
    ).exec();
  }
}

export const bookHoldRepository = new BookHoldRepository();
