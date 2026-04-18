import { Schema, model, models, type HydratedDocument, type Model } from 'mongoose';

import { Role } from '../common/types/enums';

export interface LoanPolicy {
  role: Role.Student | Role.Lecturer | Role.Librarian;
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
  effectiveFrom: Date;
}

export type LoanPolicyDocument = HydratedDocument<LoanPolicy>;
type LoanPolicyModelType = Model<LoanPolicy>;

const loanPolicyRoles = [Role.Student, Role.Lecturer, Role.Librarian] as const;

const loanPolicySchema = new Schema<LoanPolicy, LoanPolicyModelType>(
  {
    role: {
      type: String,
      enum: loanPolicyRoles,
      required: true,
      unique: true,
    },
    maxBooks: {
      type: Number,
      required: true,
      min: 0,
    },
    loanDays: {
      type: Number,
      required: true,
      min: 1,
    },
    maxRenewals: {
      type: Number,
      required: true,
      min: 0,
    },
    renewDays: {
      type: Number,
      required: true,
      min: 0,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'loanPolicies',
    versionKey: false,
  },
);

export const LoanPolicyModel = (models.LoanPolicy as LoanPolicyModelType | undefined) ?? model<LoanPolicy, LoanPolicyModelType>('LoanPolicy', loanPolicySchema);
