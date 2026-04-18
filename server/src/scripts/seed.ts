import bcrypt from 'bcryptjs';

import { logger } from '../common/middleware/requestLogger';
import { addDays } from '../common/utils/dateHelpers';
import { AuthorModel } from '../models/Author.model';
import { AuditLogModel } from '../models/AuditLog.model';
import { BookModel } from '../models/Book.model';
import { BookCopyModel } from '../models/BookCopy.model';
import { CategoryModel } from '../models/Category.model';
import { FineRateModel } from '../models/FineRate.model';
import { FineRecordModel } from '../models/FineRecord.model';
import { LoanPolicyModel } from '../models/LoanPolicy.model';
import { LoanRecordModel } from '../models/LoanRecord.model';
import { MemberModel } from '../models/Member.model';
import { NotificationLogModel } from '../models/NotificationLog.model';
import { RefreshTokenModel } from '../models/RefreshToken.model';
import { ReservationModel } from '../models/Reservation.model';
import { closeDatabaseConnection, connectToDatabase } from '../config/database';
import { MemberStatus, Role } from '../common/types/enums';

const EFFECTIVE_FROM = new Date('2026-01-01T00:00:00.000Z');
const DEFAULT_ADMIN_EMAIL = 'admin@library.edu';
const DEFAULT_ADMIN_PASSWORD = 'Admin123!';
const DEFAULT_ADMIN_CARD_NO = 'MEM-2026-00001';

const allModels = [
  CategoryModel,
  AuthorModel,
  BookModel,
  BookCopyModel,
  MemberModel,
  LoanPolicyModel,
  LoanRecordModel,
  ReservationModel,
  FineRecordModel,
  FineRateModel,
  RefreshTokenModel,
  AuditLogModel,
  NotificationLogModel,
] as const;

async function ensureIndexes(): Promise<void> {
  await Promise.all(allModels.map(async (mongooseModel) => mongooseModel.init()));
}

async function seedLoanPolicies(): Promise<void> {
  const policies = [
    {
      role: Role.Student,
      maxBooks: 3,
      loanDays: 14,
      maxRenewals: 1,
      renewDays: 7,
      effectiveFrom: EFFECTIVE_FROM,
    },
    {
      role: Role.Lecturer,
      maxBooks: 5,
      loanDays: 30,
      maxRenewals: 2,
      renewDays: 14,
      effectiveFrom: EFFECTIVE_FROM,
    },
    {
      role: Role.Librarian,
      maxBooks: 10,
      loanDays: 60,
      maxRenewals: 0,
      renewDays: 14,
      effectiveFrom: EFFECTIVE_FROM,
    },
  ] as const;

  await Promise.all(
    policies.map(async (policy) =>
      LoanPolicyModel.updateOne(
        { role: policy.role },
        {
          $set: {
            maxBooks: policy.maxBooks,
            loanDays: policy.loanDays,
            maxRenewals: policy.maxRenewals,
            renewDays: policy.renewDays,
            effectiveFrom: policy.effectiveFrom,
          },
        },
        { upsert: true },
      ),
    ),
  );
}

async function seedFineRate(): Promise<void> {
  await FineRateModel.updateOne(
    { appliesTo: 'all', effectiveFrom: EFFECTIVE_FROM },
    {
      $set: {
        ratePerDay: 5000,
      },
    },
    { upsert: true },
  );
}

async function seedAdminUser(): Promise<void> {
  const existingAdmin = await MemberModel.findOne({ email: DEFAULT_ADMIN_EMAIL }).exec();
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);
  const joinDate = EFFECTIVE_FROM;
  const expiryDate = addDays(joinDate, 365);

  if (!existingAdmin) {
    await MemberModel.create({
      fullName: 'System Administrator',
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      role: Role.Admin,
      memberCardNo: DEFAULT_ADMIN_CARD_NO,
      status: MemberStatus.Active,
      isBlocked: false,
      failedLoginCount: 0,
      joinDate,
      expiryDate,
    });

    return;
  }

  existingAdmin.fullName = existingAdmin.fullName || 'System Administrator';
  existingAdmin.passwordHash = passwordHash;
  existingAdmin.role = Role.Admin;
  existingAdmin.memberCardNo = existingAdmin.memberCardNo || DEFAULT_ADMIN_CARD_NO;
  existingAdmin.status = MemberStatus.Active;
  existingAdmin.isBlocked = false;
  existingAdmin.failedLoginCount = 0;
  existingAdmin.joinDate = existingAdmin.joinDate ?? joinDate;
  existingAdmin.expiryDate = existingAdmin.expiryDate ?? expiryDate;

  await existingAdmin.save();
}

async function runSeed(): Promise<void> {
  await connectToDatabase();
  await ensureIndexes();
  await seedLoanPolicies();
  await seedFineRate();
  await seedAdminUser();
}

void runSeed()
  .then(() => {
    logger.info('Seed completed successfully');
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
    process.exit();
  });
