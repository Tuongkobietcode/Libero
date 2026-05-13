import multer from 'multer';
import { Router } from 'express';

import { BadRequestError } from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { catalogController } from './catalog.controller';

const csvMimeTypes = new Set(['text/csv', 'application/vnd.ms-excel']);

function isCsvFile(file: Express.Multer.File): boolean {
  return csvMimeTypes.has(file.mimetype) || file.originalname.toLowerCase().endsWith('.csv');
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (isCsvFile(file)) {
      cb(null, true);
      return;
    }

    cb(new BadRequestError(ERR.COMMON_BAD_REQUEST, 400, 'Only CSV files are accepted'));
  },
});

const catalogRouter = Router();

catalogRouter.get('/', (req, res, next) => {
  void catalogController.searchBooks(req, res).catch(next);
});

catalogRouter.get('/facets', (req, res, next) => {
  void catalogController.getFacets(req, res).catch(next);
});

catalogRouter.get('/popular', (req, res, next) => {
  void catalogController.getPopular(req, res).catch(next);
});

catalogRouter.get('/categories', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.listCategories(req, res).catch(next);
});

catalogRouter.post('/categories', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.createCategory(req, res).catch(next);
});

catalogRouter.patch('/categories/:id', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.updateCategory(req, res).catch(next);
});

catalogRouter.delete('/categories/:id', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.deleteCategory(req, res).catch(next);
});

catalogRouter.get('/recommendations', authenticate, (req, res, next) => {
  void catalogController.getRecommendations(req, res).catch(next);
});

catalogRouter.get('/:id', (req, res, next) => {
  void catalogController.getBookById(req, res).catch(next);
});

catalogRouter.post('/', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.createBook(req, res).catch(next);
});

catalogRouter.patch('/:id', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.updateBook(req, res).catch(next);
});

catalogRouter.delete('/:id', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.softDeleteBook(req, res).catch(next);
});

catalogRouter.post('/:id/copies', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.addCopies(req, res).catch(next);
});

catalogRouter.patch('/copies/:copyId', authenticate, authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void catalogController.updateCopyStatus(req, res).catch(next);
});

catalogRouter.post(
  '/import',
  authenticate,
  authorize(Role.Librarian, Role.Admin),
  upload.single('file'),
  (req, res, next) => {
    void catalogController.importBooks(req, res).catch(next);
  },
);

export { catalogRouter };
