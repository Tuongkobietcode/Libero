import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { FineStatus } from '../common/types/enums';

export interface FineRecord {
  loanId: Types.ObjectId;
  memberId: Types.ObjectId;
  overdueDate: Date;
  amount: number;
  status: FineStatus;
  paidAt?: Date | null;
  waivedBy?: Types.ObjectId | null;
  note?: string;
  createdAt: Date;
}

export type FineRecordDocument = HydratedDocument<FineRecord>;
type FineRecordModelType = Model<FineRecord>;

const fineRecordSchema = new Schema<FineRecord, FineRecordModelType>(
  {
    loanId: {
      type: Schema.Types.ObjectId,
      ref: 'LoanRecord',
      required: true,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    overdueDate: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(FineStatus),
      default: FineStatus.Unpaid,
      required: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    waivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'fineRecords',
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

fineRecordSchema.index({ loanId: 1, overdueDate: 1 }, { unique: true });
fineRecordSchema.index({ memberId: 1, status: 1 });
fineRecordSchema.index({ loanId: 1 });

export const FineRecordModel = (models.FineRecord as FineRecordModelType | undefined) ?? model<FineRecord, FineRecordModelType>('FineRecord', fineRecordSchema);
