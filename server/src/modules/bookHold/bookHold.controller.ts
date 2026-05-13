import type { Request, Response } from 'express';

import type { Role } from '../../common/types/enums';
import { bookHoldService } from './bookHold.service';
import {
  bookHoldIdParamSchema,
  createBookHoldForMemberSchema,
  createBookHoldSchema,
  listBookHoldsQuerySchema,
} from './bookHold.validator';

function buildActor(req: Request) {
  return {
    actorId: req.user?._id ?? null,
    actorRole: req.user?.role as Role | undefined,
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
  };
}

export class BookHoldController {
  async createHold(req: Request, res: Response): Promise<void> {
    const input = createBookHoldSchema.parse(req.body);
    const result = await bookHoldService.createHold(req.user?._id ?? '', input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async createHoldForMember(req: Request, res: Response): Promise<void> {
    const input = createBookHoldForMemberSchema.parse(req.body);
    const result = await bookHoldService.createHold(input.memberId, { bookId: input.bookId }, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async getMyHolds(req: Request, res: Response): Promise<void> {
    const query = listBookHoldsQuerySchema.parse(req.query);
    const result = await bookHoldService.listMyHolds(req.user?._id ?? '', query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getAllHolds(req: Request, res: Response): Promise<void> {
    const query = listBookHoldsQuerySchema.parse(req.query);
    const result = await bookHoldService.listHolds(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async cancelHold(req: Request, res: Response): Promise<void> {
    const holdId = bookHoldIdParamSchema.parse(req.params.id);
    const result = await bookHoldService.cancelHold(holdId, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

export const bookHoldController = new BookHoldController();
