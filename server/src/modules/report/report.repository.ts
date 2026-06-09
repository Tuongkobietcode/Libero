import { Types, type PipelineStage } from 'mongoose';

import { FineStatus, LoanStatus } from '../../common/types/enums';
import type { CopyStatus } from '../../common/types/enums';
import { BookCopyModel } from '../../models/BookCopy.model';
import { FineRecordModel } from '../../models/FineRecord.model';
import { LoanRecordModel } from '../../models/LoanRecord.model';
import type {
  FineSummaryQuery,
  InventoryReportQuery,
  LoanStatsItem,
  LoanSummaryQuery,
  MemberDebtItem,
  OverdueReportItem,
  PopularBookItem,
} from './report.types';

interface OverdueListAggregateResult {
  items: OverdueReportItem[];
  total: number;
}

interface FineStatsAggregateResult {
  summary: Array<{
    status: FineStatus;
    totalAmount: number;
    count: number;
  }>;
  trend: Array<{
    period: string;
    totalAmount: number;
    count: number;
  }>;
  memberDebts: MemberDebtItem[];
}

function buildDateMatch(field: string, from?: Date, to?: Date): Record<string, unknown> {
  const dateRange: Record<string, Date> = {};

  if (from) {
    dateRange.$gte = from;
  }

  if (to) {
    dateRange.$lte = to;
  }

  if (Object.keys(dateRange).length === 0) {
    return {};
  }

  return {
    [field]: dateRange,
  };
}

function buildLoanGroupExpression(field: string, groupBy: LoanSummaryQuery['groupBy']): Record<string, unknown> {
  switch (groupBy) {
    case 'week':
      return {
        $dateToString: {
          format: '%G-W%V',
          date: `$${field}`,
          timezone: 'UTC',
        },
      };
    case 'month':
      return {
        $dateToString: {
          format: '%Y-%m',
          date: `$${field}`,
          timezone: 'UTC',
        },
      };
    case 'day':
    default:
      return {
        $dateToString: {
          format: '%Y-%m-%d',
          date: `$${field}`,
          timezone: 'UTC',
        },
      };
  }
}

function buildOverdueSort(sort?: string): Record<string, 1 | -1> {
  switch (sort) {
    case 'overdueDays_asc':
      return { overdueDays: 1, dueDate: 1 };
    case 'dueDate_asc':
      return { dueDate: 1, overdueDays: -1 };
    case 'dueDate_desc':
      return { dueDate: -1, overdueDays: -1 };
    case 'overdueDays_desc':
    default:
      return { overdueDays: -1, dueDate: 1 };
  }
}

