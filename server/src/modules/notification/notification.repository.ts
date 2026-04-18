import { Types } from 'mongoose';

import { NotificationEvent } from '../../common/types/enums';
import {
  NotificationLogModel,
  type NotificationLog,
  type NotificationLogDocument,
  type NotificationLogStatus,
} from '../../models/NotificationLog.model';
import { MemberModel } from '../../models/Member.model';

export interface NotificationMemberContact {
  _id: string;
  fullName: string;
  email: string;
}

export interface CreateNotificationLogInput extends Omit<NotificationLog, 'memberId' | 'referenceId'> {
  memberId: string | Types.ObjectId;
  referenceId: string | Types.ObjectId;
}

export class NotificationRepository {
  async findMemberContactById(memberId: string | Types.ObjectId): Promise<NotificationMemberContact | null> {
    const member = await MemberModel.findById(memberId).select('fullName email').exec();

    if (!member) {
      return null;
    }

    return {
      _id: member._id.toString(),
      fullName: member.fullName,
      email: member.email,
    };
  }

  async findNotificationForDay(
    memberId: string | Types.ObjectId,
    eventType: NotificationEvent,
    referenceId: string | Types.ObjectId,
    dateFrom: Date,
    dateTo: Date,
    statuses: NotificationLogStatus[],
  ): Promise<NotificationLogDocument | null> {
    return NotificationLogModel.findOne({
      memberId,
      eventType,
      referenceId,
      status: {
        $in: statuses,
      },
      sentAt: {
        $gte: dateFrom,
        $lte: dateTo,
      },
    })
      .sort({ sentAt: -1 })
      .exec();
  }

  async createNotificationLog(input: CreateNotificationLogInput): Promise<NotificationLogDocument> {
    const log = new NotificationLogModel({
      ...input,
      memberId: new Types.ObjectId(input.memberId.toString()),
      referenceId: new Types.ObjectId(input.referenceId.toString()),
    });

    await log.save();
    return log;
  }

  async findNotificationLogById(logId: string | Types.ObjectId): Promise<NotificationLogDocument | null> {
    return NotificationLogModel.findById(logId).exec();
  }

  async markNotificationSent(logId: string | Types.ObjectId, sentAt: Date): Promise<void> {
    await NotificationLogModel.updateOne(
      { _id: logId },
      {
        $set: {
          status: 'SENT',
          sentAt,
          lastError: null,
        },
      },
    ).exec();
  }

  async markNotificationFailed(logId: string | Types.ObjectId, errorMessage: string): Promise<void> {
    await NotificationLogModel.updateOne(
      { _id: logId },
      {
        $set: {
          status: 'FAILED',
          lastError: errorMessage,
        },
      },
    ).exec();
  }
}

export const notificationRepository = new NotificationRepository();
