import type { ClientSession, FilterQuery, UpdateQuery } from 'mongoose';

import { LoanPolicyModel, type LoanPolicyDocument } from '../../models/LoanPolicy.model';
import { MemberModel } from '../../models/Member.model';
import { RefreshTokenModel } from '../../models/RefreshToken.model';
import type { LoanPolicy } from '../../models/LoanPolicy.model';
import type {
  AuthRepository,
  CreateMemberInput,
  CreateRefreshTokenInput,
  MemberAuthDocument,
  RefreshTokenDocument,
} from './auth.types';
import type { LoanPolicyRole } from './member.types';

interface ListMembersParams {
  filter: FilterQuery<MemberAuthDocument>;
  page: number;
  limit: number;
}

export class MemberRepository implements AuthRepository {
  async findMemberByEmail(email: string): Promise<MemberAuthDocument | null> {
    return MemberModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findMemberById(memberId: string): Promise<MemberAuthDocument | null> {
    return MemberModel.findById(memberId).exec();
  }

  async emailExists(email: string, excludeMemberId?: string): Promise<boolean> {
    const filter: FilterQuery<MemberAuthDocument> = {
      email: email.toLowerCase(),
    };

    if (excludeMemberId) {
      filter._id = { $ne: excludeMemberId };
    }

    const existingMember = await MemberModel.exists(filter);
    return existingMember !== null;
  }

  async studentIdExists(studentId: string, excludeMemberId?: string): Promise<boolean> {
    const filter: FilterQuery<MemberAuthDocument> = { studentId };

    if (excludeMemberId) {
      filter._id = { $ne: excludeMemberId };
    }

    const existingMember = await MemberModel.exists(filter);
    return existingMember !== null;
  }

  async createMember(input: CreateMemberInput, session?: ClientSession): Promise<MemberAuthDocument> {
    const member = new MemberModel(input);
    await member.save({ session });
    return member;
  }

  async getNextMemberCardNo(date: Date = new Date()): Promise<string> {
    const year = date.getUTCFullYear();
    const prefix = `MEM-${year}-`;

    const latestMember = await MemberModel.findOne({
      memberCardNo: { $regex: `^${prefix}` },
    })
      .sort({ memberCardNo: -1 })
      .select({ memberCardNo: 1 })
      .exec();

    const lastSequence = latestMember?.memberCardNo.split('-').pop();
    const nextSequence = (lastSequence ? Number.parseInt(lastSequence, 10) : 0) + 1;

    return `${prefix}${nextSequence.toString().padStart(5, '0')}`;
  }

  async updateMemberById(memberId: string, update: UpdateQuery<MemberAuthDocument>, session?: ClientSession): Promise<void> {
    await MemberModel.updateOne({ _id: memberId }, update, { session }).exec();
  }

  async findMemberByIdAndUpdate(
    memberId: string,
    update: UpdateQuery<MemberAuthDocument>,
    session?: ClientSession,
  ): Promise<MemberAuthDocument | null> {
    return MemberModel.findByIdAndUpdate(memberId, update, {
      new: true,
      runValidators: true,
      session,
    }).exec();
  }

  async listMembers(params: ListMembersParams): Promise<{ members: MemberAuthDocument[]; total: number }> {
    const { filter, page, limit } = params;
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      MemberModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      MemberModel.countDocuments(filter).exec(),
    ]);

    return { members, total };
  }

  async listLoanPolicies(): Promise<LoanPolicyDocument[]> {
    return LoanPolicyModel.find().exec();
  }

  async findLoanPolicyByRole(role: LoanPolicyRole): Promise<LoanPolicyDocument | null> {
    return LoanPolicyModel.findOne({ role }).exec();
  }

  async updateLoanPolicyByRole(
    role: LoanPolicyRole,
    update: UpdateQuery<LoanPolicy>,
    session?: ClientSession,
  ): Promise<LoanPolicyDocument | null> {
    return LoanPolicyModel.findOneAndUpdate(
      { role },
      update,
      {
        new: true,
        runValidators: true,
        session,
      },
    ).exec();
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return RefreshTokenModel.findOne({ tokenHash }).exec();
  }

  async createRefreshToken(input: CreateRefreshTokenInput, session?: ClientSession): Promise<RefreshTokenDocument> {
    const refreshToken = new RefreshTokenModel(input);
    await refreshToken.save({ session });
    return refreshToken;
  }

  async revokeRefreshTokenById(refreshTokenId: string, revokedAt: Date, session?: ClientSession): Promise<void> {
    await RefreshTokenModel.updateOne({ _id: refreshTokenId }, { $set: { revokedAt } }, { session }).exec();
  }

  async revokeRefreshTokenFamily(memberId: string, familyId: string, revokedAt: Date): Promise<void> {
    await RefreshTokenModel.updateMany(
      { memberId, familyId, revokedAt: null },
      { $set: { revokedAt } },
    ).exec();
  }

  async revokeAllRefreshTokensForMember(memberId: string, revokedAt: Date, session?: ClientSession): Promise<void> {
    await RefreshTokenModel.updateMany(
      { memberId, revokedAt: null },
      { $set: { revokedAt } },
      { session },
    ).exec();
  }
}

export const memberRepository = new MemberRepository();
