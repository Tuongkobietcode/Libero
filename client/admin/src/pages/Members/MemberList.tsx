import { EditOutlined, EyeOutlined, PauseCircleOutlined, PlusOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Empty, Input, Popconfirm, Row, Select, Space, Switch, Typography } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { useDebounce } from '../../hooks/useDebounce';
import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { MemberStatus, Role } from '../../types/models';
import { getRoleLabel, getStatusLabel } from '../../utils/display';
import { formatDate } from '../../utils/format';

export default function MemberListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const q = searchParams.get('q') ?? '';
  const role = searchParams.get('role') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const debouncedQuery = useDebounce(q, 300);

  const membersQuery = useQuery({
    queryKey: ['members', debouncedQuery, role, status, page, limit],
    queryFn: () =>
      memberApi.listMembers({
        q: debouncedQuery || undefined,
        role: role === 'all' ? undefined : (role as Role),
        status: status === 'all' ? undefined : (status as MemberStatus),
        page,
        limit,
      }),
  });

  const suspendMutation = useMutation({
    mutationFn: (memberId: string) => memberApi.suspendMember(memberId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã tạm khóa thành viên' });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const activateMutation = useMutation({
    mutationFn: (memberId: string) => memberApi.activateMember(memberId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã kích hoạt thành viên' });
      void queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);

    if (!value || value === 'all') {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    if (key !== 'page') {
      next.set('page', '1');
    }

    setSearchParams(next);
  };

  const updatePagination = (nextPage: number, nextLimit: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    next.set('limit', String(nextLimit));
    setSearchParams(next);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Thành viên
        </Typography.Title>
        <Typography.Text type="secondary">Quản lý tài khoản bạn đọc, trạng thái duyệt và điều kiện sử dụng thư viện.</Typography.Text>
      </div>

      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input.Search value={q} allowClear placeholder="Tìm theo tên, email hoặc mã thẻ" onChange={(event) => updateParam('q', event.target.value)} />
          </Col>
          <Col xs={24} md={5}>
            <Select
              value={role}
              style={{ width: '100%' }}
              onChange={(value) => updateParam('role', value)}
              options={[
                { label: 'Tất cả vai trò', value: 'all' },
                ...Object.values(Role).map((value) => ({ label: getRoleLabel(value), value })),
              ]}
            />
          </Col>
          <Col xs={24} md={5}>
            <Select
              value={status}
              style={{ width: '100%' }}
              onChange={(value) => updateParam('status', value)}
              options={[
                { label: 'Tất cả trạng thái', value: 'all' },
                ...Object.values(MemberStatus).map((value) => ({ label: getStatusLabel(value), value })),
              ]}
            />
          </Col>
          <Col xs={24} md={4}>
            <Button type="primary" icon={<PlusOutlined />} block onClick={() => navigate('/members/new')}>
              Thêm thành viên
            </Button>
          </Col>
        </Row>
      </Card>

      {membersQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải danh sách thành viên" description={(membersQuery.error as Error).message} />
      ) : null}

      <Card>
        {membersQuery.data?.items.length ? (
          <DataTable
            rowKey="_id"
            loading={membersQuery.isLoading}
            dataSource={membersQuery.data.items}
            pagination={{
              current: membersQuery.data.pagination.page,
              pageSize: membersQuery.data.pagination.limit,
              total: membersQuery.data.pagination.totalItems,
              onChange: (nextPage, nextPageSize) => {
                updatePagination(nextPage, nextPageSize);
              },
            }}
            columns={[
              {
                title: 'Thành viên',
                render: (_, record) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{record.fullName}</Typography.Text>
                    <Typography.Text type="secondary">{record.email}</Typography.Text>
                  </Space>
                ),
              },
              { title: 'Mã thẻ', dataIndex: 'memberCardNo' },
              { title: 'Vai trò', render: (_, record) => getRoleLabel(record.role) },
              {
                title: 'Trạng thái',
                render: (_, record) => <StatusBadge status={record.status} />,
              },
              {
                title: 'Bị khóa',
                render: (_, record) => <Switch checked={record.isBlocked} disabled size="small" />,
              },
              {
                title: 'Ngày tham gia',
                render: (_, record) => formatDate(record.joinDate),
              },
              {
                title: 'Thao tác',
                render: (_, record) => (
                  <Space>
                    <Button icon={<EyeOutlined />} onClick={() => navigate(`/members/${record._id}`)} />
                    <Button icon={<EditOutlined />} onClick={() => navigate(`/members/${record._id}/edit`)} />
                    {record.status !== MemberStatus.Suspended ? (
                      <Popconfirm title="Tạm khóa thành viên này?" okText="Đồng ý" cancelText="Hủy" onConfirm={() => suspendMutation.mutate(record._id)}>
                        <Button icon={<PauseCircleOutlined />} />
                      </Popconfirm>
                    ) : (
                      <Popconfirm title="Kích hoạt lại thành viên này?" okText="Đồng ý" cancelText="Hủy" onConfirm={() => activateMutation.mutate(record._id)}>
                        <Button icon={<PlayCircleOutlined />} />
                      </Popconfirm>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="Không có thành viên phù hợp với bộ lọc hiện tại." />
        )}
      </Card>
    </Space>
  );
}
