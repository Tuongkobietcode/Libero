import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { ReservationStatus } from '../common/types/enums';

export interface Reservation {
  memberId: Types.ObjectId;
  bookId: Types.ObjectId;
  copyId?: Types.ObjectId | null;
  queuePosition: number;
  status: ReservationStatus;
  requestDate: Date;
  notifiedAt?: Date | null;
  holdExpiryAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ReservationDocument = HydratedDocument<Reservation>;
type ReservationModelType = Model<Reservation>;

const reservationSchema = new Schema<Reservation, ReservationModelType>(
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
      default: null,
    },
    queuePosition: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(ReservationStatus),
      default: ReservationStatus.Waiting,
      required: true,
    },
    requestDate: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    holdExpiryAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'reservations',
    timestamps: true,
    versionKey: false,
  },
);

reservationSchema.index({ bookId: 1, status: 1, queuePosition: 1 });
reservationSchema.index(
  { bookId: 1, queuePosition: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: ReservationStatus.Waiting,
    },
  },
);
reservationSchema.index({ status: 1, holdExpiryAt: 1 });
reservationSchema.index({ memberId: 1, status: 1 });
reservationSchema.index({ memberId: 1, bookId: 1, status: 1 });

export const ReservationModel = (models.Reservation as ReservationModelType | undefined) ?? model<Reservation, ReservationModelType>('Reservation', reservationSchema);
