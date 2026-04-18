import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { loanController } from './loan.controller';

const loanRouter = Router();

loanRouter.use(authenticate);

loanRouter.post('/checkout', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void loanController.checkout(req, res).catch(next);
});

loanRouter.post('/return-by-barcode', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void loanController.returnByBarcode(req, res).catch(next);
});

loanRouter.get('/me', (req, res, next) => {
  void loanController.getMyLoans(req, res).catch(next);
});

loanRouter.get('/', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void loanController.listLoans(req, res).catch(next);
});

loanRouter.get('/:id', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void loanController.getLoanDetail(req, res).catch(next);
});

loanRouter.post('/:id/return', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void loanController.returnByLoanId(req, res).catch(next);
});

loanRouter.post('/:id/renew', authorize(Role.Student, Role.Lecturer, Role.Librarian, Role.Admin), (req, res, next) => {
  void loanController.renewLoan(req, res).catch(next);
});

loanRouter.post('/:id/lost', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void loanController.markLost(req, res).catch(next);
});

export { loanRouter };
