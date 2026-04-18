import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, DatePicker, Empty, Row, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { StatusBadge } from '../../components/StatusBadge';
import { reportApi } from '../../services/report.api';
import { getStatusLabel } from '../../utils/display';
import { downloadBlob, formatCurrency } from '../../utils/format';

export default function FineStatsPage() {
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const query = useQuery({
    queryKey: ['reports', 'fine-stats', range?.[0]?.toISOString(), range?.[1]?.toISOString()],
    queryFn: () =>
      reportApi.getFineSummary({
        from: range?.[0]?.toISOString(),
        to: range?.[1]?.toISOString(),
      }),
  });

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    const file = await reportApi.exportReport({
      type: 'fines',
      format,
      from: range?.[0]?.toISOString(),
      to: range?.[1]?.toISOString(),
    });
    downloadBlob(file.blob, file.fileName);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Thống kê tiền phạt
        </Typography.Title>
        <Typography.Text type="secondary">Phân tích nợ chưa thanh toán, tổng tiền theo trạng thái và biến động tiền phạt theo thời gian.</Typography.Text>
      </div>

      <Card>
        <Space wrap>
          <DatePicker.RangePicker value={range as [dayjs.Dayjs, dayjs.Dayjs] | null} onChange={(nextRange) => setRange(nextRange as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} />
          <Button icon={<DownloadOutlined />} onClick={() => void handleExport('xlsx')}>
            Xuất XLSX
          </Button>
          <Button onClick={() => void handleExport('pdf')}>Xuất PDF</Button>
        </Space>
      </Card>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <Row gutter={[16, 16]}>
        {(query.data?.summary ?? []).map((item) => (
          <Col xs={24} md={8} key={item.status}>
            <Card title={getStatusLabel(item.status)}>
              <Typography.Title level={4}>{formatCurrency(item.totalAmount)}</Typography.Title>
              <Typography.Text type="secondary">{item.count} bản ghi</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="Xu hướng">
        {query.data?.trend.length ? (
          <Table
            rowKey="period"
            pagination={false}
            dataSource={query.data.trend}
            columns={[
              { title: 'Kỳ', dataIndex: 'period' },
              { title: 'Tổng số tiền', render: (_, record) => formatCurrency(record.totalAmount) },
              { title: 'Số bản ghi', dataIndex: 'count' },
            ]}
          />
        ) : (
          <Empty description="Không có dữ liệu xu hướng." />
        )}
      </Card>

      <Card title="Công nợ thành viên">
        {query.data?.memberDebts.length ? (
          <Table
            rowKey={(record) => record.member._id}
            pagination={false}
            dataSource={query.data.memberDebts}
            columns={[
              { title: 'Thành viên', dataIndex: ['member', 'fullName'] },
              { title: 'Trạng thái tài khoản', render: (_, record) => <StatusBadge status={record.member.status} /> },
              { title: 'Tổng chưa thanh toán', render: (_, record) => formatCurrency(record.unpaidTotal) },
              { title: 'Số khoản phạt', dataIndex: 'fineCount' },
            ]}
          />
        ) : (
          <Empty description="Không có dữ liệu công nợ thành viên." />
        )}
      </Card>
    </Space>
  );
}
