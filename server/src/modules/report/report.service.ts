import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import { reportRepository, type ReportRepository } from './report.repository';
import type {
  ExportReportQuery,
  FineSummaryQuery,
  FineSummaryReport,
  InventoryReportQuery,
  InventoryStatusItem,
  LoanStatsItem,
  LoanSummaryQuery,
  OverdueReportQuery,
  OverdueReportResult,
  PopularBookItem,
  PopularBooksQuery,
  ReportExportFile,
} from './report.types';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PDF_CONTENT_TYPE = 'application/pdf';

function isoDate(value: Date | undefined): string {
  return value ? value.toISOString().slice(0, 10) : 'all';
}

function toBuffer(data: Buffer | ArrayBuffer): Buffer {
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}

function formatCurrency(amount: number): string {
  return `${amount}`;
}

export class ReportService {
  constructor(private readonly repository: ReportRepository = reportRepository) {}

  async getLoanStats(query: LoanSummaryQuery): Promise<LoanStatsItem[]> {
    return this.repository.aggregateLoanStats({
      from: query.from,
      to: query.to,
      groupBy: query.groupBy ?? 'day',
    });
  }

  async getOverdueList(query: OverdueReportQuery): Promise<OverdueReportResult> {
    const pagination = buildPagination(query);
    const { items, total } = await this.repository.aggregateOverdueList(
      pagination.page,
      pagination.limit,
      query.sort,
    );
    const result = buildPaginationResult(items, total, pagination);

    return {
      items: result.items,
      pagination: result.pagination,
    };
  }

  async getPopularBooks(query: PopularBooksQuery): Promise<PopularBookItem[]> {
    return this.repository.aggregatePopularBooks({
      from: query.from,
      to: query.to,
      limit: query.limit ?? 10,
    });
  }

  async getInventoryStatus(query: InventoryReportQuery): Promise<InventoryStatusItem[]> {
    return this.repository.aggregateInventoryStatus(query);
  }

  async getFineStats(query: FineSummaryQuery): Promise<FineSummaryReport> {
    return this.repository.aggregateFineStats(query);
  }

  async exportReport(query: ExportReportQuery): Promise<ReportExportFile> {
    switch (query.type) {
      case 'loans':
        return this.exportLoansReport(query);
      case 'overdue':
        return this.exportOverdueReport(query);
      case 'inventory':
        return this.exportInventoryReport(query);
      case 'fines':
      default:
        return this.exportFinesReport(query);
    }
  }

  private async exportLoansReport(query: ExportReportQuery): Promise<ReportExportFile> {
    const items = await this.getLoanStats({
      from: query.from,
      to: query.to,
      groupBy: query.groupBy ?? 'day',
    });
    const baseName = `loan-summary-${isoDate(query.from)}-${isoDate(query.to)}`;

    if (query.format === 'pdf') {
      return {
        buffer: await this.buildPdfBuffer(
          'Loan Summary Report',
          items.map(
            (item) =>
              `${item.period} | total=${item.totalLoans} active=${item.activeLoans} overdue=${item.overdueLoans} returned=${item.returnedLoans} lost=${item.lostLoans}`,
          ),
        ),
        contentType: PDF_CONTENT_TYPE,
        fileName: `${baseName}.pdf`,
      };
    }

    return {
      buffer: await this.buildWorkbookBuffer(
        'Loan Summary',
        [
          { header: 'Period', key: 'period' },
          { header: 'Total Loans', key: 'totalLoans' },
          { header: 'Active Loans', key: 'activeLoans' },
          { header: 'Overdue Loans', key: 'overdueLoans' },
          { header: 'Returned Loans', key: 'returnedLoans' },
          { header: 'Lost Loans', key: 'lostLoans' },
        ],
        items,
      ),
      contentType: XLSX_CONTENT_TYPE,
      fileName: `${baseName}.xlsx`,
    };
  }

