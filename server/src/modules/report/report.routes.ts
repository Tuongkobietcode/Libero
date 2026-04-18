import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { reportController } from './report.controller';

const reportRouter = Router();

reportRouter.use(authenticate);
reportRouter.use(authorize(Role.Librarian, Role.Admin));

reportRouter.get('/loans/summary', (req, res, next) => {
  void reportController.getLoanStats(req, res).catch(next);
});

reportRouter.get('/overdue', (req, res, next) => {
  void reportController.getOverdueList(req, res).catch(next);
});

reportRouter.get('/popular-books', (req, res, next) => {
  void reportController.getPopularBooks(req, res).catch(next);
});

reportRouter.get('/inventory', (req, res, next) => {
  void reportController.getInventoryStatus(req, res).catch(next);
});

reportRouter.get('/fines/summary', (req, res, next) => {
  void reportController.getFineSummary(req, res).catch(next);
});

reportRouter.get('/export', (req, res, next) => {
  void reportController.exportReport(req, res).catch(next);
});

export { reportRouter };
