import type { Request, Response } from 'express';

import { BadRequestError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { catalogService } from './catalog.service';
import {
  addCopiesSchema,
  createBookSchema,
  objectIdParamSchema,
  searchBooksQuerySchema,
  updateBookSchema,
  updateCopyStatusSchema,
} from './catalog.validator';

function buildActor(req: Request) {
  return {
    actorId: req.user?._id ?? null,
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
  };
}

export class CatalogController {
  async searchBooks(req: Request, res: Response): Promise<void> {
    const query = searchBooksQuerySchema.parse(req.query);
    const result = await catalogService.searchBooks(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getBookById(req: Request, res: Response): Promise<void> {
    const bookId = objectIdParamSchema.parse(req.params.id);
    const result = await catalogService.getBookById(bookId);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async createBook(req: Request, res: Response): Promise<void> {
    const input = createBookSchema.parse(req.body);
    const result = await catalogService.createBook(input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async updateBook(req: Request, res: Response): Promise<void> {
    const bookId = objectIdParamSchema.parse(req.params.id);
    const input = updateBookSchema.parse(req.body);
    const result = await catalogService.updateBook(bookId, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async softDeleteBook(req: Request, res: Response): Promise<void> {
    const bookId = objectIdParamSchema.parse(req.params.id);
    const result = await catalogService.softDeleteBook(bookId, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async addCopies(req: Request, res: Response): Promise<void> {
    const bookId = objectIdParamSchema.parse(req.params.id);
    const input = addCopiesSchema.parse(req.body);
    const result = await catalogService.addCopies(bookId, input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async updateCopyStatus(req: Request, res: Response): Promise<void> {
    const copyId = objectIdParamSchema.parse(req.params.copyId);
    const input = updateCopyStatusSchema.parse(req.body);
    const result = await catalogService.updateCopyStatus(copyId, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async importBooks(req: Request, res: Response): Promise<void> {
    if (!req.file?.buffer) {
      throw new BadRequestError(ERR.COMMON_BAD_REQUEST, 400, 'CSV file is required');
    }

    const result = await catalogService.importCsv(req.file.buffer, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

export const catalogController = new CatalogController();
