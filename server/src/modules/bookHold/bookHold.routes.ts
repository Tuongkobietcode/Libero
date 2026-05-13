import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { bookHoldController } from './bookHold.controller';

const bookHoldRouter = Router();

bookHoldRouter.use(authenticate);

bookHoldRouter.post('/', authorize(Role.Student, Role.Lecturer), (req, res, next) => {
  void bookHoldController.createHold(req, res).catch(next);
});

bookHoldRouter.post('/for-member', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void bookHoldController.createHoldForMember(req, res).catch(next);
});

bookHoldRouter.get('/me', (req, res, next) => {
  void bookHoldController.getMyHolds(req, res).catch(next);
});

bookHoldRouter.get('/', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void bookHoldController.getAllHolds(req, res).catch(next);
});

bookHoldRouter.delete('/:id', authorize(Role.Student, Role.Lecturer, Role.Librarian, Role.Admin), (req, res, next) => {
  void bookHoldController.cancelHold(req, res).catch(next);
});

export { bookHoldRouter };
