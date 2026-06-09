import { z } from 'zod';

import { MemberStatus, Role } from '../../common/types/enums';

const objectIdPattern = /^[a-f0-9]{24}$/i;
const borrowerRoles = [Role.Student, Role.Lecturer, Role.Librarian] as const;

function trimToUndefined(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

const optionalTrimmedString = z
  .string()
  .transform((value) => trimToUndefined(value))
  .optional();

const editableProfileString = z
  .string()
  .transform((value) => value.trim())
  .optional();

const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[0-9]/, 'Must contain number');

export const memberIdParamSchema = z.string().regex(objectIdPattern, 'Invalid member id');

export const listMembersQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.nativeEnum(MemberStatus).optional(),
  cardStatus: z.enum(['active', 'blocked']).optional(),
  memberCardNo: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createMemberSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  email: z.string().email(),
  password: passwordSchema,
  phone: optionalTrimmedString,
  studentId: optionalTrimmedString,
  role: z.nativeEnum(Role),
  joinDate: z.coerce.date().optional(),
  expiryDate: z.coerce.date().optional(),
  faculty: optionalTrimmedString,
  className: optionalTrimmedString,
  membershipTier: optionalTrimmedString,
});

export const updateMemberSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200).optional(),
    email: z.string().email().optional(),
    phone: optionalTrimmedString,
    studentId: optionalTrimmedString,
    role: z.nativeEnum(Role).optional(),
    joinDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    faculty: optionalTrimmedString,
    className: optionalTrimmedString,
    membershipTier: optionalTrimmedString,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), 'At least one field must be provided');

export const updateMyProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200).optional(),
    email: z.string().email().optional(),
    phone: editableProfileString,
    studentId: editableProfileString,
    faculty: editableProfileString,
    className: editableProfileString,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), 'At least one field must be provided');

export const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const myActivitiesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const suspendMemberSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});

export const loanPolicyRoleParamSchema = z.enum(borrowerRoles);

export const updateLoanPolicySchema = z.object({
  maxBooks: z.coerce.number().int().min(0),
  loanDays: z.coerce.number().int().min(1),
  maxRenewals: z.coerce.number().int().min(0),
  renewDays: z.coerce.number().int().min(0),
  effectiveFrom: z.coerce.date().optional(),
});
