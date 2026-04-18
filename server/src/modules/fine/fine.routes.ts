import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { fineController } from './fine.controller';

const fineRouter = Router();
const fineConfigRouter = Router();

fineRouter.use(authenticate);

fineRouter.get('/me', (req, res, next) => {
  void fineController.getMyFines(req, res).catch(next);
});

fineRouter.get('/', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void fineController.getAllFines(req, res).catch(next);
});

fineRouter.post('/pay', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void fineController.payFines(req, res).catch(next);
});

fineRouter.post('/:id/waive', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void fineController.waiveFine(req, res).catch(next);
});

fineConfigRouter.use(authenticate);

fineConfigRouter.get('/fine-rates', authorize(Role.Admin), (req, res, next) => {
  void fineController.listFineRates(req, res).catch(next);
});

fineConfigRouter.post('/fine-rates', authorize(Role.Admin), (req, res, next) => {
  void fineController.createFineRate(req, res).catch(next);
});

export { fineConfigRouter, fineRouter };
