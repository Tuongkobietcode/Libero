import mongoose from 'mongoose';

import { BadRequestError, BusinessRuleError } from '../../src/common/errors/AppError';
import { ERR } from '../../src/common/errors/errorCodes';
import { FineStatus, LoanStatus, MemberStatus, Role } from '../../src/common/types/enums';
import { FineService } from '../../src/modules/fine/fine.service';
import type { FineRepository } from '../../src/modules/fine/fine.repository';

jest.mock('../../src/common/utils/auditLogger', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    del: jest.fn().mockResolvedValue(1),
  })),
}));

jest.mock('../../src/modules/notification/notification.service', () => ({
  notificationService: {
    enqueueAccountBlocked: jest.fn().mockResolvedValue({ skipped: false, logId: '1', jobId: '1' }),
    enqueueAccountActivated: jest.fn().mockResolvedValue({ skipped: false, logId: '2', jobId: '2' }),
  },
}));

function createRepositoryMock(): jest.Mocked<FineRepository> {
  return {
    findFineById: jest.fn(),
    findFinesByIds: jest.fn(),
    markFinesPaid: jest.fn(),
    waiveFine: jest.fn(),
    listFines: jest.fn(),
    aggregateFineSummary: jest.fn(),
    findMembersByIds: jest.fn(),
    findLoansByIds: jest.fn(),
    findBooksByIds: jest.fn(),
    findMemberById: jest.fn(),
    sumUnpaidFines: jest.fn(),
    updateMemberBlockedStatus: jest.fn(),
    listFineRates: jest.fn(),
    createFineRate: jest.fn(),
    findFineRateByDate: jest.fn(),
  } as unknown as jest.Mocked<FineRepository>;
}

function createMemberDocument(overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    fullName: 'Reader User',
    email: 'reader@example.com',
    memberCardNo: 'MEM-2026-00010',
    role: Role.Student,
    status: MemberStatus.Active,
    isBlocked: true,
    ...overrides,
  } as any;
}

function createBookDocument(overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    isbn: '9781234567890',
    title: 'Domain-Driven Design',
    bookValue: 120000,
    ...overrides,
  } as any;
}

function createLoanDocument(
  memberId: mongoose.Types.ObjectId,
  bookId: mongoose.Types.ObjectId,
  overrides: Record<string, unknown> = {},
) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    memberId,
    copyId: new mongoose.Types.ObjectId(),
    bookId,
    checkoutDate: new Date('2026-04-01T00:00:00.000Z'),
    dueDate: new Date('2026-04-15T00:00:00.000Z'),
    returnDate: new Date('2026-04-20T00:00:00.000Z'),
    status: LoanStatus.Returned,
    renewCount: 0,
    policyLoanDays: 14,
    policyMaxRenewals: 1,
    policyRenewDays: 7,
    ...overrides,
  } as any;
}

function createFineDocument(
  memberId: mongoose.Types.ObjectId,
  loanId: mongoose.Types.ObjectId,
  overrides: Record<string, unknown> = {},
) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    memberId,
    loanId,
    overdueDate: new Date('2026-04-16T00:00:00.000Z'),
    amount: 30000,
    status: FineStatus.Unpaid,
    paidAt: null,
    waivedBy: null,
    note: 'Overdue',
    createdAt: new Date('2026-04-20T00:00:00.000Z'),
    ...overrides,
  } as any;
}

describe('FineService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects payFines when a selected fine is already paid', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument();
    const loan = createLoanDocument(member._id, book._id);
    const fine = createFineDocument(member._id, loan._id, { status: FineStatus.Paid });
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    repository.findFinesByIds.mockResolvedValue([fine]);

    const service = new FineService(repository);

    await expect(
      service.payFines({ fineIds: [fine.id] }, { actorId: 'actor-id', actorRole: Role.Librarian }),
    ).rejects.toMatchObject<Partial<BusinessRuleError>>({
      code: ERR.FINE_ALREADY_PAID,
      statusCode: 422,
    });
  });

  it('rejects payFines when a selected fine is already waived', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument();
    const loan = createLoanDocument(member._id, book._id);
    const fine = createFineDocument(member._id, loan._id, { status: FineStatus.Waived });
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    repository.findFinesByIds.mockResolvedValue([fine]);

    const service = new FineService(repository);

    await expect(
      service.payFines({ fineIds: [fine.id] }, { actorId: 'actor-id', actorRole: Role.Librarian }),
    ).rejects.toMatchObject<Partial<BusinessRuleError>>({
      code: ERR.FINE_ALREADY_WAIVED,
      statusCode: 422,
    });
  });

  it('rejects waiveFine when reason is shorter than the business rule', async () => {
    const repository = createRepositoryMock();
    const service = new FineService(repository);

    await expect(
      service.waiveFine('507f191e810c19729de860ea', { reason: 'short' }, { actorId: 'actor-id', actorRole: Role.Librarian }),
    ).rejects.toMatchObject<Partial<BadRequestError>>({
      code: ERR.FINE_WAIVE_NO_REASON,
      statusCode: 400,
    });
  });

  it('unblocks the member after payFines drops unpaid total below threshold', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument({ isBlocked: true });
    const book = createBookDocument();
    const loan = createLoanDocument(member._id, book._id);
    const fine = createFineDocument(member._id, loan._id);
    const paidFine = createFineDocument(member._id, loan._id, {
      _id: fine._id,
      id: fine.id,
      status: FineStatus.Paid,
      paidAt: new Date('2026-04-21T00:00:00.000Z'),
    });
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    repository.findFinesByIds
      .mockResolvedValueOnce([fine])
      .mockResolvedValueOnce([paidFine]);
    repository.markFinesPaid.mockResolvedValue();
    repository.findMemberById.mockResolvedValue(member);
    repository.sumUnpaidFines.mockResolvedValue(0);
    repository.findMembersByIds.mockResolvedValue([{ ...member, isBlocked: false }]);
    repository.findLoansByIds.mockResolvedValue([loan]);
    repository.findBooksByIds.mockResolvedValue([book]);

    const service = new FineService(repository);

    const result = await service.payFines(
      { fineIds: [fine.id] },
      { actorId: 'actor-id', actorRole: Role.Librarian },
    );

    expect(repository.updateMemberBlockedStatus).toHaveBeenCalledWith(member.id, false, expect.anything());
    expect(result.updatedCount).toBe(1);
    expect(result.fines[0]?.status).toBe(FineStatus.Paid);
  });
});
