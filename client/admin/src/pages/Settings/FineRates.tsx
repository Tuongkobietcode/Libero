import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Modal, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

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
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            Mức phạt
          </Typography.Title>
          <Typography.Text type="secondary">Quản lý mức phạt quá hạn theo thời điểm hiệu lực. Chỉ quản trị viên được phép thao tác.</Typography.Text>
        </div>
        <Button type="primary" onClick={() => setOpen(true)}>
          Thêm mức phạt
        </Button>
      </Space>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <Card>
        <Table
          rowKey="_id"
          loading={query.isLoading}
          pagination={false}
          dataSource={query.data ?? []}
          columns={[
            { title: 'Mức phạt / ngày', render: (_, record) => formatCurrency(record.ratePerDay) },
            { title: 'Hiệu lực từ', render: (_, record) => formatDate(record.effectiveFrom) },
            { title: 'Áp dụng cho', dataIndex: 'appliesTo' },
          ]}
        />
      </Card>

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
    </Space>
  );
}
