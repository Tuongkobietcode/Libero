import bcrypt from 'bcryptjs';
import { Schema, model, models, type HydratedDocument, type Model } from 'mongoose';

import { MemberStatus, Role } from '../common/types/enums';

export interface Member {
  fullName: string;
  email: string;
  passwordHash: string;
  phone?: string;
  studentId?: string;
  role: Role;
  memberCardNo: string;
  status: MemberStatus;
  isBlocked: boolean;
  failedLoginCount: number;
  lockedUntil?: Date | null;
  joinDate?: Date;
  expiryDate?: Date;
  faculty?: string;
  className?: string;
  campus?: string;
  libraryBranch?: string;
  membershipTier?: string;
  lastLoginAt?: Date | null;
  passwordUpdatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberMethods {
  comparePassword(plainPassword: string): Promise<boolean>;
  isLocked(): boolean;
}

export type MemberDocument = HydratedDocument<Member, MemberMethods>;
type MemberModelType = Model<Member, Record<string, never>, MemberMethods>;

const memberSchema = new Schema<Member, MemberModelType, MemberMethods>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    studentId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: Object.values(Role),
      required: true,
    },
    memberCardNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(MemberStatus),
      default: MemberStatus.Active,
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    failedLoginCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    joinDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    faculty: {
      type: String,
      trim: true,
    },
    className: {
      type: String,
      trim: true,
    },
    campus: {
      type: String,
      trim: true,
    },
    libraryBranch: {
      type: String,
      trim: true,
    },
    membershipTier: {
      type: String,
      trim: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    passwordUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'members',
    timestamps: true,
    versionKey: false,
  },
);

memberSchema.index({ role: 1, status: 1 });

memberSchema.method('comparePassword', async function comparePassword(plainPassword: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, this.passwordHash);
});

memberSchema.method('isLocked', function isLocked(): boolean {
  return this.lockedUntil instanceof Date && this.lockedUntil.getTime() > Date.now();
});

export const MemberModel = (models.Member as MemberModelType | undefined) ?? model<Member, MemberModelType>('Member', memberSchema);
