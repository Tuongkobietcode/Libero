import type { Request, Response } from 'express';

import type { Role } from '../../common/types/enums';
import { reservationService } from './reservation.service';
import {
  createReservationSchema,
  listReservationsQuerySchema,
  myReservationsQuerySchema,
  reservationIdParamSchema,
} from './reservation.validator';

function buildActor(req: Request) {
  return {
    actorId: req.user?._id ?? null,
    actorRole: req.user?.role as Role | undefined,
    ipAddress: req.ip,
    userAgent: req.header('user-agent') ?? undefined,
  };
}

export class ReservationController {
  async createReservation(req: Request, res: Response): Promise<void> {
    const input = createReservationSchema.parse(req.body);
    const result = await reservationService.createReservation(req.user?._id ?? '', input, buildActor(req));

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  async cancelReservation(req: Request, res: Response): Promise<void> {
    const reservationId = reservationIdParamSchema.parse(req.params.id);
    const result = await reservationService.cancelReservation(reservationId, buildActor(req));

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getMyReservations(req: Request, res: Response): Promise<void> {
    const query = myReservationsQuerySchema.parse(req.query);
    const result = await reservationService.getMyReservations(req.user?._id ?? '', query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  async getAllReservations(req: Request, res: Response): Promise<void> {
    const query = listReservationsQuerySchema.parse(req.query);
    const result = await reservationService.getAllReservations(query);

    res.status(200).json({
      success: true,
      data: result,
    });
  }
}

export const reservationController = new ReservationController();
