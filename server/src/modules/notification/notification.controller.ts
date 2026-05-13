import type { Request, Response } from 'express';

import { notificationService } from './notification.service';
import { listNotificationsQuerySchema, notificationIdParamSchema } from './notification.validator';

export class NotificationController {
  async getMyNotifications(req: Request, res: Response): Promise<void> {
    const query = listNotificationsQuerySchema.parse(req.query);
    const result = await notificationService.listMyNotifications(req.user?._id ?? '', query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async markNotificationRead(req: Request, res: Response): Promise<void> {
    const notificationId = notificationIdParamSchema.parse(req.params.id);
    const result = await notificationService.markNotificationRead(req.user?._id ?? '', notificationId);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async markAllNotificationsRead(req: Request, res: Response): Promise<void> {
    const result = await notificationService.markAllNotificationsRead(req.user?._id ?? '');

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

export const notificationController = new NotificationController();