  private async exportOverdueReport(query: ExportReportQuery): Promise<ReportExportFile> {
    const result = await this.getOverdueList({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
    });
    const baseName = `overdue-report-${Date.now()}`;

    if (query.format === 'pdf') {
      return {
        buffer: await this.buildPdfBuffer(
          'Overdue Report',
          result.items.map(
            (item) =>
              `${item.member.fullName} | ${item.book.title} | due=${item.dueDate.toISOString().slice(0, 10)} | overdueDays=${item.overdueDays}`,
          ),
        ),
        contentType: PDF_CONTENT_TYPE,
        fileName: `${baseName}.pdf`,
      };
    }

    return {
      buffer: await this.buildWorkbookBuffer(
        'Overdue',
        [
          { header: 'Member', key: 'memberName' },
          { header: 'Email', key: 'email' },
          { header: 'Book', key: 'bookTitle' },
          { header: 'ISBN', key: 'isbn' },
          { header: 'Due Date', key: 'dueDate' },
          { header: 'Overdue Days', key: 'overdueDays' },
        ],
        result.items.map((item) => ({
          memberName: item.member.fullName,
          email: item.member.email,
          bookTitle: item.book.title,
          isbn: item.book.isbn,
          dueDate: item.dueDate.toISOString(),
          overdueDays: item.overdueDays,
        })),
      ),
      contentType: XLSX_CONTENT_TYPE,
      fileName: `${baseName}.xlsx`,
    };
  }

  private async exportInventoryReport(query: ExportReportQuery): Promise<ReportExportFile> {
    const items = await this.getInventoryStatus({
      categoryId: query.categoryId,
      status: query.status,
    });
    const baseName = `inventory-report-${Date.now()}`;

    if (query.format === 'pdf') {
      return {
        buffer: await this.buildPdfBuffer(
          'Inventory Status Report',
          items.map((item) => `${item.book.title} | ${item.status} | totalCopies=${item.totalCopies}`),
        ),
        contentType: PDF_CONTENT_TYPE,
        fileName: `${baseName}.pdf`,
      };
    }

    return {
      buffer: await this.buildWorkbookBuffer(
        'Inventory',
        [
          { header: 'Book', key: 'bookTitle' },
          { header: 'ISBN', key: 'isbn' },
          { header: 'Status', key: 'status' },
          { header: 'Total Copies', key: 'totalCopies' },
        ],
        items.map((item) => ({
          bookTitle: item.book.title,
          isbn: item.book.isbn,
          status: item.status,
          totalCopies: item.totalCopies,
        })),
      ),
      contentType: XLSX_CONTENT_TYPE,
      fileName: `${baseName}.xlsx`,
    };
  }

  private async exportFinesReport(query: ExportReportQuery): Promise<ReportExportFile> {
    const result = await this.getFineStats({
      from: query.from,
      to: query.to,
    });
    const baseName = `fine-summary-${isoDate(query.from)}-${isoDate(query.to)}`;

    if (query.format === 'pdf') {
      return {
        buffer: await this.buildPdfBuffer(
          'Fine Summary Report',
          [
            ...result.summary.map(
              (item) => `status=${item.status} | amount=${formatCurrency(item.totalAmount)} | count=${item.count}`,
            ),
            '',
            ...result.memberDebts.map(
              (item) => `${item.member.fullName} | unpaid=${formatCurrency(item.unpaidTotal)} | count=${item.fineCount}`,
            ),
          ],
        ),
        contentType: PDF_CONTENT_TYPE,
        fileName: `${baseName}.pdf`,
      };
    }

    return {
      buffer: await this.buildWorkbookBuffer(
        'Fine Summary',
        [
          { header: 'Status', key: 'status' },
          { header: 'Total Amount', key: 'totalAmount' },
          { header: 'Count', key: 'count' },
        ],
        result.summary,
      ),
      contentType: XLSX_CONTENT_TYPE,
      fileName: `${baseName}.xlsx`,
    };
  }

  private async buildWorkbookBuffer(
    sheetName: string,
    columns: Array<{ header: string; key: string }>,
    rows: object[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: Math.max(column.header.length + 4, 16),
    }));

    for (const row of rows) {
      worksheet.addRow(row as ExcelJS.RowValues);
    }

    return toBuffer(await workbook.xlsx.writeBuffer());
  }

  private async buildPdfBuffer(title: string, lines: string[]): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const document = new PDFDocument({ margin: 40 });
      const chunks: Buffer[] = [];

      document.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      document.on('error', reject);
      document.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      document.fontSize(16).text(title);
      document.moveDown();

      if (lines.length === 0) {
        document.fontSize(11).text('No data available.');
      } else {
        for (const line of lines) {
          document.fontSize(10).text(line);
        }
      }

      document.end();
    });
  }
}

export const reportService = new ReportService();
