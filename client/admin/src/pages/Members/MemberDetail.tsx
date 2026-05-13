import { EditOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Descriptions, Empty } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminPanel, AdminStack, primaryButtonClass } from '../../components/AdminSurface';
import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { fineApi } from '../../services/fine.api';
import { loanApi } from '../../services/loan.api';
import { memberApi } from '../../services/member.api';
import { reservationApi } from '../../services/reservation.api';
import { getRoleLabel } from '../../utils/display';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

export default function MemberDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const memberQuery = useQuery({
    queryKey: ['members', 'detail', id],
    enabled: Boolean(id),
    queryFn: () => memberApi.getMember(id),
  });
  const loansQuery = useQuery({
    queryKey: ['members', 'detail', id, 'loans'],
    enabled: Boolean(id),
    queryFn: () => loanApi.listLoans({ memberId: id, limit: 5, page: 1 }),
  });
  const reservationsQuery = useQuery({
    queryKey: ['members', 'detail', id, 'reservations'],
    enabled: Boolean(id),
    queryFn: () => reservationApi.listReservations({ memberId: id, limit: 5, page: 1 }),
  });
  const finesQuery = useQuery({
    queryKey: ['members', 'detail', id, 'fines'],
    enabled: Boolean(id),
    queryFn: () => fineApi.listFines({ memberId: id, limit: 5, page: 1 }),
  });

  const member = memberQuery.data;
  const error = memberQuery.error ?? loansQuery.error ?? reservationsQuery.error ?? finesQuery.error;

  return (
    <AdminStack>
      {error ? (
        <Alert type="error" showIcon message="Không thể tải chi tiết thành viên" description={(error as Error).message} />
      ) : null}

      {member ? (
        <>
          <AdminPanel
            title={member.fullName}
            description="Hồ sơ, thẻ thư viện, khoản mượn, đặt chỗ và tiền phạt của thành viên."
            actions={
              <button className={primaryButtonClass} onClick={() => navigate(`/members/${member._id}/edit`)} type="button">
                <EditOutlined />
                Chỉnh sửa
              </button>
            }
          >
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Email">{member.email}</Descriptions.Item>
              <Descriptions.Item label="Mã thẻ">{member.memberCardNo}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{getRoleLabel(member.role)}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <StatusBadge status={member.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Bị khóa">{member.isBlocked ? 'Có' : 'Không'}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{member.phone ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày tham gia">{formatDate(member.joinDate)}</Descriptions.Item>
              <Descriptions.Item label="Ngày hết hạn">{formatDate(member.expiryDate)}</Descriptions.Item>
            </Descriptions>
          </AdminPanel>

          <div className="grid gap-5 xl:grid-cols-2">
            <AdminPanel title="Phiếu mượn gần đây">
              {loansQuery.data?.items.length ? (
                <DataTable
                  size="small"
                  rowKey="_id"
                  pagination={false}
                  dataSource={loansQuery.data.items}
                  columns={[
                    { title: 'Sách', dataIndex: ['book', 'title'] },
                    { title: 'Hạn trả', render: (_, record) => formatDate(record.dueDate) },
                    { title: 'Trạng thái', render: (_, record) => <StatusBadge status={record.status} /> },
                  ]}
                />
              ) : (
                <Empty description="Không có phiếu mượn" />
              )}
            </AdminPanel>

            <AdminPanel title="Đặt chỗ gần đây">
              {reservationsQuery.data?.items.length ? (
                <DataTable
                  size="small"
                  rowKey="_id"
                  pagination={false}
                  dataSource={reservationsQuery.data.items}
                  columns={[
                    { title: 'Sách', dataIndex: ['book', 'title'] },
                    { title: 'Vị trí chờ', dataIndex: 'queuePosition' },
                    { title: 'Trạng thái', render: (_, record) => <StatusBadge status={record.status} /> },
                    { title: 'Hết hạn giữ chỗ', render: (_, record) => formatDateTime(record.holdExpiryAt) },
                  ]}
                />
              ) : (
                <Empty description="Không có lượt đặt chỗ" />
              )}
            </AdminPanel>
          </div>

          <AdminPanel title="Tiền phạt gần đây">
            {finesQuery.data?.items.length ? (
              <DataTable
                size="small"
                rowKey="_id"
                pagination={false}
                dataSource={finesQuery.data.items}
                columns={[
                  { title: 'Sách', dataIndex: ['book', 'title'] },
                  { title: 'Ngày quá hạn', render: (_, record) => formatDate(record.overdueDate) },
                  { title: 'Số tiền', render: (_, record) => formatCurrency(record.amount) },
                  { title: 'Trạng thái', render: (_, record) => <StatusBadge status={record.status} /> },
                ]}
              />
            ) : (
              <Empty description="Không có khoản phạt" />
            )}
          </AdminPanel>
        </>
      ) : null}
    </AdminStack>
  );
}
