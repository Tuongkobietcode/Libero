import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Form, Input, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { Role } from '../../types/models';
import { getRoleLabel } from '../../utils/display';
import { extractErrorMessage } from '../../utils/format';

interface MemberFormValues {
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  studentId?: string;
  role: Role;
  joinDate?: dayjs.Dayjs;
  expiryDate?: dayjs.Dayjs;
}

export default function MemberFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const isEdit = Boolean(id);
  const [form] = Form.useForm<MemberFormValues>();

  const memberQuery = useQuery({
    queryKey: ['members', 'detail', id],
    enabled: Boolean(id),
    queryFn: () => memberApi.getMember(id!),
  });

  useEffect(() => {
    if (!memberQuery.data) {
      return;
    }

    form.setFieldsValue({
      fullName: memberQuery.data.fullName,
      email: memberQuery.data.email,
      phone: memberQuery.data.phone,
      studentId: memberQuery.data.studentId,
      role: memberQuery.data.role,
      joinDate: memberQuery.data.joinDate ? dayjs(memberQuery.data.joinDate) : undefined,
      expiryDate: memberQuery.data.expiryDate ? dayjs(memberQuery.data.expiryDate) : undefined,
    });
  }, [form, memberQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: MemberFormValues) => {
      const payload = {
        ...values,
        joinDate: values.joinDate?.toISOString(),
        expiryDate: values.expiryDate?.toISOString(),
      };

      if (isEdit) {
        return memberApi.updateMember(id!, payload);
      }

      return memberApi.createMember({
        ...payload,
        password: values.password ?? '',
      });
    },
    onSuccess: (member) => {
      notify({
        level: 'success',
        message: isEdit ? 'Đã cập nhật thành viên' : 'Đã tạo thành viên',
        description: `${member.fullName} đã sẵn sàng cho các nghiệp vụ lưu thông.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
      void queryClient.invalidateQueries({ queryKey: ['members', 'detail', member._id] });
      navigate(`/members/${member._id}`);
    },
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          {isEdit ? 'Chỉnh sửa thành viên' : 'Thêm thành viên'}
        </Typography.Title>
        <Typography.Text type="secondary">
          Giữ hồ sơ thành viên đầy đủ và sẵn sàng cho các quy trình lưu thông.
        </Typography.Text>
      </div>

      {memberQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải thông tin thành viên" description={(memberQuery.error as Error).message} />
      ) : null}

      <Card>
        <Form<MemberFormValues> form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)} initialValues={{ role: Role.Student }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Form.Item label="Họ và tên" name="fullName" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
            {!isEdit ? (
              <Form.Item label="Mật khẩu tạm thời" name="password" rules={[{ required: true, min: 8 }]}>
                <Input.Password />
              </Form.Item>
            ) : null}
            <Form.Item label="Số điện thoại" name="phone">
              <Input />
            </Form.Item>
            <Form.Item label="Mã sinh viên" name="studentId">
              <Input />
            </Form.Item>
            <Form.Item label="Vai trò" name="role" rules={[{ required: true }]}>
              <Select options={Object.values(Role).map((role) => ({ label: getRoleLabel(role), value: role }))} />
            </Form.Item>
            <Form.Item label="Ngày tham gia" name="joinDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Ngày hết hạn" name="expiryDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            {saveMutation.isError ? (
              <Alert type="error" showIcon message={extractErrorMessage(saveMutation.error, 'Không thể lưu thành viên')} />
            ) : null}
            <Space>
              <Button onClick={() => navigate(isEdit ? `/members/${id}` : '/members')}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
                {isEdit ? 'Lưu thay đổi' : 'Tạo thành viên'}
              </Button>
            </Space>
          </Space>
        </Form>
      </Card>
    </Space>
  );
}
