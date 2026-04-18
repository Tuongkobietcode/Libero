import multer from 'multer';
import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { catalogController } from './catalog.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

const catalogRouter = Router();

catalogRouter.get('/', (req, res, next) => {
  void catalogController.searchBooks(req, res).catch(next);
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
