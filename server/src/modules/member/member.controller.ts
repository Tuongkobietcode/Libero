import type { Request, Response } from 'express';

import { memberService } from './member.service';
import {
  createMemberSchema,
  listMembersQuerySchema,
  loanPolicyRoleParamSchema,
  memberIdParamSchema,
  myActivitiesQuerySchema,
  suspendMemberSchema,
  updateLoanPolicySchema,
  updateMemberSchema,
} from './member.validator';

function buildActor(req: Request) {
  return {
    actorId: req.user?._id ?? null,
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
  };
}

export class MemberController {
  async listMembers(req: Request, res: Response): Promise<void> {
    const query = listMembersQuerySchema.parse(req.query);
    const result = await memberService.listMembers(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getMyProfile(req: Request, res: Response): Promise<void> {
    const result = await memberService.getCurrentMember(req.user?._id ?? '');

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getMyStats(req: Request, res: Response): Promise<void> {
    const result = await memberService.getMyStats(req.user?._id ?? '');

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getMyActivities(req: Request, res: Response): Promise<void> {
    const query = myActivitiesQuerySchema.parse(req.query);
    const result = await memberService.getMyActivities(req.user?._id ?? '', query.limit ?? 10);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getMemberById(req: Request, res: Response): Promise<void> {
    const memberId = memberIdParamSchema.parse(req.params.id);
    const result = await memberService.getMemberById(memberId);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async createMember(req: Request, res: Response): Promise<void> {
    const input = createMemberSchema.parse(req.body);
    const result = await memberService.createMember(input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async updateMember(req: Request, res: Response): Promise<void> {
    const memberId = memberIdParamSchema.parse(req.params.id);
    const input = updateMemberSchema.parse(req.body);
    const result = await memberService.updateMember(memberId, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async suspendMember(req: Request, res: Response): Promise<void> {
    const memberId = memberIdParamSchema.parse(req.params.id);
    const input = suspendMemberSchema.parse(req.body);
    const result = await memberService.suspendMember(memberId, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async activateMember(req: Request, res: Response): Promise<void> {
    const memberId = memberIdParamSchema.parse(req.params.id);
    const result = await memberService.activateMember(memberId, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async listLoanPolicies(_req: Request, res: Response): Promise<void> {
    const result = await memberService.listLoanPolicies();

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async updateLoanPolicy(req: Request, res: Response): Promise<void> {
    const role = loanPolicyRoleParamSchema.parse(req.params.role);
    const input = updateLoanPolicySchema.parse(req.body);
    const result = await memberService.updatePolicy(role, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

export const memberController = new MemberController();
