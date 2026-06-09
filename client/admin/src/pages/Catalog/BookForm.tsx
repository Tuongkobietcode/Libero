import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, DatePicker, Form, Input, InputNumber, Select, Upload } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminPanel, AdminStack, primaryButtonClass, secondaryButtonClass } from '../../components/AdminSurface';
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
  const coverImage = Form.useWatch('coverImage', form);

  const categoriesQuery = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: catalogApi.listCategories,
  });

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
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'facets'] });
      navigate(`/catalog/${book._id}`);
    },
  });

  const uploadCoverMutation = useMutation({
    mutationFn: (file: File) => catalogApi.uploadCoverImage(file),
    onSuccess: (result) => {
      form.setFieldsValue({ coverImage: result.coverImage });
      notify({
        level: 'success',
        message: 'Đã tải ảnh bìa',
        description: 'Ảnh bìa sẽ được lưu cùng thông tin sách.',
      });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: 'Không thể tải ảnh bìa',
        description: extractErrorMessage(error, 'Vui lòng kiểm tra định dạng và dung lượng ảnh.'),
      });
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
      categories: book.categories.map((category) => category._id),
      bookValue: book.bookValue,
      publisher: book.publisher,
      publishYear: book.publishYear,
      description: book.description,
      coverImage: book.coverImage,
    });
  }, [book, form]);

  return (
    <AdminStack>
      {bookQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải thông tin sách" description={(bookQuery.error as Error).message} />
      ) : null}

      {categoriesQuery.isError ? (
        <Alert type="error" showIcon message="Không thể tải danh mục" description={(categoriesQuery.error as Error).message} />
      ) : null}

      {!categoriesQuery.isLoading && !categoriesQuery.isError && !categoriesQuery.data?.length ? (
        <Alert
          type="warning"
          showIcon
          message="Chưa có danh mục"
          description="Hãy tạo danh mục trước, sau đó quay lại gán danh mục cho sách."
        />
      ) : null}

      <AdminPanel title="Thông tin biên mục" description="Cập nhật metadata sách và bản sao ban đầu theo cùng một biểu mẫu.">
        <Form<BookFormValues>
          form={form}
          layout="vertical"
          initialValues={{ authors: [], categories: [], quantity: 1 }}
          onFinish={(values) => saveMutation.mutate(values)}
        >
          <div className="grid gap-x-5 md:grid-cols-2">
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
              <Select
                mode="multiple"
                loading={categoriesQuery.isLoading}
                disabled={categoriesQuery.isLoading || !categoriesQuery.data?.length}
                showSearch
                optionFilterProp="label"
                placeholder="Chọn danh mục đã có"
                options={(categoriesQuery.data ?? []).map((category) => ({
                  label: category.name,
                  value: category._id,
                }))}
              />
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
            <Form.Item label="Ảnh bìa sách" className="md:col-span-2">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                {coverImage ? (
                  <img src={coverImage} alt="Ảnh bìa sách" className="h-28 w-20 rounded-lg object-cover shadow-sm" />
                ) : (
                  <div className="grid h-28 w-20 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs font-semibold text-slate-400">
                    Chưa có ảnh
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Upload
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    maxCount={1}
                    showUploadList={false}
                    beforeUpload={(file) => {
                      uploadCoverMutation.mutate(file as File);
                      return false;
                    }}
                  >
                    <button className={secondaryButtonClass} type="button" disabled={uploadCoverMutation.isPending}>
                      {uploadCoverMutation.isPending ? 'Đang tải ảnh...' : 'Chọn ảnh từ máy'}
                    </button>
                  </Upload>
                  <p className="m-0 mt-2 text-sm font-semibold text-slate-500">Hỗ trợ PNG, JPG, WEBP hoặc GIF, tối đa 5MB.</p>
                </div>
              </div>
            </Form.Item>
            <Form.Item name="coverImage" hidden>
              <Input />
            </Form.Item>
            <Form.Item className="md:col-span-2" label="Mô tả" name="description">
              <Input.TextArea rows={4} />
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
          </div>

          {saveMutation.isError ? (
            <Alert type="error" showIcon message={extractErrorMessage(saveMutation.error, 'Không thể lưu sách')} />
          ) : null}

          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <button className={secondaryButtonClass} onClick={() => navigate(isEdit ? `/catalog/${id}` : '/catalog')} type="button">
              Hủy
            </button>
            <button className={primaryButtonClass} disabled={saveMutation.isPending} type="submit">
              {isEdit ? 'Lưu thay đổi' : 'Tạo sách'}
            </button>
          </div>
        </Form>
      </AdminPanel>
    </AdminStack>
  );
}
