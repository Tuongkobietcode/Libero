import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Form, InputNumber, Modal, Space, Table, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { getRoleLabel } from '../../utils/display';
import { formatDate } from '../../utils/format';

interface PolicyFormValues {
  maxBooks: number;
  loanDays: number;
  maxRenewals: number;
  renewDays: number;
}

export default function LoanPoliciesPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [form] = Form.useForm<PolicyFormValues>();
  const query = useQuery({
    queryKey: ['settings', 'loan-policies'],
    queryFn: () => memberApi.listLoanPolicies(),
  });

  const mutation = useMutation({
    mutationFn: async (values: PolicyFormValues) => {
      if (!editingRole) {
        throw new Error('Chưa chọn chính sách để chỉnh sửa.');
      }

      return memberApi.updateLoanPolicy(editingRole, {
        ...values,
        effectiveFrom: dayjs().toISOString(),
      });
    },
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã cập nhật chính sách mượn' });
      setEditingRole(null);
      void queryClient.invalidateQueries({ queryKey: ['settings', 'loan-policies'] });
    },
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Chính sách mượn
        </Typography.Title>
        <Typography.Text type="secondary">Cấu hình giới hạn mượn và gia hạn theo từng vai trò. Chỉ quản trị viên được phép chỉnh sửa.</Typography.Text>
      </div>

      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <Card>
        <Table
          rowKey="role"
          loading={query.isLoading}
          pagination={false}
          dataSource={query.data ?? []}
          columns={[
            { title: 'Vai trò', render: (_, record) => getRoleLabel(record.role) },
            { title: 'Số sách tối đa', dataIndex: 'maxBooks' },
            { title: 'Số ngày mượn', dataIndex: 'loanDays' },
            { title: 'Số lần gia hạn tối đa', dataIndex: 'maxRenewals' },
            { title: 'Số ngày gia hạn', dataIndex: 'renewDays' },
            { title: 'Hiệu lực từ', render: (_, record) => formatDate(record.effectiveFrom) },
            {
              title: 'Thao tác',
              render: (_, record) => (
                <Button
                  onClick={() => {
                    setEditingRole(record.role);
                    form.setFieldsValue(record);
                  }}
                >
                  Chỉnh sửa
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={`Chỉnh sửa chính sách${editingRole ? `: ${getRoleLabel(editingRole)}` : ''}`}
        open={Boolean(editingRole)}
        onCancel={() => setEditingRole(null)}
        confirmLoading={mutation.isPending}
        onOk={() => form.submit()}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
          <Form.Item label="Số sách tối đa" name="maxBooks" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Số ngày mượn" name="loanDays" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Số lần gia hạn tối đa" name="maxRenewals" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Số ngày gia hạn" name="renewDays" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
