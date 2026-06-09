import { logger } from '../common/middleware/requestLogger';
import { addDays } from '../common/utils/dateHelpers';
import { closeDatabaseConnection, connectToDatabase } from '../config/database';
import { MemberModel, type MemberDocument } from '../models/Member.model';

const DEFAULT_MEMBERSHIP_DAYS = 365;

function resolveJoinDate(member: MemberDocument): Date {
  if (member.joinDate) {
    return member.joinDate;
  }

  if (member.createdAt) {
    return member.createdAt;
  }

  return member._id.getTimestamp();
}

async function backfillMemberDates(): Promise<void> {
  await connectToDatabase();

  const members = await MemberModel.find({
    $or: [
      { joinDate: { $exists: false } },
      { joinDate: null },
      { expiryDate: { $exists: false } },
      { expiryDate: null },
    ],
  }).exec();

  if (members.length === 0) {
    logger.info('No member date fields need backfill');
    return;
  }

  const operations = members.map((member) => {
    const joinDate = resolveJoinDate(member);
    const expiryDate = member.expiryDate ?? addDays(joinDate, DEFAULT_MEMBERSHIP_DAYS);

    return {
      updateOne: {
        filter: { _id: member._id },
        update: {
          $set: {
            joinDate,
            expiryDate,
          },
        },
      },
    };
  });

  const result = await MemberModel.bulkWrite(operations, { ordered: false });

  logger.info(
    {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    },
    'Backfilled member joinDate and expiryDate fields',
  );
}

void backfillMemberDates()
  .then(() => {
    logger.info('Member date backfill completed successfully');
  })
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Member date backfill failed');
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
    process.exit();
  });
