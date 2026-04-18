import { DollarOutlined, SearchOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Empty, Input, Modal, Row, Select, Space, Typography } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { useMemo, useState } from 'react';

import { DataTable } from '../../components/DataTable';
import { StatusBadge } from '../../components/StatusBadge';
import { fineApi } from '../../services/fine.api';
import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { FineStatus } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatCurrency, formatDate } from '../../utils/format';

export default function FineManagerPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [memberCardNo, setMemberCardNo] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [status, setStatus] = useState<FineStatus | undefined>();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selectedFineIds, setSelectedFineIds] = useState<string[]>([]);
  const [waiveReason, setWaiveReason] = useState('');
  const [waiveFineId, setWaiveFineId] = useState<string | null>(null);

  const finesQuery = useQuery({
    queryKey: ['fines', selectedMemberId, status, page, limit],
    queryFn: () =>
      fineApi.listFines({
        memberId: selectedMemberId,
        status,
        page,
        limit,
      }),
  });

  const searchMemberMutation = useMutation({
    mutationFn: async (cardNo: string) => {
      const response = await memberApi.listMembers({ memberCardNo: cardNo, limit: 1, page: 1 });
      return response.items[0] ?? null;
    },
    onSuccess: (member) => {
      setSelectedMemberId(member?._id);

      if (member) {
        notify({
          level: 'info',
          message: 'Đã áp dụng bộ lọc thành viên',
          description: `${member.fullName} hiện là bộ lọc tiền phạt đang dùng.`,
        });
        return;
      }

      notify({
        level: 'warning',
        message: 'Không tìm thấy thành viên',
        description: 'Bộ lọc thành viên đã được xóa và danh sách tiền phạt đang hiển thị toàn bộ.',
      });
    },
  });

  const payMutation = useMutation({
    mutationFn: () => fineApi.payFines(selectedFineIds),
    onSuccess: (result) => {
      notify({
        level: 'success',
        message: 'Đã thanh toán tiền phạt',
        description: `${result.updatedCount} khoản phạt đã được đánh dấu thanh toán.`,
      });
      setSelectedFineIds([]);
      void queryClient.invalidateQueries({ queryKey: ['fines'] });
    },
  });

  const waiveMutation = useMutation({
    mutationFn: async () => {
      if (!waiveFineId) {
        throw new Error('Chưa chọn khoản phạt để miễn.');
      }

      return fineApi.waiveFine(waiveFineId, waiveReason);
    },
    onSuccess: () => {
      notify({
        level: 'success',
        message: 'Đã miễn tiền phạt',
      });
      setWaiveFineId(null);
      setWaiveReason('');
      void queryClient.invalidateQueries({ queryKey: ['fines'] });
    },
  });

  const selectedRowsArePayable = useMemo(
    () =>
      selectedFineIds.every((fineId) =>
        finesQuery.data?.items.find((item) => item._id === fineId)?.status === FineStatus.Unpaid,
      ),
    [finesQuery.data?.items, selectedFineIds],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Quản lý tiền phạt
        </Typography.Title>
        <Typography.Text type="secondary">Tìm theo thành viên, xem công nợ và xử lý thanh toán hoặc miễn phạt.</Typography.Text>
      </div>

      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Input.Search
              allowClear
              value={memberCardNo}
              placeholder="Tìm thành viên theo mã thẻ"
              enterButton={<SearchOutlined />}
              onChange={(event) => setMemberCardNo(event.target.value)}
              onSearch={(value) => searchMemberMutation.mutate(value.trim())}
              loading={searchMemberMutation.isPending}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              allowClear
              value={status}
              style={{ width: '100%' }}
              placeholder="Lọc theo trạng thái"
              onChange={(value) => setStatus(value)}
              options={Object.values(FineStatus).map((value) => ({ label: getStatusLabel(value), value }))}
            />
          </Col>
          <Col xs={24} md={8}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                icon={<DollarOutlined />}
                type="primary"
                disabled={!selectedFineIds.length || !selectedRowsArePayable}
                loading={payMutation.isPending}
                onClick={() => payMutation.mutate()}
              >
                Thanh toán mục đã chọn
              </Button>
              <Button onClick={() => setSelectedMemberId(undefined)}>Xóa lọc thành viên</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {finesQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải danh sách tiền phạt" description={(finesQuery.error as Error).message} />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card title="Tổng chưa thanh toán">{formatCurrency(finesQuery.data?.summary.unpaidTotal)}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Tổng đã thanh toán">{formatCurrency(finesQuery.data?.summary.paidTotal)}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Tổng đã miễn">{formatCurrency(finesQuery.data?.summary.waivedTotal)}</Card>
        </Col>
      </Row>

      <Card>
        {finesQuery.data?.items.length ? (
          <DataTable
            rowKey="_id"
            loading={finesQuery.isLoading}
            dataSource={finesQuery.data.items}
            rowSelection={{
              selectedRowKeys: selectedFineIds,
              onChange: (keys) => setSelectedFineIds(keys as string[]),
            }}
            pagination={{
              current: finesQuery.data.pagination.page,
              pageSize: finesQuery.data.pagination.limit,
              total: finesQuery.data.pagination.totalItems,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setLimit(nextPageSize);
              },
            }}
            columns={[
              {
                title: 'Thành viên',
                render: (_, record) => record.member.fullName,
              },
              {
                title: 'Sách',
                render: (_, record) => record.book.title,
              },
              {
                title: 'Ngày quá hạn',
                render: (_, record) => formatDate(record.overdueDate),
              },
              {
                title: 'Số tiền',
                render: (_, record) => formatCurrency(record.amount),
              },
              {
                title: 'Trạng thái',
                render: (_, record) => <StatusBadge status={record.status} />,
              },
              {
                title: 'Thao tác',
                render: (_, record) => (
                  <Button disabled={record.status !== FineStatus.Unpaid} onClick={() => setWaiveFineId(record._id)}>
                    Miễn phạt
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="Không có khoản phạt phù hợp với bộ lọc hiện tại." />
        )}
      </Card>

      <Modal
        title="Miễn tiền phạt"
        open={Boolean(waiveFineId)}
        confirmLoading={waiveMutation.isPending}
        onCancel={() => setWaiveFineId(null)}
        onOk={() => waiveMutation.mutate()}
        okText="Xác nhận"
        cancelText="Hủy"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary">Vui lòng nhập lý do rõ ràng trước khi miễn khoản phạt này.</Typography.Text>
          <TextArea rows={4} value={waiveReason} onChange={(event) => setWaiveReason(event.target.value)} />
          {waiveMutation.isError ? (
            <Alert type="error" showIcon message={extractErrorMessage(waiveMutation.error, 'Không thể miễn tiền phạt')} />
          ) : null}
        </Space>
      </Modal>
    </Space>
  );
}
