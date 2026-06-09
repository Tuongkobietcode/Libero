import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, DatePicker, Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminPanel, AdminStack, primaryButtonClass, secondaryButtonClass } from '../../components/AdminSurface';
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
  faculty?: string;
  className?: string;
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
      faculty: memberQuery.data.faculty,
      className: memberQuery.data.className,
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
    <AdminStack>
      {memberQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải thông tin thành viên" description={(memberQuery.error as Error).message} />
      ) : null}

      <AdminPanel title="Thông tin thành viên" description="Giữ hồ sơ đầy đủ để phục vụ các quy trình mượn, đặt giữ và xử lý phạt.">
        <Form<MemberFormValues>
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate(values)}
          initialValues={{ role: Role.Student }}
        >
          <div className="grid gap-x-5 md:grid-cols-2">
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
            <Form.Item label="Khoa" name="faculty">
              <Input />
            </Form.Item>
            <Form.Item label="Lớp" name="className">
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
          </div>

          {saveMutation.isError ? (
            <Alert type="error" showIcon message={extractErrorMessage(saveMutation.error, 'Không thể lưu thành viên')} />
          ) : null}

          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button className={secondaryButtonClass} onClick={() => navigate(isEdit ? `/members/${id}` : '/members')} type="button">
              Hủy
            </button>
            <button className={primaryButtonClass} disabled={saveMutation.isPending} type="submit">
              {isEdit ? 'Lưu thay đổi' : 'Tạo thành viên'}
            </button>
          </div>
        </Form>
      </AdminPanel>
    </AdminStack>
  );
}
