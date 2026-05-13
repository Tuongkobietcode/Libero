import { DownloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, Select } from 'antd';
import { useState } from 'react';

import { AdminPanel, AdminStack, AdminToolbar, secondaryButtonClass } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
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
    <AdminStack>
      <AdminToolbar>
        <Select
          allowClear
          placeholder="Lọc theo trạng thái"
          className="min-w-56"
          value={status}
          onChange={(value) => setStatus(value)}
          options={Object.values(CopyStatus).map((value) => ({ label: getStatusLabel(value), value }))}
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

      <AdminPanel title="Tình trạng kho" description="Số lượng bản sao theo từng đầu sách và trạng thái bản sao.">
        {query.data?.length ? (
          <DataTable
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
      </AdminPanel>
    </AdminStack>
  );
}
