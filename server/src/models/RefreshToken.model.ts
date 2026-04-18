import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface RefreshToken {
  memberId: Types.ObjectId;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date | null;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
type RefreshTokenModelType = Model<RefreshToken>;

const refreshTokenSchema = new Schema<RefreshToken, RefreshTokenModelType>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    familyId: {
      type: String,
      required: true,
      trim: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'refreshTokens',
    versionKey: false,
  },
);

refreshTokenSchema.index({ memberId: 1, revokedAt: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = (models.RefreshToken as RefreshTokenModelType | undefined) ?? model<RefreshToken, RefreshTokenModelType>('RefreshToken', refreshTokenSchema);
