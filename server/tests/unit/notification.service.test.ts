describe('notification service', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-notification-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.FINE_BLOCK_THRESHOLD = '50000';
    process.env.HOLD_EXPIRY_HOURS = '48';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    jest.resetModules();
    jest.doMock('../../src/realtime/realtime', () => ({
      realtimeHub: {
        emitNotification: jest.fn(),
        emitUserEvent: jest.fn(),
      },
    }));
  });

  it('deduplicates same event and reference on the same day', async () => {
    const { NotificationService } = await import('../../src/modules/notification/notification.service');
    const repository = {
      findNotificationForDay: jest.fn().mockResolvedValue({ _id: { toString: () => 'log-1' } }),
      findMemberContactById: jest.fn(),
      createNotificationLog: jest.fn(),
    } as any;
    const service = new NotificationService(repository);

    const result = await service.enqueueAccountActivated(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439011',
      new Date('2026-04-13T08:00:00.000Z'),
    );

    expect(result).toEqual({
      skipped: true,
      logId: 'log-1',
      jobId: null,
    });
    expect(repository.findMemberContactById).not.toHaveBeenCalled();
    expect(repository.createNotificationLog).not.toHaveBeenCalled();
  });

  it('creates an in-app notification log and publishes realtime events', async () => {
    const { NotificationEvent } = await import('../../src/common/types/enums');
    const { NotificationService } = await import('../../src/modules/notification/notification.service');
    const { realtimeHub } = await import('../../src/realtime/realtime');
    const sentAt = new Date('2026-04-13T08:00:00.000Z');
    const repository = {
      findNotificationForDay: jest.fn().mockResolvedValue(null),
      findMemberContactById: jest.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        fullName: 'Nguyễn Tuấn Tú',
        email: 'nguyentuantu@library.edu',
      }),
      createNotificationLog: jest.fn().mockResolvedValue({
        _id: { toString: () => '507f1f77bcf86cd799439099' },
        eventType: NotificationEvent.AccountActivated,
        referenceId: { toString: () => '507f1f77bcf86cd799439011' },
        title: 'Thẻ thư viện đã hoạt động',
        subject: 'Thẻ thư viện đã hoạt động',
        body: 'Bạn có thể tiếp tục sử dụng các dịch vụ mượn, đặt giữ và đặt chỗ tại thư viện.',
        link: '/profile',
        readAt: null,
        sentAt,
      }),
    } as any;
    const service = new NotificationService(repository);

    const result = await service.enqueueAccountActivated(
      '507f1f77bcf86cd799439011',
      '507f1f77bcf86cd799439011',
      sentAt,
    );

    expect(result).toEqual({
      skipped: false,
      logId: '507f1f77bcf86cd799439099',
      jobId: null,
    });
    expect(repository.createNotificationLog).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'in_app',
        subject: 'Thẻ thư viện đã hoạt động',
        status: 'SENT',
        sentAt,
      }),
    );
    expect(realtimeHub.emitNotification).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({
        title: 'Thẻ thư viện đã hoạt động',
        link: '/profile',
      }),
    );
    expect(realtimeHub.emitUserEvent).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      expect.objectContaining({
        type: NotificationEvent.AccountActivated,
        action: 'created',
      }),
    );
  });
});
