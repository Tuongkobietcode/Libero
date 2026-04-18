import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { memberController } from './member.controller';

const memberRouter = Router();
const configRouter = Router();

memberRouter.use(authenticate);

memberRouter.get('/me', (req, res, next) => {
  void memberController.getMyProfile(req, res).catch(next);
});

memberRouter.get('/', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void memberController.listMembers(req, res).catch(next);
});

memberRouter.get('/:id', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void memberController.getMemberById(req, res).catch(next);
});

memberRouter.post('/', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void memberController.createMember(req, res).catch(next);
});

memberRouter.patch('/:id', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void memberController.updateMember(req, res).catch(next);
});

memberRouter.patch('/:id/suspend', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void memberController.suspendMember(req, res).catch(next);
});

memberRouter.patch('/:id/activate', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void memberController.activateMember(req, res).catch(next);
});

configRouter.use(authenticate);
configRouter.get('/loan-policies', authorize(Role.Admin), (req, res, next) => {
  void memberController.listLoanPolicies(req, res).catch(next);
});

configRouter.patch('/loan-policies/:role', authorize(Role.Admin), (req, res, next) => {
  void memberController.updateLoanPolicy(req, res).catch(next);
});

export { configRouter, memberRouter };
