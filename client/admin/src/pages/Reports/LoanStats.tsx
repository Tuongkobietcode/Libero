import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, DatePicker, Empty, Select } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { AdminPanel, AdminStack, AdminToolbar, secondaryButtonClass } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
import { reportApi } from '../../services/report.api';
import { downloadBlob } from '../../utils/format';
import type { ReportGroupBy } from '../../types/models';

export default function LoanStatsPage() {
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day');
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const query = useQuery({
    queryKey: ['reports', 'loan-stats', groupBy, range?.[0]?.toISOString(), range?.[1]?.toISOString()],
    queryFn: () =>
      reportApi.getLoanSummary({
        groupBy,
        from: range?.[0]?.toISOString(),
        to: range?.[1]?.toISOString(),
      }),
  });

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    const file = await reportApi.exportReport({
      type: 'loans',
      format,
      groupBy,
      from: range?.[0]?.toISOString(),
      to: range?.[1]?.toISOString(),
    });
    downloadBlob(file.blob, file.fileName);
  };

  return (
    <AdminStack>
      <AdminToolbar>
        <DatePicker.RangePicker
          value={range as [dayjs.Dayjs, dayjs.Dayjs] | null}
          onChange={(nextRange) => setRange(nextRange as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
        />
        <Select
          value={groupBy}
          className="min-w-40"
          onChange={(value) => setGroupBy(value)}
          options={[
            { label: 'Theo ngày', value: 'day' },
            { label: 'Theo tuần', value: 'week' },
            { label: 'Theo tháng', value: 'month' },
          ]}
        />
        <button className={secondaryButtonClass} onClick={() => void handleExport('xlsx')} type="button">
          <DownloadOutlined />
          Xuất XLSX
        </button>
        <button className={secondaryButtonClass} onClick={() => void handleExport('pdf')} type="button">
          Xuất PDF
        </button>
      </AdminToolbar>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <AdminPanel title="Số liệu mượn trả" description="Theo dõi biến động khoản mượn theo ngày, tuần hoặc tháng.">
        {query.data?.length ? (
          <DataTable
            rowKey="period"
            pagination={false}
            loading={query.isLoading}
            dataSource={query.data}
            columns={[
              { title: 'Kỳ', dataIndex: 'period' },
              { title: 'Tổng số', dataIndex: 'totalLoans' },
              { title: 'Đang mượn', dataIndex: 'activeLoans' },
              { title: 'Quá hạn', dataIndex: 'overdueLoans' },
              { title: 'Đã trả', dataIndex: 'returnedLoans' },
              { title: 'Mất sách', dataIndex: 'lostLoans' },
            ]}
          />
        ) : (
          <Empty description="Không có dữ liệu thống kê trong khoảng thời gian đã chọn." />
        )}
      </AdminPanel>
    </AdminStack>
  );
}
