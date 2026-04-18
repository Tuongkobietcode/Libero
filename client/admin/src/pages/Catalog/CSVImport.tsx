import { InboxOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Space, Table, Typography, Upload } from 'antd';
import { useState } from 'react';

import { catalogApi } from '../../services/catalog.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { extractErrorMessage } from '../../utils/format';

export default function CSVImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const notify = useNotificationsStore((state) => state.push);

  const importMutation = useMutation({
    mutationFn: () => {
      if (!file) {
        throw new Error('Vui lòng chọn tệp CSV trước khi nhập dữ liệu.');
      }

      return catalogApi.importBooks(file);
    },
    onSuccess: (result) => {
      notify({
        level: 'success',
        message: 'Nhập dữ liệu thành công',
        description: `${result.successCount} dòng đã được nhập thành công.`,
      });
    },
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Nhập dữ liệu CSV
        </Typography.Title>
        <Typography.Text type="secondary">
          Tải hàng loạt sách bằng tệp CSV và xem lỗi theo từng dòng trước khi nhập lại.
        </Typography.Text>
      </div>

      <Card>
        <Upload.Dragger
          accept=".csv"
          maxCount={1}
          beforeUpload={(nextFile) => {
            setFile(nextFile as File);
            return false;
          }}
          onRemove={() => setFile(null)}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Kéo thả tệp CSV vào đây hoặc bấm để chọn tệp</p>
          <p className="ant-upload-hint">Các cột mong đợi: isbn, title, author, category, quantity, shelfLocation</p>
        </Upload.Dragger>
        <Space style={{ marginTop: 16 }}>
          <Button type="primary" disabled={!file} loading={importMutation.isPending} onClick={() => importMutation.mutate()}>
            Nhập tệp
          </Button>
          <Typography.Text type="secondary">{file ? file.name : 'Chưa chọn tệp nào'}</Typography.Text>
        </Space>
      </Card>

      {importMutation.isError ? (
        <Alert type="error" showIcon message={extractErrorMessage(importMutation.error, 'Nhập dữ liệu thất bại')} />
      ) : null}

      <Card title="Kết quả nhập dữ liệu">
        {importMutation.data ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text>{`Thành công: ${importMutation.data.successCount} | Thất bại: ${importMutation.data.failedCount}`}</Typography.Text>
            {importMutation.data.errors.length ? (
              <Table
                size="small"
                rowKey={(record) => `${record.row}-${record.isbn ?? 'unknown'}`}
                pagination={false}
                dataSource={importMutation.data.errors}
                columns={[
                  { title: 'Dòng', dataIndex: 'row' },
                  { title: 'ISBN', dataIndex: 'isbn' },
                  { title: 'Thông báo', dataIndex: 'message' },
                ]}
              />
            ) : (
              <Empty description="Không có lỗi theo từng dòng" />
            )}
          </Space>
        ) : (
          <Empty description="Hãy tải tệp CSV để xem kết quả nhập dữ liệu." />
        )}
      </Card>
    </Space>
  );
}
