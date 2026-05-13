import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { BookHoldStatus } from '../common/types/enums';

export interface BookHold {
  memberId: Types.ObjectId;
  bookId: Types.ObjectId;
  copyId: Types.ObjectId;
  status: BookHoldStatus;
  requestDate: Date;
  holdExpiryAt: Date;
  fulfilledAt?: Date | null;
  cancelledAt?: Date | null;
  expiredAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type BookHoldDocument = HydratedDocument<BookHold>;
type BookHoldModelType = Model<BookHold>;

const bookHoldSchema = new Schema<BookHold, BookHoldModelType>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    copyId: {
      type: Schema.Types.ObjectId,
      ref: 'BookCopy',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BookHoldStatus),
      default: BookHoldStatus.Active,
      required: true,
    },
    requestDate: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    holdExpiryAt: {
      type: Date,
      required: true,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    expiredAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'bookHolds',
    timestamps: true,
    versionKey: false,
  },
);

bookHoldSchema.index({ memberId: 1, status: 1 });
bookHoldSchema.index({ memberId: 1, bookId: 1, status: 1 });
bookHoldSchema.index({ bookId: 1, status: 1, holdExpiryAt: 1 });
bookHoldSchema.index({ copyId: 1, status: 1 });

export const BookHoldModel = (models.BookHold as BookHoldModelType | undefined) ?? model<BookHold, BookHoldModelType>('BookHold', bookHoldSchema);
