import type { ApiEnvelope } from '../types/api';
import type {
  CopyStatus,
  ExportReportFormat,
  ExportReportType,
  FineSummaryReport,
  InventoryStatusItem,
  LoanStatsItem,
  OverdueReportResult,
  OverdueSort,
  PopularBookItem,
  ReportGroupBy,
} from '../types/models';
import { apiClient, unwrapResponse } from './api';

export interface DateRangeParams {
  from?: string;
  to?: string;
}

export const reportApi = {
  async getLoanSummary(params: DateRangeParams & { groupBy?: ReportGroupBy }): Promise<LoanStatsItem[]> {
    const response = await apiClient.get<ApiEnvelope<LoanStatsItem[]>>('/reports/loans/summary', { params });
    return unwrapResponse(response.data);
  },
  async getOverdueList(params: { page?: number; limit?: number; sort?: OverdueSort }): Promise<OverdueReportResult> {
    const response = await apiClient.get<ApiEnvelope<OverdueReportResult>>('/reports/overdue', { params });
    return unwrapResponse(response.data);
  },
  async getPopularBooks(params: DateRangeParams & { limit?: number }): Promise<PopularBookItem[]> {
    const response = await apiClient.get<ApiEnvelope<PopularBookItem[]>>('/reports/popular-books', { params });
    return unwrapResponse(response.data);
  },
  async getInventory(params: { categoryId?: string; status?: CopyStatus }): Promise<InventoryStatusItem[]> {
    const response = await apiClient.get<ApiEnvelope<InventoryStatusItem[]>>('/reports/inventory', { params });
    return unwrapResponse(response.data);
  },
  async getFineSummary(params: DateRangeParams): Promise<FineSummaryReport> {
    const response = await apiClient.get<ApiEnvelope<FineSummaryReport>>('/reports/fines/summary', { params });
    return unwrapResponse(response.data);
  },
  async exportReport(params: {
    type: ExportReportType;
    format: ExportReportFormat;
    from?: string;
    to?: string;
    groupBy?: ReportGroupBy;
    page?: number;
    limit?: number;
    sort?: OverdueSort;
    categoryId?: string;
    status?: CopyStatus;
  }): Promise<{ blob: Blob; fileName: string }> {
    const response = await apiClient.get('/reports/export', {
      params,
      responseType: 'blob',
    });
    const disposition = response.headers['content-disposition'] as string | undefined;
    const fileNameMatch = disposition?.match(/filename="(.+)"/);

    return {
      blob: response.data as Blob,
      fileName: fileNameMatch?.[1] ?? `${params.type}.${params.format}`,
    };
  },
};
