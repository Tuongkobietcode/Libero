import mongoose from 'mongoose';

import { BadRequestError, BusinessRuleError } from '../../src/common/errors/AppError';
import { ERR } from '../../src/common/errors/errorCodes';
import {
  CopyStatus,
  LoanStatus,
  MemberStatus,
  ReservationStatus,
  Role,
} from '../../src/common/types/enums';
import { LoanService } from '../../src/modules/loan/loan.service';
import type { LoanRepository } from '../../src/modules/loan/loan.repository';

jest.mock('../../src/common/utils/auditLogger', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    del: jest.fn().mockResolvedValue(1),
  })),
}));

function createRepositoryMock(): jest.Mocked<LoanRepository> {
  return {
    findBookCopyByBarcode: jest.fn(),
    findBookCopyById: jest.fn(),
    updateCopyStatusIfCurrent: jest.fn(),
    findBookById: jest.fn(),
    findMemberById: jest.fn(),
    updateMemberBlockedStatus: jest.fn(),
    findLoanPolicyByRole: jest.fn(),
    countActiveLoans: jest.fn(),
    hasActiveLoanForBook: jest.fn(),
    createLoanRecord: jest.fn(),
    findNotifiedReservationForMemberBook: jest.fn(),
    fulfillReservationById: jest.fn(),
    findLoanById: jest.fn(),
    findActiveLoanByCopyId: jest.fn(),
    renewLoanById: jest.fn(),
    markLoanReturned: jest.fn(),
    markLoanLost: jest.fn(),
    findReservationById: jest.fn().mockResolvedValue(null),
    findWaitingReservationByBookId: jest.fn(),
    notifyReservationById: jest.fn(),
    hasWaitingReservationForBook: jest.fn(),
    findFineRatesEffectiveOnOrBefore: jest.fn(),
    createFineRecords: jest.fn(),
    sumUnpaidFines: jest.fn(),
    listLoans: jest.fn(),
    findFineRecordsByLoanIds: jest.fn(),
    findMembersByIds: jest.fn(),
    findBooksByIds: jest.fn(),
    findCopiesByIds: jest.fn(),
  } as unknown as jest.Mocked<LoanRepository>;
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
    isBlocked: false,
    ...overrides,
  } as any;
}

function createBookDocument(overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    isbn: '9781234567890',
    title: 'Distributed Systems',
    authorIds: [],
    categoryIds: [],
    bookValue: 120000,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any;
}

function createCopyDocument(bookId: mongoose.Types.ObjectId, overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    bookId,
    barcode: 'LIB-000001-001-5',
    status: CopyStatus.Available,
    shelfLocation: 'A1',
    createdAt: new Date(),
    ...overrides,
  } as any;
}

function createLoanDocument(
  memberId: mongoose.Types.ObjectId,
  copyId: mongoose.Types.ObjectId,
  bookId: mongoose.Types.ObjectId,
  overrides: Record<string, unknown> = {},
) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    memberId,
    copyId,
    bookId,
    checkoutDate: new Date('2026-04-01T00:00:00.000Z'),
    dueDate: new Date('2026-04-15T00:00:00.000Z'),
    returnDate: null,
    status: LoanStatus.Active,
    renewCount: 0,
    policyLoanDays: 14,
    policyMaxRenewals: 1,
    policyRenewDays: 7,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  } as any;
}

