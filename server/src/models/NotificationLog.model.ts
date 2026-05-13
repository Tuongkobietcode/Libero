import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

import { NotificationEvent } from '../common/types/enums';

const notificationStatuses = ['PENDING', 'SENT', 'FAILED'] as const;

export type NotificationLogStatus = (typeof notificationStatuses)[number];

export interface NotificationLog {
  memberId: Types.ObjectId;
  eventType: NotificationEvent;
  referenceId: Types.ObjectId;
  template: string;
  recipientEmail: string;
  subject: string;
  title?: string | null;
  body?: string | null;
  link?: string | null;
  readAt?: Date | null;
  status: NotificationLogStatus;
  sentAt: Date;
  lastError?: string | null;
}

export type NotificationLogDocument = HydratedDocument<NotificationLog>;
type NotificationLogModelType = Model<NotificationLog>;

const notificationLogSchema = new Schema<NotificationLog, NotificationLogModelType>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    eventType: {
      type: String,
      enum: Object.values(NotificationEvent),
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    template: {
      type: String,
      required: true,
      trim: true,
    },
    recipientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: null,
      trim: true,
    },
    body: {
      type: String,
      default: null,
      trim: true,
    },
    link: {
      type: String,
      default: null,
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: notificationStatuses,
      default: 'PENDING',
      required: true,
    },
    sentAt: {
      type: Date,
      default: () => new Date(),
      required: true,
    },
    lastError: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    collection: 'notificationLogs',
    versionKey: false,
  },
);

notificationLogSchema.index({ memberId: 1, eventType: 1, referenceId: 1, sentAt: 1 });
notificationLogSchema.index({ memberId: 1, readAt: 1, sentAt: -1 });
notificationLogSchema.index({ status: 1, sentAt: -1 });
notificationLogSchema.index({ sentAt: -1 });

export const NotificationLogModel = (models.NotificationLog as NotificationLogModelType | undefined) ?? model<NotificationLog, NotificationLogModelType>('NotificationLog', notificationLogSchema);
