import type { Types } from 'mongoose';

import { logger } from '../middleware/requestLogger';
import { AuditLogModel } from '../../models/AuditLog.model';

export interface WriteAuditLogParams {
  actorId?: Types.ObjectId | string | null;
  action: string;
  entity: string;
  entityId: Types.ObjectId | string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

export function writeAuditLog(params: WriteAuditLogParams): void {
  void AuditLogModel.create(params).catch((error: unknown) => {
    logger.error({ err: error, entity: params.entity, entityId: params.entityId }, 'Audit write failed');
  });
}
