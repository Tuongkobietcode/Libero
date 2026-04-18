import type { CopyStatus, FineStatus, LoanStatus, MemberStatus, Role } from '../../common/types/enums';

export type ReportGroupBy = 'day' | 'week' | 'month';
export type OverdueSort = 'overdueDays_desc' | 'overdueDays_asc' | 'dueDate_desc' | 'dueDate_asc';
export type ExportReportType = 'loans' | 'overdue' | 'inventory' | 'fines';
export type ExportReportFormat = 'xlsx' | 'pdf';

export interface DateRangeQuery {
  from?: Date;
  to?: Date;
}

export interface LoanSummaryQuery extends DateRangeQuery {
  groupBy?: ReportGroupBy;
}

export interface OverdueReportQuery {
  page?: number;
  limit?: number;
  sort?: OverdueSort;
}

export interface PopularBooksQuery extends DateRangeQuery {
  limit?: number;
}

export interface InventoryReportQuery {
  categoryId?: string;
  status?: CopyStatus;
}

export interface FineSummaryQuery extends DateRangeQuery {}

export interface ExportReportQuery extends DateRangeQuery {
  type: ExportReportType;
  format: ExportReportFormat;
  groupBy?: ReportGroupBy;
  page?: number;
  limit?: number;
  sort?: OverdueSort;
  categoryId?: string;
  status?: CopyStatus;
}

export interface ReportBookRef {
  _id: string;
  isbn: string;
  title: string;
  bookValue?: number;
}

export interface ReportMemberRef {
  _id: string;
  fullName: string;
  email: string;
  memberCardNo: string;
  role: Role;
  status: MemberStatus;
  isBlocked: boolean;
}

export interface LoanStatsItem {
  period: string;
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  returnedLoans: number;
  lostLoans: number;
}

export interface OverdueReportItem {
  _id: string;
  member: ReportMemberRef;
  book: ReportBookRef;
  checkoutDate: Date;
  dueDate: Date;
  status: LoanStatus;
  renewCount: number;
  overdueDays: number;
}

export interface OverdueReportResult {
  items: OverdueReportItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface PopularBookItem {
  book: ReportBookRef;
  checkoutCount: number;
}

export interface InventoryStatusItem {
  book: ReportBookRef;
  status: CopyStatus;
  totalCopies: number;
}

export interface FineStatusSummaryItem {
  status: FineStatus;
  totalAmount: number;
  count: number;
}

export interface FineTrendItem {
  period: string;
  totalAmount: number;
  count: number;
}

export interface MemberDebtItem {
  member: ReportMemberRef;
  unpaidTotal: number;
  fineCount: number;
}

export interface FineSummaryReport {
  summary: FineStatusSummaryItem[];
  trend: FineTrendItem[];
  memberDebts: MemberDebtItem[];
}

export interface ReportExportFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}
