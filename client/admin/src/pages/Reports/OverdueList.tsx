import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Select, Space, Typography } from 'antd';
import { useState } from 'react';

import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { reportApi } from '../../services/report.api';
import type { OverdueSort } from '../../types/models';
import { downloadBlob, formatDate } from '../../utils/format';

export default function OverdueListPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<OverdueSort>('overdueDays_desc');

  const query = useQuery({
    queryKey: ['reports', 'overdue', page, limit, sort],
    queryFn: () => reportApi.getOverdueList({ page, limit, sort }),
  });

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    const file = await reportApi.exportReport({
      type: 'overdue',
      format,
      page,
      limit,
      sort,
    });
    downloadBlob(file.blob, file.fileName);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Danh sách quá hạn
        </Typography.Title>
        <Typography.Text type="secondary">Hàng chờ tác nghiệp cho toàn bộ phiếu mượn quá hạn, sắp xếp để dễ theo dõi.</Typography.Text>
      </div>

      <Card>
        <Space wrap>
          <Select
            value={sort}
            style={{ width: 220 }}
            onChange={(value) => setSort(value)}
            options={[
              { label: 'Số ngày quá hạn giảm dần', value: 'overdueDays_desc' },
              { label: 'Số ngày quá hạn tăng dần', value: 'overdueDays_asc' },
              { label: 'Hạn trả giảm dần', value: 'dueDate_desc' },
              { label: 'Hạn trả tăng dần', value: 'dueDate_asc' },
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
        {query.data?.items.length ? (
          <DataTable
            rowKey="_id"
            loading={query.isLoading}
            dataSource={query.data.items}
            pagination={{
              current: query.data.pagination.page,
              pageSize: query.data.pagination.limit,
              total: query.data.pagination.totalItems,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setLimit(nextPageSize);
              },
            }}
            columns={[
              { title: 'Thành viên', dataIndex: ['member', 'fullName'] },
              { title: 'Sách', dataIndex: ['book', 'title'] },
              { title: 'Hạn trả', render: (_, record) => formatDate(record.dueDate) },
              { title: 'Số ngày quá hạn', dataIndex: 'overdueDays' },
              { title: 'Trạng thái', render: (_, record) => <StatusBadge status={record.status} /> },
            ]}
          />
        ) : (
          <Empty description="Không có phiếu mượn quá hạn." />
        )}
      </Card>
    </Space>
  );
}
