import { NotFoundError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { NotificationEvent } from '../../common/types/enums';
import { endOfUtcDay, startOfUtcDay } from '../../common/utils/dateHelpers';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import type { NotificationLogDocument, NotificationLogStatus } from '../../models/NotificationLog.model';
import type { NotificationListItem } from '@libero/shared';
import { realtimeHub } from '../../realtime/realtime';
import {
  notificationRepository,
  type NotificationRepository,
} from './notification.repository';

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

export interface EnqueueNotificationResult {
  skipped: boolean;
  logId: string | null;
  jobId: null;
}

const activeDedupStatuses: NotificationLogStatus[] = ['PENDING', 'SENT'];

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount);
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('vi-VN');
}

function formatDateTime(value: Date): string {
  return value.toLocaleString('vi-VN');
}

function joinBookTitles(books: Array<{ title: string }>, maxItems = 3): string {
  const titles = books.slice(0, maxItems).map((book) => `"${book.title}"`);
  const remaining = books.length - titles.length;

  return `${titles.join(', ')}${remaining > 0 ? ` và ${remaining} sách khác` : ''}`;
}

export class NotificationService {
  constructor(
    private readonly repository: NotificationRepository = notificationRepository,
  ) {}

  async enqueueCheckoutConfirmation(
    memberId: string,
    loanId: string,
    loans: CheckoutConfirmationBookContext[],
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult> {
    const nearestDueDate = loans.reduce<Date | null>((nearest, loan) => {
      if (!nearest || loan.dueDate < nearest) {
        return loan.dueDate;
      }

      return nearest;
    }, null);

    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.CheckoutConfirmation,
      referenceId: loanId,
      title: 'Khoản mượn đã được tạo',
      body: nearestDueDate
        ? `Bạn đã mượn ${loans.length} sách. Hạn trả gần nhất là ${formatDate(nearestDueDate)}.`
        : `Bạn đã mượn ${loans.length} sách.`,
      link: '/my-loans',
      now,
    });
  }

  async enqueueDueReminder(
    memberId: string,
    loanId: string,
    books: DueReminderBookContext[],
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.DueReminder,
      referenceId: loanId,
      title: 'Sách sắp đến hạn trả',
      body: `${joinBookTitles(books)} sắp đến hạn. Vui lòng trả sách hoặc liên hệ thư viện nếu cần hỗ trợ.`,
      link: '/my-loans',
      now,
    });
  }

  async enqueueOverdueNotice(
    memberId: string,
    referenceId: string,
    books: OverdueNoticeBookContext[],
    totalFine: number,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult> {
    const maxOverdueDays = books.reduce((max, book) => Math.max(max, book.overdueDays), 0);

    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.Overdue,
      referenceId,
      title: 'Khoản mượn quá hạn',
      body: `${joinBookTitles(books)} đã quá hạn tối đa ${maxOverdueDays} ngày. Tiền phạt hiện tại: ${formatCurrency(totalFine)}.`,
      link: '/my-loans',
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
  ): Promise<EnqueueNotificationResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.BookAvailable,
      referenceId: reservationId,
      title: 'Sách đã đến lượt nhận',
      body: `Sách "${title}" đã có thể nhận${shelfLocation ? ` tại ${shelfLocation}` : ''}${
        holdExpiryAt ? `. Vui lòng đến trước ${formatDateTime(holdExpiryAt)}` : ''
      }.`,
      link: '/my-reservations',
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
  ): Promise<EnqueueNotificationResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.HoldExpiring,
      referenceId: reservationId,
      title: 'Đặt giữ sắp hết hạn',
      body: `Sách "${title}" còn khoảng ${hoursLeft} giờ để nhận. Hạn cuối: ${formatDateTime(holdExpiryAt)}.`,
      link: '/my-reservations',
      now,
    });
  }

  async enqueueAccountBlocked(
    memberId: string,
    referenceId: string,
    reason: string,
    totalFine: number,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.AccountBlocked,
      referenceId,
      title: 'Thẻ thư viện đã bị khóa',
      body: `${reason}. Tiền phạt hiện tại: ${formatCurrency(totalFine)}. Vui lòng đến quầy thư viện để được hỗ trợ.`,
      link: '/profile',
      now,
    });
  }

  async enqueueAccountActivated(
    memberId: string,
    referenceId: string,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.AccountActivated,
      referenceId,
      title: 'Thẻ thư viện đã hoạt động',
      body: 'Bạn có thể tiếp tục sử dụng các dịch vụ mượn, đặt giữ và đặt chỗ tại thư viện.',
      link: '/profile',
      now,
    });
  }

  async enqueueReservationCreated(
    memberId: string,
    reservationId: string,
    bookTitle: string,
    createdByAdmin: boolean,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult> {
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
  ): Promise<EnqueueNotificationResult[]> {
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

  async enqueueMemberRegisteredForBackoffice(
    memberId: string,
    fullName: string,
    email: string,
    memberCardNo: string,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult[]> {
    return this.enqueueBackofficeNotification({
      eventType: NotificationEvent.MemberRegistered,
      referenceId: memberId,
      title: 'Độc giả mới đăng ký',
      body: `${fullName} (${memberCardNo}) vừa tạo tài khoản ${email}.`,
      link: `/members/${memberId}`,
      now,
    });
  }

  async enqueueBookHoldCreatedForBackoffice(
    holdId: string,
    memberName: string,
    memberCardNo: string,
    bookTitle: string,
    createdByBackoffice: boolean,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult[]> {
    return this.enqueueBackofficeNotification({
      eventType: NotificationEvent.BookHoldCreated,
      referenceId: holdId,
      title: createdByBackoffice ? 'Đặt giữ được tạo bởi thủ thư' : 'Có yêu cầu đặt giữ mới',
      body: `${memberName} (${memberCardNo}) đang giữ sách "${bookTitle}".`,
      link: '/book-holds',
      now,
    });
  }

  async enqueueBookHoldStatusForBackoffice(
    eventType: NotificationEvent.BookHoldCancelled | NotificationEvent.BookHoldExpired | NotificationEvent.BookHoldFulfilled,
    holdId: string,
    memberName: string,
    memberCardNo: string,
    bookTitle: string,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult[]> {
    const titleByEvent = {
      [NotificationEvent.BookHoldCancelled]: 'Đặt giữ đã hủy',
      [NotificationEvent.BookHoldExpired]: 'Đặt giữ đã hết hạn',
      [NotificationEvent.BookHoldFulfilled]: 'Đặt giữ đã được nhận',
    };

    return this.enqueueBackofficeNotification({
      eventType,
      referenceId: holdId,
      title: titleByEvent[eventType],
      body: `${memberName} (${memberCardNo}) - "${bookTitle}".`,
      link: '/book-holds',
      now,
    });
  }

  async enqueueReservationStatusForBackoffice(
    eventType:
      | NotificationEvent.ReservationAdvanced
      | NotificationEvent.ReservationCancelled
      | NotificationEvent.ReservationExpired
      | NotificationEvent.ReservationFulfilled,
    reservationId: string,
    memberName: string,
    memberCardNo: string,
    bookTitle: string,
    now: Date = new Date(),
  ): Promise<EnqueueNotificationResult[]> {
    const titleByEvent = {
      [NotificationEvent.ReservationAdvanced]: 'Đặt chỗ đã đến lượt nhận',
      [NotificationEvent.ReservationCancelled]: 'Đặt chỗ đã hủy',
      [NotificationEvent.ReservationExpired]: 'Đặt chỗ đã hết hạn',
      [NotificationEvent.ReservationFulfilled]: 'Đặt chỗ đã hoàn tất',
    };

    return this.enqueueBackofficeNotification({
      eventType,
      referenceId: reservationId,
      title: titleByEvent[eventType],
      body: `${memberName} (${memberCardNo}) - "${bookTitle}".`,
      link: '/reservations',
      now,
    });
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
  ): Promise<EnqueueNotificationResult> {
    return this.enqueueInAppNotification({
      memberId,
      eventType: NotificationEvent.BookHoldCreated,
      referenceId: holdId,
      title: 'Đặt giữ thành công',
      body: `${createdByBackoffice ? 'Thư viện đã giữ' : 'Bạn đã giữ'} sách "${bookTitle}"${
        shelfLocation ? ` tại ${shelfLocation}` : ''
      }. Vui lòng đến nhận trước ${formatDateTime(holdExpiryAt)}.`,
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

  private async enqueueInAppNotification(params: {
    memberId: string;
    eventType: NotificationEvent;
    referenceId: string;
    title: string;
    body?: string;
    link?: string;
    now?: Date;
  }): Promise<EnqueueNotificationResult> {
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

  private async enqueueBackofficeNotification(params: {
    eventType: NotificationEvent;
    referenceId: string;
    title: string;
    body?: string;
    link?: string;
    now?: Date;
  }): Promise<EnqueueNotificationResult[]> {
    const recipients = await this.repository.findBackofficeContacts();

    return Promise.all(
      recipients.map((recipient) =>
        this.enqueueInAppNotification({
          memberId: recipient._id,
          eventType: params.eventType,
          referenceId: params.referenceId,
          title: params.title,
          body: params.body,
          link: params.link,
          now: params.now,
        }),
      ),
    );
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

    if (eventType === NotificationEvent.MemberRegistered) {
      return '/members';
    }

    if (eventType === NotificationEvent.BookHoldCreated) {
      return '/search';
    }

    if (eventType === NotificationEvent.CheckoutConfirmation || eventType === NotificationEvent.DueReminder || eventType === NotificationEvent.Overdue) {
      return '/my-loans';
    }

    if (
      eventType === NotificationEvent.ReservationRequested ||
      eventType === NotificationEvent.ReservationAdvanced ||
      eventType === NotificationEvent.ReservationCancelled ||
      eventType === NotificationEvent.ReservationExpired ||
      eventType === NotificationEvent.ReservationFulfilled
    ) {
      return '/reservations';
    }

    if (
      eventType === NotificationEvent.BookHoldCancelled ||
      eventType === NotificationEvent.BookHoldExpired ||
      eventType === NotificationEvent.BookHoldFulfilled
    ) {
      return '/book-holds';
    }

    return undefined;
  }
}

export const notificationService = new NotificationService();
