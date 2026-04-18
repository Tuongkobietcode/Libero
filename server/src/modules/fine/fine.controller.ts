import type { Request, Response } from 'express';

import type { Role } from '../../common/types/enums';
import { fineService } from './fine.service';
import {
  createFineRateSchema,
  fineIdParamSchema,
  fineListQuerySchema,
  myFineListQuerySchema,
  payFinesSchema,
  waiveFineSchema,
} from './fine.validator';

function buildActor(req: Request) {
  return {
    actorId: req.user?._id ?? null,
    actorRole: req.user?.role as Role | undefined,
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
  };
}

export class FineController {
  async getMyFines(req: Request, res: Response): Promise<void> {
    const query = myFineListQuerySchema.parse(req.query);
    const result = await fineService.getMyFines(req.user?._id ?? '', query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getAllFines(req: Request, res: Response): Promise<void> {
    const query = fineListQuerySchema.parse(req.query);
    const result = await fineService.getAllFines(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async payFines(req: Request, res: Response): Promise<void> {
    const input = payFinesSchema.parse(req.body);
    const result = await fineService.payFines(input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async waiveFine(req: Request, res: Response): Promise<void> {
    const fineId = fineIdParamSchema.parse(req.params.id);
    const input = waiveFineSchema.parse(req.body);
    const result = await fineService.waiveFine(fineId, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async listFineRates(_req: Request, res: Response): Promise<void> {
    const result = await fineService.listFineRates();

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async createFineRate(req: Request, res: Response): Promise<void> {
    const input = createFineRateSchema.parse(req.body);
    const result = await fineService.createFineRate(input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }
}

export const fineController = new FineController();