describe('LoanService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('rejects checkout when member is blocked', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument({ isBlocked: true });
    const book = createBookDocument();
    const copy = createCopyDocument(book._id);
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    repository.findBookCopyByBarcode.mockResolvedValue(copy);
    repository.findMemberById.mockResolvedValue(member);

    const service = new LoanService(repository);

    await expect(
      service.checkout({ memberId: member.id, barcode: copy.barcode }),
    ).rejects.toMatchObject<Partial<BusinessRuleError>>({
      code: ERR.LOAN_MEMBER_BLOCKED,
      statusCode: 422,
    });
  });

  it('rejects renew when loan is overdue by due date', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument();
    const copy = createCopyDocument(book._id, { status: CopyStatus.Borrowed });
    const loan = createLoanDocument(member._id, copy._id, book._id, {
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-04-13T10:00:00.000Z'));
    repository.findLoanById.mockResolvedValue(loan);
    repository.findMemberById.mockResolvedValue(member);

    const service = new LoanService(repository);

    await expect(
      service.renewLoan(loan.id, { actorId: member.id, actorRole: Role.Student }),
    ).rejects.toMatchObject<Partial<BusinessRuleError>>({
      code: ERR.LOAN_RENEW_OVERDUE,
      statusCode: 422,
    });
  });

  it('rejects markLost when no book value is available', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument({ bookValue: undefined });
    const copy = createCopyDocument(book._id, { status: CopyStatus.Borrowed });
    const loan = createLoanDocument(member._id, copy._id, book._id);

    repository.findLoanById.mockResolvedValue(loan);
    repository.findMemberById.mockResolvedValue(member);
    repository.findBookById.mockResolvedValue(book);

    const service = new LoanService(repository);

    await expect(
      service.markLost(loan.id, {}, { actorId: 'actor-id', actorRole: Role.Librarian }),
    ).rejects.toMatchObject<Partial<BadRequestError>>({
      code: ERR.COMMON_BAD_REQUEST,
      statusCode: 400,
    });
  });

  it('creates overdue fines and reserves the next waiting copy on return', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument();
    const copy = createCopyDocument(book._id, { status: CopyStatus.Borrowed });
    const loan = createLoanDocument(member._id, copy._id, book._id, {
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
    });
    const reservationId = new mongoose.Types.ObjectId();
    const waitingReservation = {
      _id: reservationId,
      id: reservationId.toString(),
      status: ReservationStatus.Waiting,
    } as any;
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.useFakeTimers().setSystemTime(new Date('2026-04-13T10:00:00.000Z'));
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findLoanById.mockResolvedValue(loan);
    repository.findMemberById.mockResolvedValue(member);
    repository.markLoanReturned.mockResolvedValue({
      ...loan,
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-13T10:00:00.000Z'),
    } as any);
    repository.findFineRatesEffectiveOnOrBefore.mockResolvedValue([
      {
        ratePerDay: 5000,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as any);
    repository.createFineRecords.mockResolvedValue([] as any);
    repository.sumUnpaidFines.mockResolvedValue(15000);
    repository.findWaitingReservationByBookId.mockResolvedValue(waitingReservation);
    repository.notifyReservationById.mockResolvedValue({
      ...waitingReservation,
      status: ReservationStatus.Notified,
    } as any);
    repository.updateCopyStatusIfCurrent.mockResolvedValue({
      ...copy,
      status: CopyStatus.Reserved,
    } as any);

    const service = new LoanService(repository);
    jest.spyOn(service, 'getLoanDetail').mockResolvedValue({
      _id: loan.id,
      member: {
        _id: member.id,
        fullName: member.fullName,
        email: member.email,
        memberCardNo: member.memberCardNo,
        role: member.role,
        status: member.status,
        isBlocked: member.isBlocked,
      },
      book: {
        _id: book.id,
        isbn: book.isbn,
        title: book.title,
        bookValue: book.bookValue,
      },
      copy: {
        _id: copy.id,
        barcode: copy.barcode,
        status: CopyStatus.Reserved,
        shelfLocation: copy.shelfLocation,
      },
      checkoutDate: loan.checkoutDate,
      dueDate: loan.dueDate,
      returnDate: new Date('2026-04-13T10:00:00.000Z'),
      status: LoanStatus.Returned,
      renewCount: loan.renewCount,
      policyLoanDays: loan.policyLoanDays,
      policyMaxRenewals: loan.policyMaxRenewals,
      policyRenewDays: loan.policyRenewDays,
      notes: loan.notes,
      fineCount: 3,
      unpaidFineTotal: 15000,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      fines: [],
    });

    await service.returnByLoanId(loan.id, { actorId: 'actor-id', actorRole: Role.Librarian });

    expect(repository.createFineRecords).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ amount: 5000 }),
      ]),
      expect.anything(),
    );
    expect((repository.createFineRecords.mock.calls[0]?.[0] as unknown[])).toHaveLength(3);
    expect(repository.findFineRatesEffectiveOnOrBefore).toHaveBeenCalledTimes(1);
    expect(repository.notifyReservationById).toHaveBeenCalledTimes(1);
    expect(repository.updateCopyStatusIfCurrent).toHaveBeenCalledWith(
      loan.copyId,
      [CopyStatus.Borrowed],
      CopyStatus.Reserved,
      expect.anything(),
    );
  });

  it('applies the latest effective fine rate per overdue date after loading rates once', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument();
    const copy = createCopyDocument(book._id, { status: CopyStatus.Borrowed });
    const loan = createLoanDocument(member._id, copy._id, book._id, {
      dueDate: new Date('2026-04-10T00:00:00.000Z'),
    });
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.useFakeTimers().setSystemTime(new Date('2026-04-13T10:00:00.000Z'));
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findLoanById.mockResolvedValue(loan);
    repository.findMemberById.mockResolvedValue(member);
    repository.markLoanReturned.mockResolvedValue({
      ...loan,
      status: LoanStatus.Returned,
      returnDate: new Date('2026-04-13T10:00:00.000Z'),
    } as any);
    repository.findFineRatesEffectiveOnOrBefore.mockResolvedValue([
      {
        ratePerDay: 7000,
        effectiveFrom: new Date('2026-04-12T00:00:00.000Z'),
      },
      {
        ratePerDay: 5000,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as any);
    repository.createFineRecords.mockResolvedValue([] as any);
    repository.sumUnpaidFines.mockResolvedValue(19000);
    repository.findWaitingReservationByBookId.mockResolvedValue(null);
    repository.updateCopyStatusIfCurrent.mockResolvedValue({
      ...copy,
      status: CopyStatus.Available,
    } as any);

    const service = new LoanService(repository);
    jest.spyOn(service, 'getLoanDetail').mockResolvedValue({
      _id: loan.id,
      member: {
        _id: member.id,
        fullName: member.fullName,
        email: member.email,
        memberCardNo: member.memberCardNo,
        role: member.role,
        status: member.status,
        isBlocked: member.isBlocked,
      },
      book: {
        _id: book.id,
        isbn: book.isbn,
        title: book.title,
        bookValue: book.bookValue,
      },
      copy: {
        _id: copy.id,
        barcode: copy.barcode,
        status: CopyStatus.Available,
        shelfLocation: copy.shelfLocation,
      },
      checkoutDate: loan.checkoutDate,
      dueDate: loan.dueDate,
      returnDate: new Date('2026-04-13T10:00:00.000Z'),
      status: LoanStatus.Returned,
      renewCount: loan.renewCount,
      policyLoanDays: loan.policyLoanDays,
      policyMaxRenewals: loan.policyMaxRenewals,
      policyRenewDays: loan.policyRenewDays,
      notes: loan.notes,
      fineCount: 3,
      unpaidFineTotal: 19000,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      fines: [],
    });

    await service.returnByLoanId(loan.id, { actorId: 'actor-id', actorRole: Role.Librarian });

    expect(repository.findFineRatesEffectiveOnOrBefore).toHaveBeenCalledTimes(1);
    expect(repository.createFineRecords).toHaveBeenCalledWith(
      [
        expect.objectContaining({ amount: 5000, overdueDate: new Date('2026-04-11T00:00:00.000Z') }),
        expect.objectContaining({ amount: 7000, overdueDate: new Date('2026-04-12T00:00:00.000Z') }),
        expect.objectContaining({ amount: 7000, overdueDate: new Date('2026-04-13T00:00:00.000Z') }),
      ],
      expect.anything(),
    );
  });
});
