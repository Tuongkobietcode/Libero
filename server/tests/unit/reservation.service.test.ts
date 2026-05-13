import mongoose from 'mongoose';

import { BusinessRuleError } from '../../src/common/errors/AppError';
import { ERR } from '../../src/common/errors/errorCodes';
import {
  CopyStatus,
  MemberStatus,
  ReservationStatus,
  Role,
} from '../../src/common/types/enums';
import { ReservationService } from '../../src/modules/reservation/reservation.service';
import type { ReservationRepository } from '../../src/modules/reservation/reservation.repository';

jest.mock('../../src/common/utils/auditLogger', () => ({
  writeAuditLog: jest.fn(),
}));

function createRepositoryMock(): jest.Mocked<ReservationRepository> {
  return {
    findMemberById: jest.fn(),
    findBookById: jest.fn(),
    countCopiesByBookId: jest.fn(),
    countAvailableCopiesByBookId: jest.fn(),
    findActiveReservationForMemberBook: jest.fn(),
    findActiveBookHoldForMemberBook: jest.fn(),
    findLastWaitingReservationByBookId: jest.fn(),
    createReservation: jest.fn(),
    findReservationById: jest.fn(),
    cancelActiveReservationById: jest.fn(),
    expireNotifiedReservationById: jest.fn(),
    decrementWaitingQueuePositions: jest.fn(),
    findNextWaitingReservationByBookId: jest.fn(),
    notifyReservationById: jest.fn(),
    findBookCopyById: jest.fn(),
    findReservedCopyByBookId: jest.fn(),
    updateCopyStatusIfCurrent: jest.fn(),
    listReservations: jest.fn(),
    findMembersByIds: jest.fn(),
    findBooksByIds: jest.fn(),
    findCopiesByIds: jest.fn(),
  } as unknown as jest.Mocked<ReservationRepository>;
}

function createMemberDocument(overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    fullName: 'Reader User',
    email: 'reader@example.com',
    memberCardNo: 'MEM-2026-00011',
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
    title: 'Reservation Testing',
    authorIds: [],
    categoryIds: [],
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
    barcode: 'LIB-RES-001',
    status: CopyStatus.Reserved,
    shelfLocation: 'A1',
    createdAt: new Date(),
    ...overrides,
  } as any;
}

function createReservationDocument(
  memberId: mongoose.Types.ObjectId,
  bookId: mongoose.Types.ObjectId,
  overrides: Record<string, unknown> = {},
) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    memberId,
    bookId,
    copyId: null,
    queuePosition: 1,
    status: ReservationStatus.Waiting,
    requestDate: new Date('2026-04-15T00:00:00.000Z'),
    notifiedAt: null,
    holdExpiryAt: null,
    createdAt: new Date('2026-04-15T00:00:00.000Z'),
    updatedAt: new Date('2026-04-15T00:00:00.000Z'),
    ...overrides,
  } as any;
}

describe('ReservationService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('rejects createReservation when member is blocked', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument({ isBlocked: true });
    const book = createBookDocument();
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    repository.findMemberById.mockResolvedValue(member);
    repository.findBookById.mockResolvedValue(book);

    const service = new ReservationService(repository);

    await expect(service.createReservation(member.id, { bookId: book.id })).rejects.toMatchObject<Partial<BusinessRuleError>>({
      code: ERR.RES_MEMBER_BLOCKED,
      statusCode: 422,
    });
  });

  it('rejects createReservation when a copy is still available', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument();
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    repository.findMemberById.mockResolvedValue(member);
    repository.findBookById.mockResolvedValue(book);
    repository.countCopiesByBookId.mockResolvedValue(1);
    repository.countAvailableCopiesByBookId.mockResolvedValue(1);
    repository.findActiveReservationForMemberBook.mockResolvedValue(null);

    const service = new ReservationService(repository);

    await expect(service.createReservation(member.id, { bookId: book.id })).rejects.toMatchObject<Partial<BusinessRuleError>>({
      code: ERR.RES_COPY_AVAILABLE,
      statusCode: 422,
    });
  });

  it('releases the copy when notifyNext has no waiting reservation', async () => {
    const repository = createRepositoryMock();
    const book = createBookDocument();
    const copy = createCopyDocument(book._id, { status: CopyStatus.Reserved });
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);
    repository.findNextWaitingReservationByBookId.mockResolvedValue(null);
    repository.updateCopyStatusIfCurrent.mockResolvedValue({
      ...copy,
      status: CopyStatus.Available,
    } as any);

    const service = new ReservationService(repository);
    const result = await service.notifyNext(book.id, copy.id);

    expect(result).toBeNull();
    expect(repository.updateCopyStatusIfCurrent).toHaveBeenCalledWith(
      copy.id,
      [CopyStatus.Available, CopyStatus.Reserved, CopyStatus.Borrowed],
      CopyStatus.Available,
      expect.anything(),
    );
  });

  it('rejects expireHold when holdExpiryAt is still in the future', async () => {
    const repository = createRepositoryMock();
    const member = createMemberDocument();
    const book = createBookDocument();
    const reservation = createReservationDocument(member._id, book._id, {
      status: ReservationStatus.Notified,
      holdExpiryAt: new Date('2026-04-20T00:00:00.000Z'),
    });

    jest.useFakeTimers().setSystemTime(new Date('2026-04-19T00:00:00.000Z'));
    repository.findReservationById.mockResolvedValue(reservation);

    const service = new ReservationService(repository);

    await expect(service.expireHold(reservation.id)).rejects.toMatchObject<Partial<BusinessRuleError>>({
      code: ERR.COMMON_BAD_REQUEST,
      statusCode: 422,
    });
  });
});
