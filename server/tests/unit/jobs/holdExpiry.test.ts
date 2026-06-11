describe('holdExpiry job', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-job-hold-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.FINE_BLOCK_THRESHOLD = '50000';
    process.env.HOLD_EXPIRY_HOURS = '48';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    jest.resetModules();
  });

  it('expires notified reservations in hold-expiry order', async () => {
    const select = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: { toString: () => 'reservation-1' } },
          { _id: { toString: () => 'reservation-2' } },
        ]),
      }),
    });
    const find = jest.fn().mockReturnValue({
      select,
    });
    const service = {
      expireHold: jest.fn().mockResolvedValue(undefined),
    };
    const bookHoldFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    jest.doMock('../../../src/models/Reservation.model', () => ({
      ReservationModel: {
        find,
      },
    }));
    jest.doMock('../../../src/models/BookHold.model', () => ({
      BookHoldModel: {
        find: bookHoldFind,
      },
    }));

    const { ReservationStatus } = await import('../../../src/common/types/enums');
    const { runHoldExpiryJob } = await import('../../../src/jobs/holdExpiry.job');

    const summary = await runHoldExpiryJob({
      now: new Date('2026-04-13T08:00:00.000Z'),
      service,
    });

    expect(find).toHaveBeenCalledWith({
      status: ReservationStatus.Notified,
      holdExpiryAt: {
        $lte: new Date('2026-04-13T08:00:00.000Z'),
      },
    });
    expect(service.expireHold).toHaveBeenNthCalledWith(1, 'reservation-1');
    expect(service.expireHold).toHaveBeenNthCalledWith(2, 'reservation-2');
    expect(summary.processedCount).toBe(2);
    expect(summary.expiredCount).toBe(2);
    expect(summary.failedCount).toBe(0);
  });

  it('continues processing and counts failures when a reservation cannot be expired', async () => {
    const find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { _id: { toString: () => 'reservation-1' } },
            { _id: { toString: () => 'reservation-2' } },
          ]),
        }),
      }),
    });
    const service = {
      expireHold: jest
        .fn()
        .mockRejectedValueOnce(new Error('Hold already released'))
        .mockResolvedValueOnce(undefined),
    };
    const bookHoldFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    jest.doMock('../../../src/models/Reservation.model', () => ({
      ReservationModel: {
        find,
      },
    }));
    jest.doMock('../../../src/models/BookHold.model', () => ({
      BookHoldModel: {
        find: bookHoldFind,
      },
    }));

    const { runHoldExpiryJob } = await import('../../../src/jobs/holdExpiry.job');

    const summary = await runHoldExpiryJob({
      now: new Date('2026-04-13T08:00:00.000Z'),
      service,
    });

    expect(service.expireHold).toHaveBeenCalledTimes(2);
    expect(summary.processedCount).toBe(2);
    expect(summary.expiredCount).toBe(1);
    expect(summary.failedCount).toBe(1);
  });
});
