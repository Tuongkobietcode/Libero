import type { Queue } from 'bullmq';

import { NotFoundError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { NotificationEvent } from '../../common/types/enums';
import { endOfUtcDay, startOfUtcDay } from '../../common/utils/dateHelpers';
import { logger } from '../../common/middleware/requestLogger';
import { getJobQueue } from '../../config/queue';
import { env } from '../../config/env';
import type { NotificationLogStatus } from '../../models/NotificationLog.model';
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
