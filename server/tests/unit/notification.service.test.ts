describe('notification service and email sender', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-notification-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp-user@example.com';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.FINE_BLOCK_THRESHOLD = '50000';
    process.env.HOLD_EXPIRY_HOURS = '48';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    jest.resetModules();
  });

  it('deduplicates same event and reference on the same day', async () => {
    const { NotificationEvent } = await import('../../src/common/types/enums');
    const { NotificationService } = await import('../../src/modules/notification/notification.service');
    const repository = {
      findNotificationForDay: jest.fn().mockResolvedValue({ _id: { toString: () => 'log-1' } }),
      findMemberContactById: jest.fn(),
      createNotificationLog: jest.fn(),
      markNotificationFailed: jest.fn(),
    } as any;
    const queue = {
      add: jest.fn(),
    } as any;
    const service = new NotificationService(repository, () => queue);

    const result = await service.enqueueEmail({
      template: 'due_reminder',
      memberId: '507f1f77bcf86cd799439011',
      eventType: NotificationEvent.DueReminder,
      referenceId: '507f1f77bcf86cd799439012',
      context: { books: [] },
      now: new Date('2026-04-13T08:00:00.000Z'),
    });

    expect(result.skipped).toBe(true);
    expect(queue.add).not.toHaveBeenCalled();
    expect(repository.createNotificationLog).not.toHaveBeenCalled();
  });

  it('creates a notification log and enqueues an email job', async () => {
    const { NotificationService } = await import('../../src/modules/notification/notification.service');
    const repository = {
      findNotificationForDay: jest.fn().mockResolvedValue(null),
      findMemberContactById: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        fullName: 'Reader User',
        email: 'reader@example.com',
      }),
      createNotificationLog: jest.fn().mockResolvedValue({
        _id: { toString: () => 'log-2' },
      }),
      markNotificationFailed: jest.fn(),
    } as any;
    const queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-2' }),
    } as any;
    const service = new NotificationService(repository, () => queue);

    const result = await service.enqueueAccountActivated(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439011',
      new Date('2026-04-13T08:00:00.000Z'),
    );

    expect(result.skipped).toBe(false);
    expect(result.logId).toBe('log-2');
    expect(result.jobId).toBe('job-2');
    expect(repository.createNotificationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING',
        template: 'account_activated',
        recipientEmail: 'reader@example.com',
      }),
    );
    expect(queue.add).toHaveBeenCalledWith(
      'send',
      expect.objectContaining({
        template: 'account_activated',
        to: 'reader@example.com',
      }),
      expect.objectContaining({
        jobId: 'notification:log-2',
      }),
    );
  });

  it('renders and sends email successfully', async () => {
    const { NotificationEvent } = await import('../../src/common/types/enums');
    const { processEmailSenderJob } = await import('../../src/jobs/emailSender.job');
    const repository = {
      markNotificationSent: jest.fn().mockResolvedValue(undefined),
      markNotificationFailed: jest.fn(),
    } as any;
    const transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'message-1' }),
    } as any;

    await processEmailSenderJob(
      {
        id: 'job-1',
        attemptsMade: 0,
        opts: { attempts: 3 },
        data: {
          notificationLogId: '507f1f77bcf86cd799439011',
          template: 'account_activated',
          to: 'reader@example.com',
          subject: 'LIBERO - Account activated',
          context: { fullName: 'Reader User' },
          memberId: '507f1f77bcf86cd799439011',
          eventType: NotificationEvent.AccountActivated,
          referenceId: '507f1f77bcf86cd799439011',
        },
      } as any,
      {
        repository,
        transporter,
        now: new Date('2026-04-13T08:00:00.000Z'),
      },
    );

    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'reader@example.com',
        subject: 'LIBERO - Account activated',
        html: expect.stringContaining('Account Activated'),
      }),
    );
    expect(repository.markNotificationSent).toHaveBeenCalledTimes(1);
  });

  it('marks notification as failed when email delivery fails', async () => {
    const { NotificationEvent } = await import('../../src/common/types/enums');
    const { processEmailSenderJob } = await import('../../src/jobs/emailSender.job');
    const repository = {
      markNotificationSent: jest.fn(),
      markNotificationFailed: jest.fn().mockResolvedValue(undefined),
    } as any;
    const transporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP unavailable')),
    } as any;

    await expect(
      processEmailSenderJob(
        {
          id: 'job-2',
          attemptsMade: 2,
          opts: { attempts: 3 },
          data: {
            notificationLogId: '507f1f77bcf86cd799439011',
            template: 'account_activated',
            to: 'reader@example.com',
            subject: 'LIBERO - Account activated',
            context: { fullName: 'Reader User' },
            memberId: '507f1f77bcf86cd799439011',
            eventType: NotificationEvent.AccountActivated,
            referenceId: '507f1f77bcf86cd799439011',
          },
        } as any,
        {
          repository,
          transporter,
        },
      ),
    ).rejects.toThrow('SMTP unavailable');

    expect(repository.markNotificationFailed).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      'SMTP unavailable',
    );
  });
});
