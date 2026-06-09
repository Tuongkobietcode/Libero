import { recalculateMemberBlock, type MemberBlockRepository } from '../../src/common/utils/memberBlock';

jest.mock('../../src/common/utils/memberCache', () => ({
  invalidateMemberCache: jest.fn().mockResolvedValue(undefined),
}));

function createRepositoryMock(overrides: Partial<jest.Mocked<MemberBlockRepository>> = {}): jest.Mocked<MemberBlockRepository> {
  return {
    findMemberById: jest.fn().mockResolvedValue({ isBlocked: false }),
    sumUnpaidFines: jest.fn().mockResolvedValue(0),
    findActiveOverdueLoanDueDates: jest.fn().mockResolvedValue([]),
    updateMemberBlockedStatus: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<MemberBlockRepository>;
}

describe('recalculateMemberBlock', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('blocks member card when active overdue loan count reaches threshold', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-07T10:00:00.000Z'));
    const repository = createRepositoryMock({
      findActiveOverdueLoanDueDates: jest.fn().mockResolvedValue([
        new Date('2026-06-03T00:00:00.000Z'),
        new Date('2026-06-04T00:00:00.000Z'),
        new Date('2026-06-05T00:00:00.000Z'),
      ]),
    });

    const result = await recalculateMemberBlock('member-id', repository);

    expect(result).toMatchObject({
      changed: true,
      wasBlocked: false,
      isBlocked: true,
      totalUnpaid: 0,
      overdueLoanCount: 3,
      reasons: ['overdue loan count threshold'],
    });
    expect(repository.updateMemberBlockedStatus).toHaveBeenCalledWith('member-id', true, undefined);
  });

  it('blocks member card when any active overdue loan is overdue for too many days', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-07T10:00:00.000Z'));
    const repository = createRepositoryMock({
      findActiveOverdueLoanDueDates: jest.fn().mockResolvedValue([
        new Date('2026-05-08T00:00:00.000Z'),
      ]),
    });

    const result = await recalculateMemberBlock('member-id', repository);

    expect(result).toMatchObject({
      changed: true,
      wasBlocked: false,
      isBlocked: true,
      totalUnpaid: 0,
      overdueLoanCount: 1,
      maxOverdueDays: 30,
      reasons: ['overdue days threshold'],
    });
    expect(repository.updateMemberBlockedStatus).toHaveBeenCalledWith('member-id', true, undefined);
  });
});
