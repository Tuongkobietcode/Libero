import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';

import { StatusBadge } from '../../components/StatusBadge';
import { reportApi } from '../../services/report.api';
import { CopyStatus } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { downloadBlob } from '../../utils/format';

export default function InventoryPage() {
  const [status, setStatus] = useState<CopyStatus | undefined>();

  const query = useQuery({
    queryKey: ['reports', 'inventory', status],
    queryFn: () => reportApi.getInventory({ status }),
  });

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    const file = await reportApi.exportReport({
      type: 'inventory',
      format,
      status,
    });
    downloadBlob(file.blob, file.fileName);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Tình trạng kho
        </Typography.Title>
        <Typography.Text type="secondary">Xem số lượng bản sao theo từng đầu sách và trạng thái bản sao.</Typography.Text>
      </div>

      <Card>
        <Space wrap>
          <Select
            allowClear
            placeholder="Lọc theo trạng thái"
            style={{ width: 220 }}
            value={status}
            onChange={(value) => setStatus(value)}
            options={Object.values(CopyStatus).map((value) => ({ label: getStatusLabel(value), value }))}
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
            rowKey={(record) => `${record.book._id}-${record.status}`}
            pagination={false}
            loading={query.isLoading}
            dataSource={query.data}
            columns={[
              { title: 'Sách', dataIndex: ['book', 'title'] },
              { title: 'ISBN', dataIndex: ['book', 'isbn'] },
              { title: 'Trạng thái', render: (_, record) => <StatusBadge status={record.status} /> },
              { title: 'Số bản sao', dataIndex: 'totalCopies' },
            ]}
          />
        ) : (
          <Empty description="Không có dữ liệu tình trạng kho." />
        )}
      </Card>
    </Space>
  );
}
