import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Empty, Select, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

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
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Thống kê mượn trả
        </Typography.Title>
        <Typography.Text type="secondary">Theo dõi số lượng phiếu mượn và biến động trạng thái theo ngày, tuần hoặc tháng.</Typography.Text>
      </div>

      <Card>
        <Space wrap>
          <DatePicker.RangePicker value={range as [dayjs.Dayjs, dayjs.Dayjs] | null} onChange={(nextRange) => setRange(nextRange as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
          <Select
            value={groupBy}
            style={{ width: 160 }}
            onChange={(value) => setGroupBy(value)}
            options={[
              { label: 'Theo ngày', value: 'day' },
              { label: 'Theo tuần', value: 'week' },
              { label: 'Theo tháng', value: 'month' },
            ]}
          />
          <Button icon={<DownloadOutlined />} onClick={() => void handleExport('xlsx')}>
            Xuất XLSX
          </Button>
          <Button onClick={() => void handleExport('pdf')}>Xuất PDF</Button>
        </Space>
      </Card>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <Card>
        {query.data?.length ? (
          <Table
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
      </Card>
    </Space>
  );
}
