import { DeleteOutlined, EditOutlined, EyeOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Empty, Input, Popconfirm, Row, Select, Space, Typography } from 'antd';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { DataTable } from '../../components/DataTable';
import { catalogApi } from '../../services/catalog.api';
import { useDebounce } from '../../hooks/useDebounce';
import { useNotificationsStore } from '../../store/notifications.store';
import { formatDate, formatList } from '../../utils/format';

export default function BookListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const search = searchParams.get('q') ?? '';
  const available = searchParams.get('available') ?? 'all';
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '20');
  const debouncedSearch = useDebounce(search, 400);

  const booksQuery = useQuery({
    queryKey: ['catalog', 'books', debouncedSearch, available, page, limit],
    queryFn: () =>
      catalogApi.listBooks({
        q: debouncedSearch || undefined,
        available: available === 'all' ? undefined : available === 'available',
        page,
        limit,
      }),
  });

  const deleteBookMutation = useMutation({
    mutationFn: (bookId: string) => catalogApi.deleteBook(bookId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã lưu trữ sách', description: 'Sách đã được xóa mềm khỏi danh mục đang hoạt động.' });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'books'] });
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
          Danh mục sách
        </Typography.Title>
        <Typography.Text type="secondary">Tìm kiếm, xem chi tiết, chỉnh sửa và lưu trữ sách trong kho thư viện.</Typography.Text>
      </div>

      <Card>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={10}>
            <Input.Search
              placeholder="Tìm theo tên sách hoặc ISBN"
              allowClear
              value={search}
              onChange={(event) => updateParam('q', event.target.value)}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: '100%' }}
              value={available}
              onChange={(value) => updateParam('available', value)}
              options={[
                { label: 'Tất cả trạng thái', value: 'all' },
                { label: 'Chỉ sách còn sẵn', value: 'available' },
                { label: 'Sách hiện không sẵn', value: 'unavailable' },
              ]}
            />
          </Col>
          <Col xs={24} md={8}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button icon={<UploadOutlined />} onClick={() => navigate('/catalog/import')}>
                Nhập CSV
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/catalog/new')}>
                Thêm sách
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {booksQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải danh sách sách" description={(booksQuery.error as Error).message} />
      ) : null}

      <Card>
        {booksQuery.data?.items.length ? (
          <DataTable
            rowKey="_id"
            loading={booksQuery.isLoading}
            dataSource={booksQuery.data.items}
            pagination={{
              current: booksQuery.data.pagination.page,
              pageSize: booksQuery.data.pagination.limit,
              total: booksQuery.data.pagination.totalItems,
              onChange: (nextPage, nextPageSize) => {
                updatePagination(nextPage, nextPageSize);
              },
            }}
            columns={[
              {
                title: 'Tên sách',
                dataIndex: 'title',
                render: (_, record) => <Link to={`/catalog/${record._id}`}>{record.title}</Link>,
              },
              {
                title: 'ISBN',
                dataIndex: 'isbn',
              },
              {
                title: 'Tác giả',
                render: (_, record) => formatList(record.authors),
              },
              {
                title: 'Danh mục',
                render: (_, record) => formatList(record.categories),
              },
              {
                title: 'Bản sao',
                render: (_, record) => `${record.availableCopies}/${record.totalCopies}`,
              },
              {
                title: 'Cập nhật',
                render: (_, record) => formatDate(record.updatedAt),
              },
              {
                title: 'Thao tác',
                render: (_, record) => (
                  <Space>
                    <Button icon={<EyeOutlined />} onClick={() => navigate(`/catalog/${record._id}`)} />
                    <Button icon={<EditOutlined />} onClick={() => navigate(`/catalog/${record._id}/edit`)} />
                    <Popconfirm
                      title="Lưu trữ sách này?"
                      description="Sách vẫn còn trong hệ thống nhưng sẽ không xuất hiện trong danh mục hoạt động."
                      onConfirm={() => deleteBookMutation.mutate(record._id)}
                      okText="Đồng ý"
                      cancelText="Hủy"
                    >
                      <Button danger icon={<DeleteOutlined />} loading={deleteBookMutation.isPending} />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
        ) : (
          <Empty description="Không có sách phù hợp với bộ lọc hiện tại." />
        )}
      </Card>
    </Space>
  );
}
