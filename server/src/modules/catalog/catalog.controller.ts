import type { Request, Response } from 'express';

import { BadRequestError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { catalogService } from './catalog.service';
import {
  addCopiesSchema,
  createBookSchema,
  createCategorySchema,
  objectIdParamSchema,
  popularQuerySchema,
  recommendationsQuerySchema,
  searchBooksQuerySchema,
  updateBookSchema,
  updateCategorySchema,
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

  async getFacets(_req: Request, res: Response): Promise<void> {
    const result = await catalogService.getFacets();

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getPopular(req: Request, res: Response): Promise<void> {
    const params = popularQuerySchema.parse(req.query);
    const result = await catalogService.getPopularBooks(params);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async listCategories(_req: Request, res: Response): Promise<void> {
    const result = await catalogService.listCategories();

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    const input = createCategorySchema.parse(req.body);
    const result = await catalogService.createCategory(input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    const categoryId = objectIdParamSchema.parse(req.params.id);
    const input = updateCategorySchema.parse(req.body);
    const result = await catalogService.updateCategory(categoryId, input, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    const categoryId = objectIdParamSchema.parse(req.params.id);
    const result = await catalogService.deleteCategory(categoryId, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getRecommendations(req: Request, res: Response): Promise<void> {
    const params = recommendationsQuerySchema.parse(req.query);
    const memberId = req.user?._id;

    if (!memberId) {
      throw new BadRequestError(ERR.COMMON_BAD_REQUEST, 401, 'Authentication required');
    }

    const result = await catalogService.getRecommendations(memberId, params.limit);

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
