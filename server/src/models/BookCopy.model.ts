import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { CopyStatus } from '../common/types/enums';

export interface BookCopy {
  bookId: Types.ObjectId;
  barcode: string;
  status: CopyStatus;
  shelfLocation?: string;
  acquiredDate?: Date;
  createdAt: Date;
}

export type BookCopyDocument = HydratedDocument<BookCopy>;
type BookCopyModelType = Model<BookCopy>;

const bookCopySchema = new Schema<BookCopy, BookCopyModelType>(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    barcode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(CopyStatus),
      default: CopyStatus.Available,
      required: true,
    },
    shelfLocation: {
      type: String,
      trim: true,
    },
    acquiredDate: {
      type: Date,
    },
  },
  {
    collection: 'bookCopies',
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

bookCopySchema.index({ bookId: 1, status: 1 });

export const BookCopyModel = (models.BookCopy as BookCopyModelType | undefined) ?? model<BookCopy, BookCopyModelType>('BookCopy', bookCopySchema);
