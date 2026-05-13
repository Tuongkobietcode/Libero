import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { authorize } from '../../common/middleware/authorize';
import { Role } from '../../common/types/enums';
import { reservationController } from './reservation.controller';

const reservationRouter = Router();

reservationRouter.use(authenticate);

reservationRouter.post('/', authorize(Role.Student, Role.Lecturer), (req, res, next) => {
  void reservationController.createReservation(req, res).catch(next);
});

reservationRouter.post('/for-member', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void reservationController.createReservationForMember(req, res).catch(next);
});

reservationRouter.get('/me', (req, res, next) => {
  void reservationController.getMyReservations(req, res).catch(next);
});

reservationRouter.get('/', authorize(Role.Librarian, Role.Admin), (req, res, next) => {
  void reservationController.getAllReservations(req, res).catch(next);
});

reservationRouter.delete('/:id', authorize(Role.Student, Role.Lecturer, Role.Librarian, Role.Admin), (req, res, next) => {
  void reservationController.cancelReservation(req, res).catch(next);
});

export { reservationRouter };
