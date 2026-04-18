import type { Request, Response } from 'express';

import { reportService } from './report.service';
import {
  exportReportQuerySchema,
  fineSummaryQuerySchema,
  inventoryReportQuerySchema,
  loanSummaryQuerySchema,
  overdueReportQuerySchema,
  popularBooksQuerySchema,
} from './report.validator';

export class ReportController {
  async getLoanStats(req: Request, res: Response): Promise<void> {
    const query = loanSummaryQuerySchema.parse(req.query);
    const result = await reportService.getLoanStats(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getOverdueList(req: Request, res: Response): Promise<void> {
    const query = overdueReportQuerySchema.parse(req.query);
    const result = await reportService.getOverdueList(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getPopularBooks(req: Request, res: Response): Promise<void> {
    const query = popularBooksQuerySchema.parse(req.query);
    const result = await reportService.getPopularBooks(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getInventoryStatus(req: Request, res: Response): Promise<void> {
    const query = inventoryReportQuerySchema.parse(req.query);
    const result = await reportService.getInventoryStatus(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getFineSummary(req: Request, res: Response): Promise<void> {
    const query = fineSummaryQuerySchema.parse(req.query);
    const result = await reportService.getFineStats(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async exportReport(req: Request, res: Response): Promise<void> {
    const query = exportReportQuerySchema.parse(req.query);
    const file = await reportService.exportReport(query);

    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    res.status(200).send(file.buffer);
  }
}

export const reportController = new ReportController();
