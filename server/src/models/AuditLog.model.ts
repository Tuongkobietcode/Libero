import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface AuditLog {
  actorId?: Types.ObjectId | null;
  action: string;
  entity: string;
  entityId: Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
type AuditLogModelType = Model<AuditLog>;

const auditLogSchema = new Schema<AuditLog, AuditLogModelType>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entity: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    before: {
      type: Schema.Types.Mixed,
    },
    after: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'auditLogs',
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

auditLogSchema.index({ entity: 1, entityId: 1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = (models.AuditLog as AuditLogModelType | undefined) ?? model<AuditLog, AuditLogModelType>('AuditLog', auditLogSchema);
