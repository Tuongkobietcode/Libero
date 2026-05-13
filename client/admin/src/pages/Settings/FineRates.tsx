import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, DatePicker, Form, Input, InputNumber, Modal } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { AdminPanel, AdminStack, primaryActionButtonClass } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
import { fineApi } from '../../services/fine.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { formatCurrency, formatDate } from '../../utils/format';

interface FineRateFormValues {
  ratePerDay: number;
  effectiveFrom: dayjs.Dayjs;
  appliesTo?: string;
}

export default function FineRatesPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FineRateFormValues>();

  const query = useQuery({
    queryKey: ['settings', 'fine-rates'],
    queryFn: () => fineApi.listFineRates(),
  });

  const mutation = useMutation({
    mutationFn: (values: FineRateFormValues) =>
      fineApi.createFineRate({
        ratePerDay: values.ratePerDay,
        effectiveFrom: values.effectiveFrom.toISOString(),
        appliesTo: values.appliesTo,
      }),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã tạo mức phạt mới' });
      setOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['settings', 'fine-rates'] });
    },
  });

  return (
    <AdminStack>
      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <AdminPanel
        title="Mức phạt theo thời điểm"
        description="Theo dõi các mức phạt quá hạn đã được áp dụng trong hệ thống."
        actions={
          <button className={primaryActionButtonClass} onClick={() => setOpen(true)} type="button">
            <PlusOutlined />
            Thêm mức phạt
          </button>
        }
      >
        <DataTable
          rowKey="_id"
          loading={query.isLoading}
          pagination={false}
          dataSource={query.data ?? []}
          columns={[
            { title: 'Mức phạt / ngày', render: (_, record) => formatCurrency(record.ratePerDay) },
            { title: 'Hiệu lực từ', render: (_, record) => formatDate(record.effectiveFrom) },
            { title: 'Áp dụng cho', dataIndex: 'appliesTo', render: (value) => value || 'Tất cả' },
          ]}
        />
      </AdminPanel>

      <Modal
        title="Tạo mức phạt"
        open={open}
        onCancel={() => setOpen(false)}
        confirmLoading={mutation.isPending}
        onOk={() => form.submit()}
        okText="Tạo"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
          <Form.Item label="Mức phạt mỗi ngày" name="ratePerDay" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Hiệu lực từ" name="effectiveFrom" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Áp dụng cho" name="appliesTo">
            <Input placeholder="all" />
          </Form.Item>
        </Form>
      </Modal>
    </AdminStack>
  );
}
