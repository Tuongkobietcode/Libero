import { Router } from 'express';

import { authenticate } from '../../common/middleware/authenticate';
import { notificationController } from './notification.controller';

const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', (req, res, next) => {
  void notificationController.getMyNotifications(req, res).catch(next);
});

notificationRouter.patch('/read-all', (req, res, next) => {
  void notificationController.markAllNotificationsRead(req, res).catch(next);
});

notificationRouter.patch('/:id/read', (req, res, next) => {
  void notificationController.markNotificationRead(req, res).catch(next);
});

export { notificationRouter };
