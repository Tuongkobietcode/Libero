import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { memberController } from './member.controller';

const memberRouter = Router();
const loanPolicyRouter = Router();

memberRouter.use(authenticate);

memberRouter.get('/me', (req, res, next) => {
  void memberController.getMyProfile(req, res).catch(next);
});

memberRouter.get('/me/stats', (req, res, next) => {
  void memberController.getMyStats(req, res).catch(next);
});

memberRouter.get('/me/activities', (req, res, next) => {
  void memberController.getMyActivities(req, res).catch(next);
});

memberRouter.patch('/me', (req, res, next) => {
  void memberController.updateMyProfile(req, res).catch(next);
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

loanPolicyRouter.use(authenticate);
loanPolicyRouter.get('/loan-policies', authorize(Role.Admin), (req, res, next) => {
  void memberController.listLoanPolicies(req, res).catch(next);
});

loanPolicyRouter.patch('/loan-policies/:role', authorize(Role.Admin), (req, res, next) => {
  void memberController.updateLoanPolicy(req, res).catch(next);
});

export { loanPolicyRouter, loanPolicyRouter as configRouter, memberRouter };
