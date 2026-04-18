import type { Request, Response } from 'express';

import type { Role } from '../../common/types/enums';
import { loanService } from './loan.service';
import {
  checkoutLoanSchema,
  listLoansQuerySchema,
  loanHistoryQuerySchema,
  loanIdParamSchema,
  markLostSchema,
  returnByBarcodeSchema,
} from './loan.validator';

function buildActor(req: Request) {
  return {
    actorId: req.user?._id ?? null,
    actorRole: req.user?.role as Role | undefined,
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
  };
}

export class LoanController {
  async checkout(req: Request, res: Response): Promise<void> {
    const input = checkoutLoanSchema.parse(req.body);
    const result = await loanService.checkout(input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async returnByLoanId(req: Request, res: Response): Promise<void> {
    const loanId = loanIdParamSchema.parse(req.params.id);
    const result = await loanService.returnByLoanId(loanId, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async returnByBarcode(req: Request, res: Response): Promise<void> {
    const input = returnByBarcodeSchema.parse(req.body);
    const result = await loanService.returnByBarcode(input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async renewLoan(req: Request, res: Response): Promise<void> {
    const loanId = loanIdParamSchema.parse(req.params.id);
    const result = await loanService.renewLoan(loanId, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async markLost(req: Request, res: Response): Promise<void> {
    const loanId = loanIdParamSchema.parse(req.params.id);
    const input = markLostSchema.parse(req.body);
    const result = await loanService.markLost(loanId, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getMyLoans(req: Request, res: Response): Promise<void> {
    const query = loanHistoryQuerySchema.parse(req.query);
    const result = await loanService.getMyLoans(req.user?._id ?? '', query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async listLoans(req: Request, res: Response): Promise<void> {
    const query = listLoansQuerySchema.parse(req.query);
    const result = await loanService.listLoans(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getLoanDetail(req: Request, res: Response): Promise<void> {
    const loanId = loanIdParamSchema.parse(req.params.id);
    const result = await loanService.getLoanDetail(loanId);

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

export const loanController = new LoanController();