export class ReportRepository {
  async aggregateLoanStats(query: LoanSummaryQuery): Promise<LoanStatsItem[]> {
    const checkoutMatch = buildDateMatch('checkoutDate', query.from, query.to);
    const returnDateMatch = buildDateMatch('returnDate', query.from, query.to);
    const returnMatch = {
      ...returnDateMatch,
      status: LoanStatus.Returned,
      returnDate: {
        ...((returnDateMatch.returnDate as Record<string, Date> | undefined) ?? {}),
        $ne: null,
      },
    };

    const [checkoutStats, returnStats] = await Promise.all([
      LoanRecordModel.aggregate<LoanStatsItem>([
        {
          $match: checkoutMatch,
        },
        {
          $group: {
            _id: buildLoanGroupExpression('checkoutDate', query.groupBy),
            totalLoans: { $sum: 1 },
            activeLoans: {
              $sum: {
                $cond: [{ $eq: ['$status', LoanStatus.Active] }, 1, 0],
              },
            },
            overdueLoans: {
              $sum: {
                $cond: [{ $eq: ['$status', LoanStatus.Overdue] }, 1, 0],
              },
            },
            returnedLoans: { $sum: 0 },
            lostLoans: {
              $sum: {
                $cond: [{ $eq: ['$status', LoanStatus.Lost] }, 1, 0],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            period: '$_id',
            totalLoans: 1,
            activeLoans: 1,
            overdueLoans: 1,
            returnedLoans: 1,
            lostLoans: 1,
          },
        },
      ]).exec(),
      LoanRecordModel.aggregate<Array<{ period: string; returnedLoans: number }>[number]>([
      {
        $match: returnMatch,
      },
      {
        $group: {
          _id: buildLoanGroupExpression('returnDate', query.groupBy),
          returnedLoans: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          period: '$_id',
          returnedLoans: 1,
        },
      },
    ]).exec(),
    ]);

    const byPeriod = new Map<string, LoanStatsItem>();

    for (const item of checkoutStats) {
      byPeriod.set(item.period, item);
    }

    for (const item of returnStats) {
      const current = byPeriod.get(item.period) ?? {
        period: item.period,
        totalLoans: 0,
        activeLoans: 0,
        overdueLoans: 0,
        returnedLoans: 0,
        lostLoans: 0,
      };
      current.returnedLoans = item.returnedLoans;
      byPeriod.set(item.period, current);
    }

    return [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period));
  }

  async aggregateOverdueList(
    page: number,
    limit: number,
    sort?: string,
  ): Promise<OverdueListAggregateResult> {
    const skip = (page - 1) * limit;
    const now = new Date();
    const [result] = await LoanRecordModel.aggregate<{ items: OverdueReportItem[]; meta: Array<{ total: number }> }>([
      {
        $match: {
          status: LoanStatus.Overdue,
        },
      },
      {
        $lookup: {
          from: 'members',
          localField: 'memberId',
          foreignField: '_id',
          as: 'member',
        },
      },
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      {
        $unwind: '$member',
      },
      {
        $unwind: '$book',
      },
      {
        $addFields: {
          overdueDays: {
            $max: [
              1,
              {
                $add: [
                  {
                    $dateDiff: {
                      startDate: {
                        $dateTrunc: {
                          date: {
                            $dateAdd: {
                              startDate: '$dueDate',
                              unit: 'day',
                              amount: 1,
                            },
                          },
                          unit: 'day',
                          timezone: 'Asia/Ho_Chi_Minh',
                        },
                      },
                      endDate: {
                        $dateTrunc: {
                          date: now,
                          unit: 'day',
                          timezone: 'Asia/Ho_Chi_Minh',
                        },
                      },
                      unit: 'day',
                      timezone: 'Asia/Ho_Chi_Minh',
                    },
                  },
                  1,
                ],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          overdueDays: {
            $max: [
              1,
              {
                $toInt: '$overdueDays',
              },
            ],
          },
        },
      },
      {
        $facet: {
          items: [
            {
              $sort: buildOverdueSort(sort),
            },
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                _id: { $toString: '$_id' },
                member: {
                  _id: { $toString: '$member._id' },
                  fullName: '$member.fullName',
                  email: '$member.email',
                  memberCardNo: '$member.memberCardNo',
                  role: '$member.role',
                  status: '$member.status',
                  isBlocked: '$member.isBlocked',
                },
                book: {
                  _id: { $toString: '$book._id' },
                  isbn: '$book.isbn',
                  title: '$book.title',
                  bookValue: '$book.bookValue',
                  coverImage: '$book.coverImage',
                },
                checkoutDate: '$checkoutDate',
                dueDate: '$dueDate',
                status: '$status',
                renewCount: '$renewCount',
                overdueDays: '$overdueDays',
              },
            },
          ],
          meta: [
            {
              $count: 'total',
            },
          ],
        },
      },
    ]).exec();

    return {
      items: result?.items ?? [],
      total: result?.meta[0]?.total ?? 0,
    };
  }

  async aggregatePopularBooks(query: { from?: Date; to?: Date; limit: number }): Promise<PopularBookItem[]> {
    const match = buildDateMatch('checkoutDate', query.from, query.to);

    return LoanRecordModel.aggregate<PopularBookItem>([
      {
        $match: match,
      },
      {
        $group: {
          _id: '$bookId',
          checkoutCount: { $sum: 1 },
        },
      },
      {
        $sort: {
          checkoutCount: -1,
          _id: 1,
        },
      },
      {
        $limit: query.limit,
      },
      {
        $lookup: {
          from: 'books',
          localField: '_id',
          foreignField: '_id',
          as: 'book',
        },
      },
      {
        $unwind: '$book',
      },
      {
        $project: {
          _id: 0,
          checkoutCount: 1,
          book: {
            _id: { $toString: '$book._id' },
            isbn: '$book.isbn',
            title: '$book.title',
            bookValue: '$book.bookValue',
            coverImage: '$book.coverImage',
          },
        },
      },
    ]).exec();
  }

  async aggregateInventoryStatus(query: InventoryReportQuery): Promise<Array<{ book: PopularBookItem['book']; status: CopyStatus; totalCopies: number }>> {
    const pipeline: PipelineStage[] = [];
    const match: Record<string, unknown> = {};

    if (query.status) {
      match.status = query.status;
    }

    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }

    pipeline.push(
      {
        $lookup: {
          from: 'books',
          localField: 'bookId',
          foreignField: '_id',
          as: 'book',
        },
      },
      {
        $unwind: '$book',
      },
    );

    if (query.categoryId) {
      pipeline.push({
        $match: {
          'book.categoryIds': new Types.ObjectId(query.categoryId),
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: {
            bookId: '$bookId',
            status: '$status',
          },
          totalCopies: { $sum: 1 },
          book: { $first: '$book' },
        },
      },
      {
        $sort: {
          'book.title': 1,
          '_id.status': 1,
        },
      },
      {
        $project: {
          _id: 0,
          status: '$_id.status',
          totalCopies: 1,
          book: {
            _id: { $toString: '$book._id' },
            isbn: '$book.isbn',
            title: '$book.title',
            bookValue: '$book.bookValue',
            coverImage: '$book.coverImage',
          },
        },
      },
    );

    return BookCopyModel.aggregate<{ book: PopularBookItem['book']; status: CopyStatus; totalCopies: number }>(pipeline).exec();
  }

  async aggregateFineStats(query: FineSummaryQuery): Promise<FineStatsAggregateResult> {
    const match = buildDateMatch('overdueDate', query.from, query.to);
    const [result] = await FineRecordModel.aggregate<FineStatsAggregateResult>([
      {
        $match: match,
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: '$status',
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
            {
              $project: {
                _id: 0,
                status: '$_id',
                totalAmount: 1,
                count: 1,
              },
            },
          ],
          trend: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m',
                    date: '$overdueDate',
                    timezone: 'UTC',
                  },
                },
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
            {
              $project: {
                _id: 0,
                period: '$_id',
                totalAmount: 1,
                count: 1,
              },
            },
          ],
          memberDebts: [
            {
              $match: {
                status: FineStatus.Unpaid,
              },
            },
            {
              $group: {
                _id: '$memberId',
                unpaidTotal: { $sum: '$amount' },
                fineCount: { $sum: 1 },
              },
            },
            {
              $sort: {
                unpaidTotal: -1,
                fineCount: -1,
                _id: 1,
              },
            },
            {
              $limit: 20,
            },
            {
              $lookup: {
                from: 'members',
                localField: '_id',
                foreignField: '_id',
                as: 'member',
              },
            },
            {
              $unwind: '$member',
            },
            {
              $project: {
                _id: 0,
                unpaidTotal: 1,
                fineCount: 1,
                member: {
                  _id: { $toString: '$member._id' },
                  fullName: '$member.fullName',
                  email: '$member.email',
                  memberCardNo: '$member.memberCardNo',
                  role: '$member.role',
                  status: '$member.status',
                  isBlocked: '$member.isBlocked',
                },
              },
            },
          ],
        },
      },
    ]).exec();

    return {
      summary: result?.summary ?? [],
      trend: result?.trend ?? [],
      memberDebts: result?.memberDebts ?? [],
    };
  }
}

export const reportRepository = new ReportRepository();
