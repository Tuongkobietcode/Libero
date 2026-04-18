import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { MemberStatus, Role } from '../../common/types/enums';
import { writeAuditLog } from '../../common/utils/auditLogger';
import { buildMemberCacheKey } from '../../common/utils/memberCache';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import { logger } from '../../common/middleware/requestLogger';
import { getRedisClient } from '../../config/redis';
import { notificationService } from '../notification/notification.service';
import type { MemberAuthDocument } from './auth.types';
import { memberRepository, type MemberRepository } from './member.repository';
import type {
  CreateManagedMemberDto,
  ListMembersQuery,
  LoanPolicyRole,
  LoanPolicyUpdateDto,
  LoanPolicyView,
  MemberView,
  RequestActor,
  SuspendMemberDto,
  UpdateManagedMemberDto,
} from './member.types';

const PASSWORD_BCRYPT_COST = 12;
const loanPolicyRoleOrder: LoanPolicyRole[] = [Role.Student, Role.Lecturer, Role.Librarian];

function toMemberView(member: MemberAuthDocument): MemberView {
  return {
    _id: member.id,
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    studentId: member.studentId,
    role: member.role,
    memberCardNo: member.memberCardNo,
    status: member.status,
    isBlocked: member.isBlocked,
    failedLoginCount: member.failedLoginCount,
    lockedUntil: member.lockedUntil,
    joinDate: member.joinDate,
    expiryDate: member.expiryDate,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

function toLoanPolicyView(policy: {
  role: LoanPolicyRole;
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
  effectiveFrom: Date;
}): LoanPolicyView {
  return {
    role: policy.role,
    maxBooks: policy.maxBooks,
    loanDays: policy.loanDays,
    maxRenewals: policy.maxRenewals,
    renewDays: policy.renewDays,
    effectiveFrom: policy.effectiveFrom,
  };
}

export class MemberService {
  constructor(private readonly repository: MemberRepository = memberRepository) {}

  async createMember(input: CreateManagedMemberDto, actor?: RequestActor): Promise<MemberView> {
    const normalizedEmail = input.email.toLowerCase();

    if (await this.repository.emailExists(normalizedEmail)) {
      throw new ConflictError(ERR.MEM_EMAIL_EXISTS, 409, 'Email already exists');
    }

    if (input.studentId && (await this.repository.studentIdExists(input.studentId))) {
      throw new ConflictError(ERR.MEM_STUDENT_ID_EXISTS, 409, 'Student ID already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, PASSWORD_BCRYPT_COST);
    const memberCardNo = await this.repository.getNextMemberCardNo();
    const member = await this.repository.createMember({
      fullName: input.fullName,
      email: normalizedEmail,
      passwordHash,
      phone: input.phone,
      studentId: input.studentId,
      role: input.role,
      memberCardNo,
      status: MemberStatus.Active,
      joinDate: input.joinDate,
      expiryDate: input.expiryDate,
      isBlocked: false,
      failedLoginCount: 0,
      lockedUntil: null,
    });

    const result = toMemberView(member);
    this.writeAudit(actor, 'CREATE_MEMBER', 'Member', member.id, undefined, result);

    return result;
  }

  async getMemberById(memberId: string): Promise<MemberView> {
    const member = await this.repository.findMemberById(memberId);

    if (!member) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    return toMemberView(member);
  }

  async getCurrentMember(memberId: string): Promise<MemberView> {
    return this.getMemberById(memberId);
  }

  async listMembers(query: ListMembersQuery) {
    const pagination = buildPagination(query);
    const filter: Record<string, unknown> = {};

    if (query.role) {
      filter.role = query.role;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.memberCardNo) {
      filter.memberCardNo = query.memberCardNo.trim();
    }

    if (query.q) {
      const escapedQuery = query.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { fullName: new RegExp(escapedQuery, 'i') },
        { email: new RegExp(escapedQuery, 'i') },
        { memberCardNo: new RegExp(escapedQuery, 'i') },
      ];
    }

    const { members, total } = await this.repository.listMembers({
      filter,
      page: pagination.page,
      limit: pagination.limit,
    });

    return buildPaginationResult(members.map((member) => toMemberView(member)), total, pagination);
  }

  async updateMember(memberId: string, input: UpdateManagedMemberDto, actor?: RequestActor): Promise<MemberView> {
    const currentMember = await this.repository.findMemberById(memberId);

    if (!currentMember) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    const normalizedEmail = input.email?.toLowerCase();

    if (
      normalizedEmail &&
      normalizedEmail !== currentMember.email &&
      (await this.repository.emailExists(normalizedEmail, currentMember.id))
    ) {
      throw new ConflictError(ERR.MEM_EMAIL_EXISTS, 409, 'Email already exists');
    }

    if (
      input.studentId &&
      input.studentId !== currentMember.studentId &&
      (await this.repository.studentIdExists(input.studentId, currentMember.id))
    ) {
      throw new ConflictError(ERR.MEM_STUDENT_ID_EXISTS, 409, 'Student ID already exists');
    }

    const updatedMember = await this.repository.findMemberByIdAndUpdate(memberId, {
      $set: {
        ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
        ...(normalizedEmail !== undefined ? { email: normalizedEmail } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.studentId !== undefined ? { studentId: input.studentId } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.joinDate !== undefined ? { joinDate: input.joinDate } : {}),
        ...(input.expiryDate !== undefined ? { expiryDate: input.expiryDate } : {}),
      },
    });

    if (!updatedMember) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    await this.invalidateMemberCache(memberId);

    const before = toMemberView(currentMember);
    const after = toMemberView(updatedMember);
    this.writeAudit(actor, 'UPDATE_MEMBER', 'Member', updatedMember.id, before, after);

    return after;
  }

  async suspendMember(memberId: string, input: SuspendMemberDto, actor?: RequestActor): Promise<MemberView> {
    const currentMember = await this.repository.findMemberById(memberId);

    if (!currentMember) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    if (currentMember.status === MemberStatus.Suspended) {
      throw new BusinessRuleError(ERR.MEM_ALREADY_SUSPENDED, 422, 'Member is already suspended');
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await this.repository.updateMemberById(
          currentMember.id,
          {
            $set: {
              status: MemberStatus.Suspended,
            },
          },
          session,
        );

        await this.repository.revokeAllRefreshTokensForMember(currentMember.id, new Date(), session);
      });
    } finally {
      await session.endSession();
    }

    const updatedMember = await this.repository.findMemberById(currentMember.id);

    if (!updatedMember) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    await this.invalidateMemberCache(currentMember.id);

    this.writeAudit(
      actor,
      'SUSPEND_MEMBER',
      'Member',
      updatedMember.id,
      {
        ...toMemberView(currentMember),
        reason: input.reason,
      },
      {
        ...toMemberView(updatedMember),
        reason: input.reason,
      },
    );

    await this.enqueueAccountBlockedNotification(
      updatedMember.id,
      input.reason ?? 'Your account was suspended by a librarian.',
    );

    return toMemberView(updatedMember);
  }

  async activateMember(memberId: string, actor?: RequestActor): Promise<MemberView> {
    const currentMember = await this.repository.findMemberById(memberId);

    if (!currentMember) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    if (currentMember.status === MemberStatus.Active) {
      throw new BusinessRuleError(ERR.MEM_ALREADY_ACTIVE, 422, 'Member is already active');
    }

    const updatedMember = await this.repository.findMemberByIdAndUpdate(memberId, {
      $set: {
        status: MemberStatus.Active,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    if (!updatedMember) {
      throw new NotFoundError(ERR.MEM_NOT_FOUND, 404, 'Member not found');
    }

    await this.invalidateMemberCache(memberId);

    this.writeAudit(
      actor,
      'ACTIVATE_MEMBER',
      'Member',
      updatedMember.id,
      toMemberView(currentMember),
      toMemberView(updatedMember),
    );

    await this.enqueueAccountActivatedNotification(updatedMember.id);

    return toMemberView(updatedMember);
  }

  async listLoanPolicies(): Promise<LoanPolicyView[]> {
    const policies = await this.repository.listLoanPolicies();

    return loanPolicyRoleOrder
      .map((role) => policies.find((policy) => policy.role === role))
      .filter(Boolean)
      .map((policy) => toLoanPolicyView(policy as Exclude<typeof policy, undefined>));
  }

  async updatePolicy(role: LoanPolicyRole, input: LoanPolicyUpdateDto, actor?: RequestActor): Promise<LoanPolicyView> {
    const currentPolicy = await this.repository.findLoanPolicyByRole(role);

    if (!currentPolicy) {
      throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Loan policy not found');
    }

    const updatedPolicy = await this.repository.updateLoanPolicyByRole(role, {
      $set: {
        maxBooks: input.maxBooks,
        loanDays: input.loanDays,
        maxRenewals: input.maxRenewals,
        renewDays: input.renewDays,
        effectiveFrom: input.effectiveFrom ?? new Date(),
      },
    });

    if (!updatedPolicy) {
      throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Loan policy not found');
    }

    const before = toLoanPolicyView(currentPolicy);
    const after = toLoanPolicyView(updatedPolicy);

    this.writeAudit(actor, 'UPDATE_LOAN_POLICY', 'LoanPolicy', updatedPolicy.id, before, after);

    return after;
  }

  private async invalidateMemberCache(memberId: string): Promise<void> {
    try {
      await getRedisClient().del(buildMemberCacheKey(memberId));
    } catch {
      return;
    }
  }

  private async enqueueAccountBlockedNotification(memberId: string, reason: string): Promise<void> {
    try {
      await notificationService.enqueueAccountBlocked(memberId, memberId, reason, 0);
    } catch (error) {
      logger.error({ err: error, memberId }, 'Failed to enqueue account blocked notification');
    }
  }

  private async enqueueAccountActivatedNotification(memberId: string): Promise<void> {
    try {
      await notificationService.enqueueAccountActivated(memberId, memberId);
    } catch (error) {
      logger.error({ err: error, memberId }, 'Failed to enqueue account activated notification');
    }
  }

  private writeAudit(
    actor: RequestActor | undefined,
    action: string,
    entity: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
  ): void {
    writeAuditLog({
      actorId: actor?.actorId ?? null,
      action,
      entity,
      entityId,
      before,
      after,
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });
  }
}

export const memberService = new MemberService();
