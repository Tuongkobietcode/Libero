import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { LoanStatus } from '../common/types/enums';

export interface LoanRecord {
  memberId: Types.ObjectId;
  copyId: Types.ObjectId;
  bookId: Types.ObjectId;
  checkoutDate: Date;
  dueDate: Date;
  returnDate?: Date | null;
  status: LoanStatus;
  renewCount: number;
  policyLoanDays: number;
  policyMaxRenewals: number;
  policyRenewDays: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type LoanRecordDocument = HydratedDocument<LoanRecord>;
type LoanRecordModelType = Model<LoanRecord>;

const loanRecordSchema = new Schema<LoanRecord, LoanRecordModelType>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    copyId: {
      type: Schema.Types.ObjectId,
      ref: 'BookCopy',
      required: true,
    },
    bookId: {
      type: Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    checkoutDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    returnDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(LoanStatus),
      default: LoanStatus.Active,
      required: true,
    },
    renewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    policyLoanDays: {
      type: Number,
      required: true,
      min: 0,
    },
    policyMaxRenewals: {
      type: Number,
      required: true,
      min: 0,
    },
    policyRenewDays: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'loanRecords',
    timestamps: true,
    versionKey: false,
  },
);

loanRecordSchema.index({ memberId: 1, status: 1 });
loanRecordSchema.index({ copyId: 1, status: 1 });
loanRecordSchema.index({ status: 1, dueDate: 1 });
loanRecordSchema.index({ bookId: 1, memberId: 1, status: 1 });

export const LoanRecordModel = (models.LoanRecord as LoanRecordModelType | undefined) ?? model<LoanRecord, LoanRecordModelType>('LoanRecord', loanRecordSchema);
