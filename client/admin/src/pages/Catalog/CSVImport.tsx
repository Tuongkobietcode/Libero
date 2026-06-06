import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { Alert, Empty, Upload } from 'antd';
import { useState } from 'react';

import { AdminPanel, AdminStack, primaryButtonClass } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
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
    <AdminStack>
      <AdminPanel
        title="Tệp dữ liệu"
        description="Tải hàng loạt sách bằng CSV. Các cột cần có: isbn, title, author, category, quantity, shelfLocation. Có thể thêm coverImage; nếu bỏ trống hệ thống sẽ dùng ảnh bìa mặc định."
      >
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
          <p className="ant-upload-hint">Hệ thống sẽ trả về lỗi theo từng dòng nếu dữ liệu chưa hợp lệ.</p>
        </Upload.Dragger>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className={primaryButtonClass}
            disabled={!file || importMutation.isPending}
            onClick={() => importMutation.mutate()}
            type="button"
          >
            <UploadOutlined />
            Nhập tệp
          </button>
          <span className="text-sm font-semibold text-slate-500">{file ? file.name : 'Chưa chọn tệp nào'}</span>
        </div>
      </AdminPanel>

      {importMutation.isError ? (
        <Alert type="error" showIcon message={extractErrorMessage(importMutation.error, 'Nhập dữ liệu thất bại')} />
      ) : null}

      <AdminPanel title="Kết quả nhập dữ liệu">
        {importMutation.data ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="m-0 text-sm font-extrabold text-emerald-700">Thành công</p>
                <p className="m-0 mt-2 text-3xl font-black text-emerald-700">{importMutation.data.successCount}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-4">
                <p className="m-0 text-sm font-extrabold text-red-700">Thất bại</p>
                <p className="m-0 mt-2 text-3xl font-black text-red-700">{importMutation.data.failedCount}</p>
              </div>
            </div>

            {importMutation.data.errors.length ? (
              <DataTable
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
          </div>
        ) : (
          <Empty description="Hãy tải tệp CSV để xem kết quả nhập dữ liệu." />
        )}
      </AdminPanel>
    </AdminStack>
  );
}
