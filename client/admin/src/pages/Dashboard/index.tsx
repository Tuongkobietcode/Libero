import { useQueries } from '@tanstack/react-query';
import { Alert, Card, Col, Empty, List, Row, Space, Table, Typography } from 'antd';

import { StatCard } from '../../components/StatCard';
import { StatusBadge } from '../../components/StatusBadge';
import { reportApi } from '../../services/report.api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function DashboardPage() {
  const [loanSummaryQuery, overdueQuery, popularBooksQuery, fineSummaryQuery] = useQueries({
    queries: [
      {
        queryKey: ['dashboard', 'loan-summary'],
        queryFn: () => reportApi.getLoanSummary({ groupBy: 'day' }),
      },
      {
        queryKey: ['dashboard', 'overdue'],
        queryFn: () => reportApi.getOverdueList({ page: 1, limit: 5, sort: 'overdueDays_desc' }),
      },
      {
        queryKey: ['dashboard', 'popular-books'],
        queryFn: () => reportApi.getPopularBooks({ limit: 5 }),
      },
      {
        queryKey: ['dashboard', 'fine-summary'],
        queryFn: () => reportApi.getFineSummary({}),
      },
    ],
  });

  const loading = [loanSummaryQuery, overdueQuery, popularBooksQuery, fineSummaryQuery].some((query) => query.isLoading);
  const error =
    loanSummaryQuery.error ??
    overdueQuery.error ??
    popularBooksQuery.error ??
    fineSummaryQuery.error;

  const totalLoans = (loanSummaryQuery.data ?? []).reduce((sum, item) => sum + item.totalLoans, 0);
  const overdueTotal = overdueQuery.data?.pagination.totalItems ?? 0;
  const unpaidTotal =
    fineSummaryQuery.data?.summary.find((item) => item.status === 'UNPAID')?.totalAmount ?? 0;
  const activeLoans = (loanSummaryQuery.data ?? []).reduce((sum, item) => sum + item.activeLoans, 0);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          Tổng quan
        </Typography.Title>
        <Typography.Text type="secondary">
          Toàn cảnh vận hành về lưu thông, các khoản quá hạn và mức phạt hiện tại.
        </Typography.Text>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể tải dữ liệu tổng quan"
          description={(error as Error).message}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <StatCard
            title="Lượt mượn trong kỳ"
            loading={loading}
            value={totalLoans}
            description="Tổng hợp từ báo cáo thống kê mượn trả."
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard
            title="Đang mượn"
            loading={loading}
            value={activeLoans}
            description="Tổng số phiếu mượn đang hoạt động trong phạm vi đã chọn."
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard
            title="Tài liệu quá hạn"
            loading={loading}
            value={overdueTotal}
            description="Số phiếu mượn hiện đang quá hạn."
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <StatCard
            title="Phạt chưa thanh toán"
            loading={loading}
            value={formatCurrency(unpaidTotal)}
            description="Tổng tiền phạt chưa thanh toán."
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={14}>
          <Card title="Danh sách xử lý quá hạn">
            {overdueQuery.data?.items.length ? (
              <Table
                size="small"
                rowKey="_id"
                pagination={false}
                dataSource={overdueQuery.data.items}
                columns={[
                  {
                    title: 'Thành viên',
                    dataIndex: ['member', 'fullName'],
                  },
                  {
                    title: 'Sách',
                    dataIndex: ['book', 'title'],
                  },
                  {
                    title: 'Hạn trả',
                    render: (_, record) => formatDate(record.dueDate),
                  },
                  {
                    title: 'Số ngày',
                    dataIndex: 'overdueDays',
                  },
                  {
                    title: 'Trạng thái',
                    render: (_, record) => <StatusBadge status={record.status} />,
                  },
                ]}
              />
            ) : (
              <Empty description="Không có phiếu mượn quá hạn" />
            )}
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card title="Sách mượn nhiều">
            {popularBooksQuery.data?.length ? (
              <List
                dataSource={popularBooksQuery.data}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={item.book.title}
                      description={`ISBN ${item.book.isbn}`}
                    />
                    <Typography.Text strong>{item.checkoutCount} lượt mượn</Typography.Text>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Chưa có dữ liệu lưu thông" />
            )}
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
