import type { Queue } from 'bullmq';

import { NotFoundError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { NotificationEvent } from '../../common/types/enums';
import { endOfUtcDay, startOfUtcDay } from '../../common/utils/dateHelpers';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import { logger } from '../../common/middleware/requestLogger';
import { getJobQueue } from '../../config/queue';
import { env } from '../../config/env';
import type { NotificationLogDocument, NotificationLogStatus } from '../../models/NotificationLog.model';
import type { NotificationListItem } from '@libero/shared';
import { realtimeHub } from '../../realtime/realtime';
import {
  notificationRepository,
  type NotificationMemberContact,
  type NotificationRepository,
} from './notification.repository';

type NotificationTemplate =
  | 'checkout_confirmation'
  | 'due_reminder'
  | 'overdue_notice'
  | 'book_available'
  | 'hold_expiring'
  | 'account_blocked'
  | 'account_activated';

interface CheckoutConfirmationBookContext {
  title: string;
  barcode: string;
  dueDate: Date;
}

interface DueReminderBookContext {
  title: string;
  dueDate: Date;
  renewLink: string;
}

interface OverdueNoticeBookContext {
  title: string;
  overdueDays: number;
  fineAmount: number;
}

export interface EmailJobPayload {
  notificationLogId: string;
  template: NotificationTemplate;
  to: string;
  subject: string;
  context: Record<string, unknown>;
  memberId: string;
  eventType: NotificationEvent;
  referenceId: string;
}

interface EnqueueEmailParams {
  template: NotificationTemplate;
  memberId: string;
  eventType: NotificationEvent;
  referenceId: string;
  context: Record<string, unknown>;
  now?: Date;
}

export interface EnqueueEmailResult {
  skipped: boolean;
  logId: string | null;
  jobId: string | null;
}

const activeDedupStatuses: NotificationLogStatus[] = ['PENDING', 'SENT'];

const eventSubjects: Record<NotificationEvent, string> = {
  [NotificationEvent.DueReminder]: 'LIBERO - Books due soon',
  [NotificationEvent.Overdue]: 'LIBERO - Overdue books notice',
  [NotificationEvent.BookAvailable]: 'LIBERO - Reserved book available',
  [NotificationEvent.HoldExpiring]: 'LIBERO - Reservation hold expiring',
  [NotificationEvent.CheckoutConfirmation]: 'LIBERO - Checkout confirmation',
  [NotificationEvent.AccountBlocked]: 'LIBERO - Account blocked',
  [NotificationEvent.AccountActivated]: 'LIBERO - Account activated',
  [NotificationEvent.ReservationCreated]: 'LIBERO - Reservation created',
  [NotificationEvent.ReservationRequested]: 'LIBERO - New reservation request',
  [NotificationEvent.BookHoldCreated]: 'LIBERO - Book hold created',
};

function buildLoanRenewLink(): string {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/my-loans`;
}

function buildReservationsLink(): string {
  return `${env.FRONTEND_URL.replace(/\/$/, '')}/my-reservations`;
}

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository = notificationRepository,
    private readonly getEmailQueue: () => Pick<Queue<EmailJobPayload>, 'add'> = () => getJobQueue('emailSender'),
  ) {}

  async enqueueCheckoutConfirmation(
    memberId: string,
    loanId: string,
    loans: CheckoutConfirmationBookContext[],
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueEmail({
      template: 'checkout_confirmation',
      memberId,
      eventType: NotificationEvent.CheckoutConfirmation,
      referenceId: loanId,
      context: {
        loans,
      },
      now,
    });
  }

  async enqueueDueReminder(
    memberId: string,
    loanId: string,
    books: DueReminderBookContext[],
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueEmail({
      template: 'due_reminder',
      memberId,
      eventType: NotificationEvent.DueReminder,
      referenceId: loanId,
      context: {
        books,
      },
      now,
    });
  }

  async enqueueOverdueNotice(
    memberId: string,
    referenceId: string,
    books: OverdueNoticeBookContext[],
    totalFine: number,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueEmail({
      template: 'overdue_notice',
      memberId,
      eventType: NotificationEvent.Overdue,
      referenceId,
      context: {
        books,
        totalFine,
      },
      now,
    });
  }

  async enqueueBookAvailable(
    memberId: string,
    reservationId: string,
    title: string,
    shelfLocation: string | undefined,
    holdExpiryAt: Date | null | undefined,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueEmail({
      template: 'book_available',
      memberId,
      eventType: NotificationEvent.BookAvailable,
      referenceId: reservationId,
      context: {
        title,
        shelfLocation,
        holdExpiryAt,
        myReservationsLink: buildReservationsLink(),
      },
      now,
    });
  }

  async enqueueHoldExpiring(
    memberId: string,
    reservationId: string,
    title: string,
    holdExpiryAt: Date,
    hoursLeft: number,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueEmail({
      template: 'hold_expiring',
      memberId,
      eventType: NotificationEvent.HoldExpiring,
      referenceId: reservationId,
      context: {
        title,
        holdExpiryAt,
        hoursLeft,
      },
      now,
    });
  }

  async enqueueAccountBlocked(
    memberId: string,
    referenceId: string,
    reason: string,
    totalFine: number,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueEmail({
      template: 'account_blocked',
      memberId,
      eventType: NotificationEvent.AccountBlocked,
      referenceId,
      context: {
        reason,
        totalFine,
        contactEmail: env.SMTP_USER,
      },
      now,
    });
  }

  async enqueueAccountActivated(
    memberId: string,
    referenceId: string,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueEmail({
      template: 'account_activated',
      memberId,
      eventType: NotificationEvent.AccountActivated,
      referenceId,
      context: {},
      now,
    });
  }

  async enqueueReservationCreated(
    memberId: string,
    reservationId: string,
    bookTitle: string,
    createdByAdmin: boolean,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.ReservationCreated,
      referenceId: reservationId,
      title: 'Đặt chỗ thành công',
      body: createdByAdmin
        ? `Thư viện đã tạo đặt chỗ cho sách "${bookTitle}" trong tài khoản của bạn.`
        : `Bạn đã đặt chỗ sách "${bookTitle}" thành công.`,
      link: '/my-reservations',
      now,
    });
  }

  async enqueueReservationRequestedForBackoffice(
    reservationId: string,
    memberName: string,
    memberCardNo: string,
    bookTitle: string,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult[]> {
    const recipients = await this.repository.findBackofficeContacts();

    return Promise.all(
      recipients.map((recipient) =>
        this.enqueueInAppNotification({
          memberId: recipient._id,
          eventType: NotificationEvent.ReservationRequested,
          referenceId: reservationId,
          title: 'Có yêu cầu đặt chỗ mới',
          body: `${memberName} (${memberCardNo}) vừa đặt chỗ sách "${bookTitle}".`,
          link: '/reservations',
          now,
        }),
      ),
    );
  }

  async enqueueBookHoldCreated(
    memberId: string,
    holdId: string,
    bookId: string,
    bookTitle: string,
    shelfLocation: string | undefined,
    holdExpiryAt: Date,
    createdByBackoffice: boolean,
    now: Date = new Date(),
  ): Promise<EnqueueEmailResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.BookHoldCreated,
      referenceId: holdId,
      title: 'Đặt giữ thành công',
      body: `${createdByBackoffice ? 'Thư viện đã giữ' : 'Bạn đã giữ'} sách "${bookTitle}"${shelfLocation ? ` tại ${shelfLocation}` : ''}. Vui lòng đến nhận trước ${holdExpiryAt.toLocaleString('vi-VN')}.`,
      link: `/books/${bookId}`,
      now,
    });
  }

  async listMyNotifications(memberId: string, query: { page?: number; limit?: number }) {
    const pagination = buildPagination({ page: query.page, limit: query.limit ?? 10 });
    const { notifications, total, unreadTotal } = await this.repository.listNotifications(memberId, pagination.skip, pagination.limit);

    return {
      ...buildPaginationResult(notifications.map((notification) => this.toNotificationListItem(notification)), total, pagination),
      unreadTotal,
    };
  }

  async markNotificationRead(memberId: string, notificationId: string): Promise<NotificationListItem> {
    const notification = await this.repository.markNotificationRead(memberId, notificationId, new Date());

    if (!notification) {
      throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Notification not found');
    }

    return this.toNotificationListItem(notification);
  }

  async markAllNotificationsRead(memberId: string): Promise<{ updatedCount: number }> {
    const updatedCount = await this.repository.markAllNotificationsRead(memberId, new Date());
    return { updatedCount };
  }

  async enqueueEmail(params: EnqueueEmailParams): Promise<EnqueueEmailResult> {
    const { template, memberId, eventType, referenceId, context, now = new Date() } = params;
    const dateFrom = startOfUtcDay(now);
    const dateTo = endOfUtcDay(now);
    const existingLog = await this.repository.findNotificationForDay(
      memberId,
      eventType,
      referenceId,
      dateFrom,
      dateTo,
      activeDedupStatuses,
    );

    if (existingLog) {
      return {
        skipped: true,
        logId: existingLog._id.toString(),
        jobId: null,
      };
    }

    const member = await this.repository.findMemberContactById(memberId);

    if (!member) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    const subject = eventSubjects[eventType];
    const payloadContext = this.buildContext(member, context);
    const log = await this.repository.createNotificationLog({
      memberId,
      eventType,
      referenceId,
      template,
      recipientEmail: member.email,
      subject,
      status: 'PENDING',
      sentAt: now,
      lastError: null,
    });

    try {
      const job = await this.getEmailQueue().add(
        'send',
        {
          notificationLogId: log._id.toString(),
          template,
          to: member.email,
          subject,
          context: payloadContext,
          memberId,
          eventType,
          referenceId,
        },
        {
          jobId: `notification:${log._id.toString()}`,
        },
      );

      this.publishNotification(memberId, log);

      return {
        skipped: false,
        logId: log._id.toString(),
        jobId: job.id?.toString() ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to enqueue email notification';
      await this.repository.markNotificationFailed(log._id.toString(), message);
      logger.error({ err: error, memberId, eventType, referenceId }, 'Failed to enqueue email notification');
      throw error;
    }
  }

  private async enqueueInAppNotification(params: {
    memberId: string;
    eventType: NotificationEvent;
    referenceId: string;
    title: string;
    body?: string;
    link?: string;
    now?: Date;
  }): Promise<EnqueueEmailResult> {
    const { memberId, eventType, referenceId, title, body, link, now = new Date() } = params;
    const dateFrom = startOfUtcDay(now);
    const dateTo = endOfUtcDay(now);
    const existingLog = await this.repository.findNotificationForDay(
      memberId,
      eventType,
      referenceId,
      dateFrom,
      dateTo,
      activeDedupStatuses,
    );

    if (existingLog) {
      return {
        skipped: true,
        logId: existingLog._id.toString(),
        jobId: null,
      };
    }

    const member = await this.repository.findMemberContactById(memberId);

    if (!member) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    const log = await this.repository.createNotificationLog({
      memberId,
      eventType,
      referenceId,
      template: 'in_app',
      recipientEmail: member.email,
      subject: title,
      title,
      body,
      link,
      status: 'SENT',
      sentAt: now,
      lastError: null,
    });

    this.publishNotification(memberId, log);

    return {
      skipped: false,
      logId: log._id.toString(),
      jobId: null,
    };
  }

  private publishNotification(memberId: string, notification: NotificationLogDocument): void {
    const item = this.toNotificationListItem(notification);

    realtimeHub.emitNotification(memberId, item);
    realtimeHub.emitUserEvent(memberId, {
      type: item.eventType,
      resource: 'notification',
      action: 'created',
      referenceId: item.referenceId,
      payload: {
        notificationId: item._id,
        link: item.link,
      },
    });
  }

  private toNotificationListItem(notification: NotificationLogDocument): NotificationListItem {
    return {
      _id: notification._id.toString(),
      eventType: notification.eventType,
      referenceId: notification.referenceId.toString(),
      title: notification.title ?? notification.subject,
      body: notification.body ?? undefined,
      link: notification.link ?? this.getDefaultLink(notification.eventType),
      readAt: notification.readAt?.toISOString() ?? null,
      sentAt: notification.sentAt.toISOString(),
    };
  }

  private getDefaultLink(eventType: NotificationEvent): string | undefined {
    if (eventType === NotificationEvent.BookAvailable || eventType === NotificationEvent.HoldExpiring || eventType === NotificationEvent.ReservationCreated) {
      return '/my-reservations';
    }

    if (eventType === NotificationEvent.BookHoldCreated) {
      return '/search';
    }

    if (eventType === NotificationEvent.CheckoutConfirmation || eventType === NotificationEvent.DueReminder || eventType === NotificationEvent.Overdue) {
      return '/my-loans';
    }

    if (eventType === NotificationEvent.ReservationRequested) {
      return '/reservations';
    }

    return undefined;
  }

  private buildContext(
    member: NotificationMemberContact,
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      fullName: member.fullName,
      renewLink: buildLoanRenewLink(),
      ...context,
    };
  }
}

export const notificationService = new NotificationService();
