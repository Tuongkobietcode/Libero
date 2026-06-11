import { Types } from 'mongoose';

describe('fineCalculation job', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '5000';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/libero-job-fine-test?replicaSet=rs0';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = '0123456789abcdef0123456789abcdef';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '604800';
    process.env.FINE_BLOCK_THRESHOLD = '10000';
    process.env.HOLD_EXPIRY_HOURS = '48';
    process.env.FRONTEND_URL = 'http://localhost:5173';
    jest.resetModules();
    jest.doMock('../../../src/config/redis', () => ({
      getRedisClient: jest.fn(() => ({
        del: jest.fn().mockResolvedValue(1),
      })),
    }));
  });

  function createLoanFixtures() {
    const loanId = new Types.ObjectId();
    const memberId = new Types.ObjectId();
    const overdueLoan = {
      _id: loanId,
      memberId,
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
      returnDate: null,
    };

    return {
      loanId,
      memberId,
      overdueLoan,
    };
  }

  it('creates daily fines for overdue loans and blocks the member at threshold', async () => {
    const { LoanStatus, FineStatus } = await import('../../../src/common/types/enums');
    const { loanId, memberId, overdueLoan } = createLoanFixtures();
    const insertedFineRecords: Array<{
      loanId: Types.ObjectId;
      memberId: Types.ObjectId;
      overdueDate: Date;
      amount: number;
      status: string;
      note: string;
    }> = [];
    const loanFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            ...overdueLoan,
            status: LoanStatus.Overdue,
          },
        ]),
      }),
    });
    const fineFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockImplementation(async () =>
          insertedFineRecords.map((record) => ({
            loanId: record.loanId,
            overdueDate: record.overdueDate,
          })),
        ),
      }),
    });
    const insertMany = jest.fn().mockImplementation(async (records: typeof insertedFineRecords) => {
      insertedFineRecords.push(...records);
      return records;
    });

    jest.doMock('../../../src/models/LoanRecord.model', () => ({
      LoanRecordModel: {
        find: loanFind,
      },
    }));
    jest.doMock('../../../src/models/FineRecord.model', () => ({
      FineRecordModel: {
        find: fineFind,
        insertMany,
      },
    }));

    const repositoryState = {
      isBlocked: false,
    };
    const repository = {
      listFineRates: jest.fn().mockResolvedValue([
        {
          ratePerDay: 5000,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
      findMemberById: jest.fn().mockImplementation(async (id: string) => {
        if (id !== memberId.toString()) {
          return null;
        }

        return { isBlocked: repositoryState.isBlocked };
      }),
      sumUnpaidFines: jest.fn().mockImplementation(async () =>
        insertedFineRecords.reduce((total, record) => total + record.amount, 0),
      ),
      updateMemberBlockedStatus: jest.fn().mockImplementation(async (_id: string, isBlocked: boolean) => {
        repositoryState.isBlocked = isBlocked;
      }),
    };
    const notifications = {
      enqueueAccountBlocked: jest.fn().mockResolvedValue({ skipped: false, logId: '1', jobId: '1' }),
      enqueueAccountActivated: jest.fn().mockResolvedValue({ skipped: false, logId: '2', jobId: '2' }),
    };

    const { runFineCalculationJob } = await import('../../../src/jobs/fineCalculation.job');

    const summary = await runFineCalculationJob({
      now: new Date('2026-04-13T08:00:00.000Z'),
      repository: repository as any,
      notifications: notifications as any,
    });

    expect(loanFind).toHaveBeenCalledWith({
      status: { $in: [LoanStatus.Overdue, LoanStatus.Active] },
      returnDate: null,
      dueDate: {
        $lt: new Date('2026-04-13T00:00:00.000Z'),
      },
    });
    expect(insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          loanId,
          memberId,
          amount: 5000,
          status: FineStatus.Unpaid,
        }),
        expect.objectContaining({
          loanId,
          memberId,
          amount: 5000,
          status: FineStatus.Unpaid,
        }),
        expect.objectContaining({
          loanId,
          memberId,
          amount: 5000,
          status: FineStatus.Unpaid,
        }),
      ],
      {
        ordered: false,
      },
    );
    expect(summary.processedLoans).toBe(1);
    expect(summary.fineCandidates).toBe(3);
    expect(summary.finesCreated).toBe(3);
    expect(summary.blockChanges).toBe(1);
    expect(repository.updateMemberBlockedStatus).toHaveBeenCalledWith(memberId.toString(), true, undefined);
    expect(notifications.enqueueAccountBlocked).toHaveBeenCalledTimes(1);
  });

  it('creates fines for active loans that are already past due when the marker has not run', async () => {
    const { LoanStatus } = await import('../../../src/common/types/enums');
    const { overdueLoan } = createLoanFixtures();
    const insertedFineRecords: Array<{
      loanId: Types.ObjectId;
      memberId: Types.ObjectId;
      overdueDate: Date;
      amount: number;
      status: string;
      note: string;
    }> = [];
    const loanFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            ...overdueLoan,
            status: LoanStatus.Active,
          },
        ]),
      }),
    });
    const fineFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });
    const insertMany = jest.fn().mockImplementation(async (records: typeof insertedFineRecords) => {
      insertedFineRecords.push(...records);
      return records;
    });

    jest.doMock('../../../src/models/LoanRecord.model', () => ({
      LoanRecordModel: {
        find: loanFind,
      },
    }));
    jest.doMock('../../../src/models/FineRecord.model', () => ({
      FineRecordModel: {
        find: fineFind,
        insertMany,
      },
    }));

    const repository = {
      listFineRates: jest.fn().mockResolvedValue([
        {
          ratePerDay: 5000,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
      findMemberById: jest.fn().mockResolvedValue({ isBlocked: false }),
      sumUnpaidFines: jest.fn().mockResolvedValue(0),
      updateMemberBlockedStatus: jest.fn(),
    };
    const notifications = {
      enqueueAccountBlocked: jest.fn(),
      enqueueAccountActivated: jest.fn(),
    };

    const { runFineCalculationJob } = await import('../../../src/jobs/fineCalculation.job');

    const summary = await runFineCalculationJob({
      now: new Date('2026-04-13T08:00:00.000Z'),
      repository: repository as any,
      notifications: notifications as any,
    });

    expect(loanFind).toHaveBeenCalledWith({
      status: { $in: [LoanStatus.Overdue, LoanStatus.Active] },
      returnDate: null,
      dueDate: {
        $lt: new Date('2026-04-13T00:00:00.000Z'),
      },
    });
    expect(summary.finesCreated).toBe(3);
    expect(insertedFineRecords).toHaveLength(3);
  });

  it('does not duplicate legacy aggregate overdue fines', async () => {
    const { LoanStatus } = await import('../../../src/common/types/enums');
    const { loanId, memberId, overdueLoan } = createLoanFixtures();
    const insertedFineRecords: Array<{
      loanId: Types.ObjectId;
      memberId: Types.ObjectId;
      overdueDate: Date;
      amount: number;
      status: string;
      note: string;
    }> = [];
    const legacyFineRecord = {
      loanId,
      memberId,
      overdueDate: overdueLoan.dueDate,
      amount: 10000,
    };
    const loanFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            ...overdueLoan,
            status: LoanStatus.Overdue,
          },
        ]),
      }),
    });
    const fineFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([legacyFineRecord]),
      }),
    });
    const insertMany = jest.fn().mockImplementation(async (records: typeof insertedFineRecords) => {
      insertedFineRecords.push(...records);
      return records;
    });

    jest.doMock('../../../src/models/LoanRecord.model', () => ({
      LoanRecordModel: {
        find: loanFind,
      },
    }));
    jest.doMock('../../../src/models/FineRecord.model', () => ({
      FineRecordModel: {
        find: fineFind,
        insertMany,
      },
    }));

    const repository = {
      listFineRates: jest.fn().mockResolvedValue([
        {
          ratePerDay: 5000,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
      findMemberById: jest.fn().mockResolvedValue({ isBlocked: false }),
      sumUnpaidFines: jest.fn().mockResolvedValue(0),
      updateMemberBlockedStatus: jest.fn(),
    };
    const notifications = {
      enqueueAccountBlocked: jest.fn(),
      enqueueAccountActivated: jest.fn(),
    };

    const { runFineCalculationJob } = await import('../../../src/jobs/fineCalculation.job');

    const summary = await runFineCalculationJob({
      now: new Date('2026-04-13T08:00:00.000Z'),
      repository: repository as any,
      notifications: notifications as any,
    });

    expect(summary.fineCandidates).toBe(1);
    expect(summary.finesCreated).toBe(1);
    expect(insertedFineRecords).toEqual([
      expect.objectContaining({
        loanId,
        memberId,
        overdueDate: new Date('2026-04-13T00:00:00.000Z'),
        amount: 5000,
      }),
    ]);
  });

  it('uses Vietnam calendar date when calculating the current overdue day', async () => {
    const { LoanStatus } = await import('../../../src/common/types/enums');
    const { overdueLoan } = createLoanFixtures();
    const insertedFineRecords: Array<{
      loanId: Types.ObjectId;
      memberId: Types.ObjectId;
      overdueDate: Date;
      amount: number;
      status: string;
      note: string;
    }> = [];
    const loanFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            ...overdueLoan,
            status: LoanStatus.Overdue,
          },
        ]),
      }),
    });
    const fineFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });
    const insertMany = jest.fn().mockImplementation(async (records: typeof insertedFineRecords) => {
      insertedFineRecords.push(...records);
      return records;
    });

    jest.doMock('../../../src/models/LoanRecord.model', () => ({
      LoanRecordModel: {
        find: loanFind,
      },
    }));
    jest.doMock('../../../src/models/FineRecord.model', () => ({
      FineRecordModel: {
        find: fineFind,
        insertMany,
      },
    }));

    const repository = {
      listFineRates: jest.fn().mockResolvedValue([
        {
          ratePerDay: 5000,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
      findMemberById: jest.fn().mockResolvedValue({ isBlocked: false }),
      sumUnpaidFines: jest.fn().mockResolvedValue(0),
      updateMemberBlockedStatus: jest.fn(),
    };
    const notifications = {
      enqueueAccountBlocked: jest.fn(),
      enqueueAccountActivated: jest.fn(),
    };

    const { runFineCalculationJob } = await import('../../../src/jobs/fineCalculation.job');

    const summary = await runFineCalculationJob({
      now: new Date('2026-04-12T17:05:00.000Z'),
      repository: repository as any,
      notifications: notifications as any,
    });

    expect(loanFind).toHaveBeenCalledWith({
      status: { $in: [LoanStatus.Overdue, LoanStatus.Active] },
      returnDate: null,
      dueDate: {
        $lt: new Date('2026-04-13T00:00:00.000Z'),
      },
    });
    expect(summary.finesCreated).toBe(3);
    expect(insertedFineRecords.map((fine) => fine.overdueDate)).toEqual([
      new Date('2026-04-11T00:00:00.000Z'),
      new Date('2026-04-12T00:00:00.000Z'),
      new Date('2026-04-13T00:00:00.000Z'),
    ]);
  });

  it('is idempotent when run multiple times', async () => {
    const { LoanStatus } = await import('../../../src/common/types/enums');
    const { memberId, overdueLoan } = createLoanFixtures();
    const insertedFineRecords: Array<{
      loanId: Types.ObjectId;
      memberId: Types.ObjectId;
      overdueDate: Date;
      amount: number;
      status: string;
      note: string;
    }> = [];
    const loanFind = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            ...overdueLoan,
            status: LoanStatus.Overdue,
          },
        ]),
      }),
    });
    const fineFind = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockImplementation(async () =>
          insertedFineRecords.map((record) => ({
            loanId: record.loanId,
            overdueDate: record.overdueDate,
          })),
        ),
      }),
    });
    const insertMany = jest.fn().mockImplementation(async (records: typeof insertedFineRecords) => {
      insertedFineRecords.push(...records);
      return records;
    });

    jest.doMock('../../../src/models/LoanRecord.model', () => ({
      LoanRecordModel: {
        find: loanFind,
      },
    }));
    jest.doMock('../../../src/models/FineRecord.model', () => ({
      FineRecordModel: {
        find: fineFind,
        insertMany,
      },
    }));

    const repositoryState = {
      isBlocked: false,
    };
    const repository = {
      listFineRates: jest.fn().mockResolvedValue([
        {
          ratePerDay: 5000,
          effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
      findMemberById: jest.fn().mockImplementation(async () => ({ isBlocked: repositoryState.isBlocked })),
      sumUnpaidFines: jest.fn().mockImplementation(async () =>
        insertedFineRecords.reduce((total, record) => total + record.amount, 0),
      ),
      updateMemberBlockedStatus: jest.fn().mockImplementation(async (_id: string, isBlocked: boolean) => {
        repositoryState.isBlocked = isBlocked;
      }),
    };
    const notifications = {
      enqueueAccountBlocked: jest.fn().mockResolvedValue({ skipped: false, logId: '1', jobId: '1' }),
      enqueueAccountActivated: jest.fn().mockResolvedValue({ skipped: false, logId: '2', jobId: '2' }),
    };

    const { runFineCalculationJob } = await import('../../../src/jobs/fineCalculation.job');
    const now = new Date('2026-04-13T08:00:00.000Z');

    await runFineCalculationJob({
      now,
      repository: repository as any,
      notifications: notifications as any,
    });
    await runFineCalculationJob({
      now,
      repository: repository as any,
      notifications: notifications as any,
    });

    expect(insertedFineRecords).toHaveLength(3);
    expect(insertMany).toHaveBeenCalledTimes(1);
    expect(notifications.enqueueAccountBlocked).toHaveBeenCalledTimes(1);
    expect(repository.findMemberById).toHaveBeenCalledWith(memberId.toString(), undefined);
  });
});
