import { Types } from 'mongoose';

import { NotificationEvent } from '../../common/types/enums';
import { Role } from '../../common/types/enums';
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

  async findBackofficeContacts(): Promise<NotificationMemberContact[]> {
    const members = await MemberModel.find({
      role: { $in: [Role.Admin, Role.Librarian] },
    })
      .select('fullName email')
      .exec();

    return members.map((member) => ({
      _id: member._id.toString(),
      fullName: member.fullName,
      email: member.email,
    }));
  }

  async listNotifications(
    memberId: string | Types.ObjectId,
    skip: number,
    limit: number,
  ): Promise<{ notifications: NotificationLogDocument[]; total: number; unreadTotal: number }> {
    const filter = {
      memberId: new Types.ObjectId(memberId.toString()),
      status: { $ne: 'FAILED' as const },
    };

    const [notifications, total, unreadTotal] = await Promise.all([
      NotificationLogModel.find(filter).sort({ sentAt: -1 }).skip(skip).limit(limit).exec(),
      NotificationLogModel.countDocuments(filter).exec(),
      NotificationLogModel.countDocuments({ ...filter, readAt: null }).exec(),
    ]);

    return { notifications, total, unreadTotal };
  }

  async markNotificationRead(memberId: string | Types.ObjectId, notificationId: string | Types.ObjectId, readAt: Date): Promise<NotificationLogDocument | null> {
    return NotificationLogModel.findOneAndUpdate(
      {
        _id: notificationId,
        memberId,
      },
      {
        $set: { readAt },
      },
      { new: true },
    ).exec();
  }

  async markAllNotificationsRead(memberId: string | Types.ObjectId, readAt: Date): Promise<number> {
    const result = await NotificationLogModel.updateMany(
      {
        memberId,
        readAt: null,
        status: { $ne: 'FAILED' },
      },
      {
        $set: { readAt },
      },
    ).exec();

    return result.modifiedCount;
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
