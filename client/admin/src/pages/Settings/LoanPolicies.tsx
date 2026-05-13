import { EditOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Form, InputNumber, Modal } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { AdminPanel, AdminStack, secondaryButtonClass } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
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
    <AdminStack>
      {query.error ? <Alert type="error" showIcon message={(query.error as Error).message} /> : null}

      <AdminPanel
        title="Bảng chính sách"
        description="Cấu hình số lượng sách, thời hạn mượn và quyền gia hạn theo từng vai trò."
      >
        <DataTable
          rowKey="role"
          loading={query.isLoading}
          pagination={false}
          dataSource={query.data ?? []}
          columns={[
            { title: 'Vai trò', render: (_, record) => getRoleLabel(record.role) },
            { title: 'Sách tối đa', dataIndex: 'maxBooks' },
            { title: 'Ngày mượn', dataIndex: 'loanDays' },
            { title: 'Lần gia hạn', dataIndex: 'maxRenewals' },
            { title: 'Ngày gia hạn', dataIndex: 'renewDays' },
            { title: 'Hiệu lực từ', render: (_, record) => formatDate(record.effectiveFrom) },
            {
              title: 'Thao tác',
              align: 'right',
              render: (_, record) => (
                <button
                  className={secondaryButtonClass}
                  onClick={() => {
                    setEditingRole(record.role);
                    form.setFieldsValue(record);
                  }}
                  type="button"
                >
                  <EditOutlined />
                  Chỉnh sửa
                </button>
              ),
            },
          ]}
        />
      </AdminPanel>

      <Modal
        title={`Chỉnh sửa chính sách${editingRole ? `: ${getRoleLabel(editingRole)}` : ''}`}
        open={Boolean(editingRole)}
        forceRender
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
    </AdminStack>
  );
}
