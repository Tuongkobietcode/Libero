import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Descriptions, Empty, Form, Input, InputNumber, Row, Select, Space, Table, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { StatusBadge } from '../../components/StatusBadge';
import { catalogApi } from '../../services/catalog.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { CopyStatus } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { formatCurrency, formatDate, formatDateTime, formatList } from '../../utils/format';

export default function BookDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [addCopiesForm] = Form.useForm<{ count: number; shelfLocation?: string }>();
  const bookQuery = useQuery({
    queryKey: ['catalog', 'book', id],
    enabled: Boolean(id),
    queryFn: () => catalogApi.getBook(id),
  });

  const addCopiesMutation = useMutation({
    mutationFn: (values: { count: number; shelfLocation?: string }) => catalogApi.addCopies(id, values),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã thêm bản sao', description: 'Các bản sao mới đã được tạo cho đầu sách này.' });
      addCopiesForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'book', id] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'books'] });
    },
  });

  const updateCopyStatusMutation = useMutation({
    mutationFn: ({ copyId, status }: { copyId: string; status: CopyStatus }) => catalogApi.updateCopyStatus(copyId, status),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã cập nhật trạng thái bản sao' });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'book', id] });
    },
  });

  const book = bookQuery.data;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ marginBottom: 0 }}>
            {book?.title ?? 'Chi tiết sách'}
          </Typography.Title>
          <Typography.Text type="secondary">Xem thông tin biên mục, trạng thái bản sao và thao tác kho nhanh.</Typography.Text>
        </div>
        <Button onClick={() => navigate(`/catalog/${id}/edit`)}>Chỉnh sửa sách</Button>
      </Space>

      {bookQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải chi tiết sách" description={(bookQuery.error as Error).message} />
      ) : null}

      {book ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={16}>
              <Card title="Thông tin sách">
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="ISBN">{book.isbn}</Descriptions.Item>
                  <Descriptions.Item label="Giá trị sách">{formatCurrency(book.bookValue)}</Descriptions.Item>
                  <Descriptions.Item label="Tác giả">{formatList(book.authors)}</Descriptions.Item>
                  <Descriptions.Item label="Danh mục">{formatList(book.categories)}</Descriptions.Item>
                  <Descriptions.Item label="Nhà xuất bản">{book.publisher ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="Năm xuất bản">{book.publishYear ?? '-'}</Descriptions.Item>
                  <Descriptions.Item label="Bản sao">{`${book.availableCopies}/${book.totalCopies} còn sẵn`}</Descriptions.Item>
                  <Descriptions.Item label="Cập nhật">{formatDate(book.updatedAt)}</Descriptions.Item>
                  <Descriptions.Item label="Mô tả" span={2}>
                    {book.description ?? 'Chưa có mô tả'}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col xs={24} xl={8}>
              <Card title="Thêm bản sao">
                <Form form={addCopiesForm} layout="vertical" onFinish={(values) => addCopiesMutation.mutate(values)}>
                  <Form.Item label="Số lượng" name="count" rules={[{ required: true, type: 'number', min: 1 }]}>
                    <InputNumber min={1} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label="Vị trí kệ" name="shelfLocation">
                    <Input placeholder="A1" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={addCopiesMutation.isPending} block>
                    Tạo bản sao
                  </Button>
                </Form>
              </Card>
            </Col>
          </Row>

          <Card title="Danh sách bản sao">
            {book.copies.length ? (
              <Table
                size="small"
                rowKey="_id"
                pagination={false}
                dataSource={book.copies}
                columns={[
                  { title: 'Mã vạch', dataIndex: 'barcode' },
                  {
                    title: 'Trạng thái',
                    render: (_, record) => <StatusBadge status={record.status} />,
                  },
                  {
                    title: 'Kệ',
                    render: (_, record) => record.shelfLocation ?? '-',
                  },
                  {
                    title: 'Hạn trả hiện tại',
                    render: (_, record) => formatDate(record.currentDueDate),
                  },
                  {
                    title: 'Tình trạng mượn',
                    render: (_, record) =>
                      record.currentLoanStatus ? <StatusBadge status={record.currentLoanStatus} /> : '-',
                  },
                  {
                    title: 'Ngày nhập',
                    render: (_, record) => formatDateTime(record.acquiredDate),
                  },
                  {
                    title: 'Đổi trạng thái',
                    render: (_, record) => (
                      <Select
                        size="small"
                        value={record.status}
                        style={{ width: 140 }}
                        onChange={(status) =>
                          updateCopyStatusMutation.mutate({
                            copyId: record._id,
                            status,
                          })
                        }
                        options={Object.values(CopyStatus).map((status) => ({
                          label: getStatusLabel(status),
                          value: status,
                        }))}
                      />
                    ),
                  },
                ]}
              />
            ) : (
              <Empty description="Chưa có bản sao nào cho đầu sách này" />
            )}
          </Card>
        </>
      ) : null}
    </Space>
  );
}
