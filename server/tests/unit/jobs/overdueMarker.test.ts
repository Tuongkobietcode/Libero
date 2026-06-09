describe('overdueMarker job', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-job-overdue-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'smtp-user';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.FINE_BLOCK_THRESHOLD = '50000';
    process.env.HOLD_EXPIRY_HOURS = '48';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    jest.resetModules();
  });

  it('marks overdue active loans as OVERDUE', async () => {
    const exec = jest.fn().mockResolvedValue({
      matchedCount: 2,
      modifiedCount: 2,
    });
    const updateMany = jest.fn().mockReturnValue({
      exec,
    });

    jest.doMock('../../../src/models/LoanRecord.model', () => ({
      LoanRecordModel: {
        updateMany,
      },
    }));

    const { LoanStatus } = await import('../../../src/common/types/enums');
    const { runOverdueMarkerJob } = await import('../../../src/jobs/overdueMarker.job');

    const now = new Date('2026-04-12T08:00:00.000Z');
    const summary = await runOverdueMarkerJob(now);

    expect(updateMany).toHaveBeenCalledWith(
      {
        status: LoanStatus.Active,
        returnDate: null,
        dueDate: {
          $lt: new Date('2026-04-12T00:00:00.000Z'),
        },
      },
      {
        $set: {
          status: LoanStatus.Overdue,
        },
      },
    );
    expect(summary.processedCount).toBe(2);
    expect(summary.updatedCount).toBe(2);
  });

  it('uses Vietnam calendar date for the overdue cutoff', async () => {
    const exec = jest.fn().mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    });
    const updateMany = jest.fn().mockReturnValue({
      exec,
    });

    jest.doMock('../../../src/models/LoanRecord.model', () => ({
      LoanRecordModel: {
        updateMany,
      },
    }));

    const { LoanStatus } = await import('../../../src/common/types/enums');
    const { runOverdueMarkerJob } = await import('../../../src/jobs/overdueMarker.job');

    const summary = await runOverdueMarkerJob(new Date('2026-04-12T17:05:00.000Z'));

    expect(updateMany).toHaveBeenCalledWith(
      {
        status: LoanStatus.Active,
        returnDate: null,
        dueDate: {
          $lt: new Date('2026-04-13T00:00:00.000Z'),
        },
      },
      {
        $set: {
          status: LoanStatus.Overdue,
        },
      },
    );
    expect(summary.updatedCount).toBe(1);
  });
});
