import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Card, DatePicker, Form, Input, InputNumber, Select, Space, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { catalogApi } from '../../services/catalog.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { extractErrorMessage } from '../../utils/format';

interface BookFormValues {
  isbn: string;
  title: string;
  authors: string[];
  categories: string[];
  bookValue?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  quantity?: number;
  shelfLocation?: string;
  acquiredDate?: dayjs.Dayjs;
}

export default function BookFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const isEdit = Boolean(id);
  const [form] = Form.useForm<BookFormValues>();

  const bookQuery = useQuery({
    queryKey: ['catalog', 'book', id],
    enabled: Boolean(id),
    queryFn: () => catalogApi.getBook(id!),
  });

  const saveMutation = useMutation({
    mutationFn: async (values: BookFormValues) => {
      const payload = {
        ...values,
        acquiredDate: values.acquiredDate?.toISOString(),
      };

      if (isEdit) {
        return catalogApi.updateBook(id!, payload);
      }

      return catalogApi.createBook({
        ...payload,
        quantity: values.quantity ?? 1,
      });
    },
    onSuccess: (book) => {
      notify({
        level: 'success',
        message: isEdit ? 'Đã cập nhật sách' : 'Đã tạo sách',
        description: `${book.title} đã sẵn sàng trong danh mục.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'books'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'book', book._id] });
      navigate(`/catalog/${book._id}`);
    },
  });

  const book = bookQuery.data;

  useEffect(() => {
    if (!book) {
      return;
    }

    form.setFieldsValue({
      isbn: book.isbn,
      title: book.title,
      authors: book.authors.map((author) => author.name),
      categories: book.categories.map((category) => category.name),
      bookValue: book.bookValue,
      publisher: book.publisher,
      publishYear: book.publishYear,
      description: book.description,
      coverImage: book.coverImage,
    });
  }, [book, form]);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Typography.Title level={2} style={{ marginBottom: 0 }}>
          {isEdit ? 'Chỉnh sửa sách' : 'Thêm sách'}
        </Typography.Title>
        <Typography.Text type="secondary">
          Cập nhật thông tin biên mục và số lượng bản sao ban đầu ngay trong giao diện quản trị.
        </Typography.Text>
      </div>

      {bookQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải thông tin sách" description={(bookQuery.error as Error).message} />
      ) : null}

      <Card>
        <Form<BookFormValues>
          form={form}
          layout="vertical"
          initialValues={
            book
              ? {
                  ...book,
                  authors: book.authors.map((author) => author.name),
                  categories: book.categories.map((category) => category.name),
                  acquiredDate: undefined,
                }
              : {
                  authors: [],
                  categories: [],
                  quantity: 1,
                }
          }
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Form.Item label="Tên sách" name="title" rules={[{ required: true }]}>
              <Input placeholder="Nhập tên sách" />
            </Form.Item>
            <Form.Item label="ISBN" name="isbn" rules={[{ required: true }]}>
              <Input placeholder="9781234567890" />
            </Form.Item>
            <Form.Item label="Tác giả" name="authors" rules={[{ required: true }]}>
              <Select mode="tags" placeholder="Nhập tên tác giả và nhấn Enter" />
            </Form.Item>
            <Form.Item label="Danh mục" name="categories" rules={[{ required: true }]}>
              <Select mode="tags" placeholder="Nhập tên danh mục và nhấn Enter" />
            </Form.Item>
            <Form.Item label="Giá trị sách" name="bookValue">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Nhà xuất bản" name="publisher">
              <Input />
            </Form.Item>
            <Form.Item label="Năm xuất bản" name="publishYear">
              <InputNumber min={0} max={3000} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Mô tả" name="description">
              <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item label="URL ảnh bìa" name="coverImage">
              <Input />
            </Form.Item>
            {!isEdit ? (
              <>
                <Form.Item label="Số lượng ban đầu" name="quantity" rules={[{ required: true }]}>
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="Vị trí kệ" name="shelfLocation">
                  <Input placeholder="A1" />
                </Form.Item>
                <Form.Item label="Ngày nhập" name="acquiredDate">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </>
            ) : null}
            {saveMutation.isError ? (
              <Alert type="error" showIcon message={extractErrorMessage(saveMutation.error, 'Không thể lưu sách')} />
            ) : null}
            <Space>
              <Button onClick={() => navigate(isEdit ? `/catalog/${id}` : '/catalog')}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
                {isEdit ? 'Lưu thay đổi' : 'Tạo sách'}
              </Button>
            </Space>
          </Space>
        </Form>
      </Card>
    </Space>
  );
}
