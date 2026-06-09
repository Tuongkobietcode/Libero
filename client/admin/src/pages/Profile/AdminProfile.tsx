import { EditOutlined, IdcardOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Descriptions, Skeleton } from 'antd';
import { useNavigate } from 'react-router-dom';

import { AdminPanel, AdminStack, primaryActionButtonClass } from '../../components/AdminSurface';
import { StatusBadge } from '../../components/StatusBadge';
import { memberApi } from '../../services/member.api';
import { getRoleLabel } from '../../utils/display';
import { formatDate, formatDateTime } from '../../utils/format';

function getInitial(name?: string): string {
  return name?.trim().charAt(0).toUpperCase() || 'A';
}

export default function AdminProfilePage() {
  const navigate = useNavigate();
  const profileQuery = useQuery({
    queryKey: ['members', 'me', 'admin-profile'],
    queryFn: () => memberApi.getMe(),
  });

  const profile = profileQuery.data;

  return (
    <AdminStack>
      {profileQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải hồ sơ quản trị" description={(profileQuery.error as Error).message} />
      ) : null}

      <AdminPanel
        title="Tài khoản đang đăng nhập"
        description="Thông tin định danh, vai trò và trạng thái truy cập của tài khoản quản trị."
        actions={
          profile ? (
            <button className={primaryActionButtonClass} type="button" onClick={() => navigate(`/members/${profile._id}/edit`)}>
              <EditOutlined />
              Chỉnh sửa hồ sơ
            </button>
          ) : null
        }
      >
        {profileQuery.isLoading ? (
          <Skeleton active paragraph={{ rows: 5 }} />
        ) : profile ? (
          <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <div className="grid gap-4 text-center">
                <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#3157ff] text-2xl font-extrabold text-white shadow-[0_16px_34px_rgba(49,87,255,0.22)]">
                  {getInitial(profile.fullName)}
                </span>
                <div>
                  <p className="m-0 text-lg font-extrabold text-slate-950">{profile.fullName}</p>
                  <p className="m-0 mt-1 text-sm font-semibold text-slate-500">{getRoleLabel(profile.role)}</p>
                </div>
                <div className="flex justify-center">
                  <StatusBadge status={profile.status} />
                </div>
              </div>
            </div>

            <Descriptions bordered column={2} className="[&_.ant-descriptions-item-label]:font-bold">
              <Descriptions.Item label={<span><UserOutlined /> Họ tên</span>}>{profile.fullName}</Descriptions.Item>
              <Descriptions.Item label={<span><MailOutlined /> Email</span>}>{profile.email}</Descriptions.Item>
              <Descriptions.Item label={<span><IdcardOutlined /> Mã thẻ</span>}>{profile.memberCardNo}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{getRoleLabel(profile.role)}</Descriptions.Item>
              <Descriptions.Item label={<span><PhoneOutlined /> Số điện thoại</span>}>{profile.phone ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Bị khóa">{profile.isBlocked ? 'Có' : 'Không'}</Descriptions.Item>
              <Descriptions.Item label="Ngày tham gia">{formatDate(profile.joinDate)}</Descriptions.Item>
              <Descriptions.Item label="Ngày hết hạn">{formatDate(profile.expiryDate)}</Descriptions.Item>
              <Descriptions.Item label="Đăng nhập gần nhất">{formatDateTime(profile.lastLoginAt)}</Descriptions.Item>
              <Descriptions.Item label="Cập nhật mật khẩu">{formatDateTime(profile.passwordUpdatedAt)}</Descriptions.Item>
            </Descriptions>
          </div>
        ) : null}
      </AdminPanel>
    </AdminStack>
  );
}
