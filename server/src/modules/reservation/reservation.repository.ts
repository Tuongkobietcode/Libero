import type { ClientSession, FilterQuery, Types } from 'mongoose';

import { BookHoldStatus, CopyStatus, ReservationStatus } from '../../common/types/enums';
import { BookModel, type BookDocument } from '../../models/Book.model';
import { BookCopyModel, type BookCopyDocument } from '../../models/BookCopy.model';
import { BookHoldModel, type BookHold, type BookHoldDocument } from '../../models/BookHold.model';
import { MemberModel, type MemberDocument } from '../../models/Member.model';
import { ReservationModel, type Reservation, type ReservationDocument } from '../../models/Reservation.model';

interface ListReservationsParams {
  filter: FilterQuery<Reservation>;
  page: number;
  limit: number;
}

export class ReservationRepository {
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

  async countCopiesByBookId(bookId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    let query = BookCopyModel.countDocuments({ bookId });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async countAvailableCopiesByBookId(bookId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    let query = BookCopyModel.countDocuments({
      bookId,
      status: CopyStatus.Available,
    });

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
      status: {
        $in: [ReservationStatus.Waiting, ReservationStatus.Notified],
      },
    }).sort({ queuePosition: 1, requestDate: 1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findActiveBookHoldForMemberBook(
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

  async findActiveBookHoldForMemberBookCopy(
    memberId: string | Types.ObjectId,
    bookId: string | Types.ObjectId,
    copyId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<BookHoldDocument | null> {
    let query = BookHoldModel.findOne({
      memberId,
      bookId,
      copyId,
      status: BookHoldStatus.Active,
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

  async cancelActiveBookHoldById(
    holdId: string | Types.ObjectId,
    cancelledAt: Date,
    session: ClientSession,
  ): Promise<void> {
    await BookHoldModel.updateOne(
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
      { session },
    ).exec();
  }

  async expireActiveBookHoldById(
    holdId: string | Types.ObjectId,
    expiredAt: Date,
    session: ClientSession,
  ): Promise<void> {
    await BookHoldModel.updateOne(
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
      { session },
    ).exec();
  }

  async findLastWaitingReservationByBookId(
    bookId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ReservationDocument | null> {
    let query = ReservationModel.findOne({
      bookId,
      status: ReservationStatus.Waiting,
    }).sort({ queuePosition: -1, requestDate: -1, createdAt: -1 });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async createReservation(input: Omit<Reservation, 'createdAt' | 'updatedAt'>, session: ClientSession): Promise<ReservationDocument> {
    const reservation = new ReservationModel(input);
    await reservation.save({ session });
    return reservation;
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

  async cancelActiveReservationById(
    reservationId: string | Types.ObjectId,
    session: ClientSession,
  ): Promise<ReservationDocument | null> {
    return ReservationModel.findOneAndUpdate(
      {
        _id: reservationId,
        status: {
          $in: [ReservationStatus.Waiting, ReservationStatus.Notified],
        },
      },
      {
        $set: {
          status: ReservationStatus.Cancelled,
          holdExpiryAt: null,
          copyId: null,
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async expireNotifiedReservationById(
    reservationId: string | Types.ObjectId,
    session: ClientSession,
  ): Promise<ReservationDocument | null> {
    return ReservationModel.findOneAndUpdate(
      {
        _id: reservationId,
        status: ReservationStatus.Notified,
      },
      {
        $set: {
          status: ReservationStatus.Expired,
          holdExpiryAt: null,
          copyId: null,
        },
      },
      {
        new: true,
        session,
      },
    ).exec();
  }

  async decrementWaitingQueuePositions(
    bookId: string | Types.ObjectId,
    queuePosition: number,
    session: ClientSession,
  ): Promise<void> {
    await ReservationModel.updateMany(
      {
        bookId,
        status: ReservationStatus.Waiting,
        queuePosition: {
          $gt: queuePosition,
        },
      },
      {
        $inc: {
          queuePosition: -1,
        },
      },
      { session },
    ).exec();
  }

  async findNextWaitingReservationByBookId(
    bookId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<ReservationDocument | null> {
    let query = ReservationModel.findOne({
      bookId,
      status: ReservationStatus.Waiting,
    }).sort({ queuePosition: 1, requestDate: 1, createdAt: 1 });

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

  async findBookCopyById(copyId: string | Types.ObjectId, session?: ClientSession): Promise<BookCopyDocument | null> {
    let query = BookCopyModel.findById(copyId);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findReservedCopyByBookId(
    bookId: string | Types.ObjectId,
    session?: ClientSession,
  ): Promise<BookCopyDocument | null> {
    let query = BookCopyModel.findOne({
      bookId,
      status: CopyStatus.Reserved,
    }).sort({ createdAt: 1 });

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
        status: {
          $in: currentStatuses,
        },
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

  async listReservations(params: ListReservationsParams): Promise<{ reservations: ReservationDocument[]; total: number }> {
    const { filter, page, limit } = params;
    const skip = (page - 1) * limit;

    const [reservations, total] = await Promise.all([
      ReservationModel.find(filter)
        .sort({ requestDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ReservationModel.countDocuments(filter).exec(),
    ]);

    return {
      reservations,
      total,
    };
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

  async countActiveReservationsByBookIds(bookIds: Types.ObjectId[]): Promise<Map<string, number>> {
    if (bookIds.length === 0) {
      return new Map();
    }

    const buckets = await ReservationModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          bookId: { $in: bookIds },
          status: { $in: [ReservationStatus.Waiting, ReservationStatus.Notified] },
        },
      },
      {
        $group: {
          _id: '$bookId',
          count: { $sum: 1 },
        },
      },
    ]);

    return new Map(buckets.map((bucket) => [bucket._id.toString(), bucket.count]));
  }

  async findCopiesByIds(copyIds: Types.ObjectId[]): Promise<BookCopyDocument[]> {
    if (copyIds.length === 0) {
      return [];
    }

    return BookCopyModel.find({
      _id: {
        $in: copyIds,
      },
    }).exec();
  }
}

export const reservationRepository = new ReservationRepository();
