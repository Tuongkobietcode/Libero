import mongoose, { type ClientSession, type Types } from 'mongoose';

import { ERR } from '../../src/common/errors/errorCodes';
import { MemberStatus, Role } from '../../src/common/types/enums';
import { buildMemberCacheKey } from '../../src/common/utils/memberCache';
import { MemberModel, type MemberDocument } from '../../src/models/Member.model';
import { MemberRepository } from '../../src/modules/member/member.repository';
import { MemberService } from '../../src/modules/member/member.service';

const mockRedisDel = jest.fn<Promise<number>, [string]>();

jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    del: mockRedisDel,
  })),
}));

jest.mock('../../src/common/utils/auditLogger', () => ({
  writeAuditLog: jest.fn(),
}));

jest.mock('../../src/modules/notification/notification.service', () => ({
  notificationService: {
    enqueueAccountBlocked: jest.fn().mockResolvedValue({ skipped: false, logId: '1', jobId: '1' }),
    enqueueAccountActivated: jest.fn().mockResolvedValue({ skipped: false, logId: '2', jobId: '2' }),
  },
}));

interface MemberFixtureOverrides {
  _id?: Types.ObjectId;
  fullName?: string;
  email?: string;
  passwordHash?: string;
  role?: Role;
  memberCardNo?: string;
  status?: MemberStatus;
  isBlocked?: boolean;
  failedLoginCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

function createMemberDocument(overrides: MemberFixtureOverrides = {}): MemberDocument {
  return new MemberModel({
    fullName: 'Reader User',
    email: 'reader@example.com',
    passwordHash: 'hashed',
    role: Role.Student,
    memberCardNo: 'MEM-2026-00010',
    status: MemberStatus.Active,
    isBlocked: false,
    failedLoginCount: 0,
    createdAt: new Date('2026-04-01T00:00:00.000Z'),
    updatedAt: new Date('2026-04-01T00:00:00.000Z'),
    ...overrides,
  });
}

describe('MemberService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockRedisDel.mockReset();
  });

  it('deletes cached member state after suspending a member', async () => {
    const repository = new MemberRepository();
    const service = new MemberService(repository);
    const currentMember = createMemberDocument();
    const updatedMember = createMemberDocument({
      _id: currentMember._id,
      status: MemberStatus.Suspended,
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
    });
    const fakeSession = Object.assign(Object.create(null) as ClientSession, {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(async () => undefined),
    });

    mockRedisDel.mockResolvedValue(1);
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession);
    jest.spyOn(repository, 'findMemberById')
      .mockResolvedValueOnce(currentMember)
      .mockResolvedValueOnce(updatedMember);
    jest.spyOn(repository, 'updateMemberById').mockResolvedValue();
    jest.spyOn(repository, 'revokeAllRefreshTokensForMember').mockResolvedValue();

    const result = await service.suspendMember(currentMember.id, { reason: 'Policy violation' });

    expect(result.status).toBe(MemberStatus.Suspended);
    expect(mockRedisDel).toHaveBeenCalledWith(buildMemberCacheKey(currentMember.id));
  });

  it('keeps the existing error when suspending a missing member', async () => {
    const repository = new MemberRepository();
    const service = new MemberService(repository);

    jest.spyOn(repository, 'findMemberById').mockResolvedValue(null);

    await expect(service.suspendMember('507f1f77bcf86cd799439011', {})).rejects.toMatchObject({
      code: ERR.MEM_NOT_FOUND,
      statusCode: 404,
    });
    expect(mockRedisDel).not.toHaveBeenCalled();
  });
});
