import {
  AppstoreOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TagsOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Empty, Form, Input, Modal, Popconfirm, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { primaryActionButtonClass } from '../../components/AdminSurface';
import { useDebounce } from '../../hooks/useDebounce';
import { catalogApi } from '../../services/catalog.api';
import { useNotificationsStore } from '../../store/notifications.store';
import type { CategoryListItem } from '../../types/models';
import { extractErrorMessage } from '../../utils/format';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose';
  helper: string;
}

interface CategoryFormValues {
  name: string;
}

const toneClassMap: Record<StatCardProps['tone'], { icon: string; accent: string }> = {
  indigo: {
    icon: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
    accent: 'text-indigo-600',
  },
  emerald: {
    icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    accent: 'text-emerald-600',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-600 ring-amber-100',
    accent: 'text-amber-600',
  },
  rose: {
    icon: 'bg-rose-50 text-rose-600 ring-rose-100',
    accent: 'text-rose-600',
  },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function getVisiblePages(currentPage: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sortedPages = [...pages].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];

  sortedPages.forEach((pageNumber, index) => {
    const previous = sortedPages[index - 1];

    if (previous && pageNumber - previous > 1) {
      result.push('ellipsis');
    }

    result.push(pageNumber);
  });

  return result;
}

function StatCard({ icon, label, value, tone, helper }: StatCardProps) {
  const toneClasses = toneClassMap[tone];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-5">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl ring-8 ${toneClasses.icon}`}>{icon}</span>
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
          <p className="m-0 mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(value)}</p>
          <p className={`m-0 mt-2 text-xs font-semibold ${toneClasses.accent}`}>{helper}</p>
        </div>
      </div>
    </section>
  );
}

function CategoryStatus({ category }: { category: CategoryListItem }) {
  if (category.count === 0) {
    return <span className="inline-flex rounded-lg bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-600">Chưa dùng</span>;
  }

  return <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-600">Đang dùng</span>;
}

export default function CategoryListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [form] = Form.useForm<CategoryFormValues>();
  const [editingCategory, setEditingCategory] = useState<CategoryListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const q = searchParams.get('q') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '10');
  const debouncedQuery = useDebounce(q, 300);

  const categoriesQuery = useQuery({
    queryKey: ['catalog', 'categories'],
    queryFn: () => catalogApi.listCategories(),
  });

  const categories = categoriesQuery.data ?? [];
  const filteredCategories = useMemo(() => {
    const keyword = debouncedQuery.trim().toLowerCase();

    if (!keyword) {
      return categories;
    }

    return categories.filter((category) => category.name.toLowerCase().includes(keyword));
  }, [categories, debouncedQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / limit));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const visiblePages = useMemo(() => getVisiblePages(safePage, totalPages), [safePage, totalPages]);
  const pagedCategories = filteredCategories.slice((safePage - 1) * limit, safePage * limit);
  const startItem = filteredCategories.length > 0 ? (safePage - 1) * limit + 1 : 0;
  const endItem = Math.min(safePage * limit, filteredCategories.length);
  const usedCount = categories.filter((category) => category.count > 0).length;
  const emptyCount = categories.length - usedCount;
  const totalBookLinks = categories.reduce((sum, category) => sum + category.count, 0);

  const createMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => catalogApi.createCategory({ name: values.name.trim() }),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã tạo danh mục' });
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'facets'] });
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể tạo danh mục', description: extractErrorMessage(error) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: CategoryFormValues) => {
      if (!editingCategory) {
        throw new Error('Missing category');
      }

      return catalogApi.updateCategory(editingCategory._id, { name: values.name.trim() });
    },
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã cập nhật danh mục' });
      closeModal();
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'facets'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'books'] });
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể cập nhật danh mục', description: extractErrorMessage(error) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => catalogApi.deleteCategory(categoryId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã xóa danh mục' });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'categories'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'facets'] });
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể xóa danh mục', description: extractErrorMessage(error) });
    },
  });

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams);

    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }

    if (key !== 'page') {
      next.set('page', '1');
    }

    setSearchParams(next);
  };

  const updatePagination = (nextPage: number, nextLimit = limit) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    next.set('limit', String(nextLimit));
    setSearchParams(next);
  };

  const resetFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.set('page', '1');
    next.set('limit', String(limit));
    setSearchParams(next);
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (category: CategoryListItem) => {
    setEditingCategory(category);
    form.setFieldsValue({ name: category.name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    form.resetFields();
  };

  const submitForm = (values: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate(values);
      return;
    }

    createMutation.mutate(values);
  };

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <button
          type="button"
          className={primaryActionButtonClass}
          onClick={openCreateModal}
        >
          <PlusOutlined />
          Thêm danh mục
        </button>
      </div>

      <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={<AppstoreOutlined />} label="Tổng danh mục" value={categories.length} tone="indigo" helper="Danh mục trong hệ thống" />
        <StatCard icon={<CheckCircleOutlined />} label="Đang sử dụng" value={usedCount} tone="emerald" helper="Có ít nhất một đầu sách" />
        <StatCard icon={<FolderOpenOutlined />} label="Chưa dùng" value={emptyCount} tone="amber" helper="Có thể xóa an toàn" />
        <StatCard icon={<TagsOutlined />} label="Liên kết sách" value={totalBookLinks} tone="rose" helper="Tổng lượt gắn danh mục" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_auto]">
          <label className="relative block">
            <span className="sr-only">Tìm danh mục</span>
            <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#3157ff] focus:ring-4 focus:ring-blue-100"
              placeholder="Tìm theo tên danh mục..."
              type="search"
              value={q}
              onChange={(event) => updateParam('q', event.target.value)}
            />
          </label>

          <button
            type="button"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:border-[#3157ff] hover:text-[#3157ff]"
            onClick={resetFilters}
          >
            <ReloadOutlined />
            Đặt lại
          </button>
        </div>
      </section>

      {categoriesQuery.isError ? (
        <Alert message="Không thể tải danh mục" description="Kiểm tra lại kết nối API hoặc quyền truy cập quản trị." type="error" showIcon />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs font-extrabold text-slate-600">
                <th className="px-5 py-4">Tên danh mục</th>
                <th className="px-5 py-4">Số đầu sách</th>
                <th className="px-5 py-4">Tỷ trọng</th>
                <th className="px-5 py-4">Trạng thái</th>
                <th className="px-5 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pagedCategories.map((category) => {
                const percent = totalBookLinks > 0 ? Math.round((category.count / totalBookLinks) * 100) : 0;

                return (
                  <tr className="border-b border-slate-100 transition last:border-b-0 hover:bg-slate-50" key={category._id}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-lg text-indigo-600">
                          <AppstoreOutlined />
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 font-extrabold text-slate-950">{category.name}</p>
                          <p className="m-0 mt-0.5 text-xs font-semibold text-slate-500">ID: {category._id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-slate-900">{formatNumber(category.count)}</td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-[150px] items-center gap-3">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-[#3157ff]" style={{ width: `${percent}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs font-extrabold text-slate-500">{percent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <CategoryStatus category={category} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Tooltip title="Lọc sách theo danh mục">
                          <Link
                            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-[#3157ff] hover:text-[#3157ff]"
                            to={`/catalog?category=${category._id}`}
                          >
                            <SearchOutlined />
                          </Link>
                        </Tooltip>
                        <Tooltip title="Chỉnh sửa">
                          <button
                            type="button"
                            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-[#3157ff] hover:text-[#3157ff]"
                            onClick={() => openEditModal(category)}
                          >
                            <EditOutlined />
                          </button>
                        </Tooltip>
                        {category.canDelete ? (
                          <Popconfirm
                            title="Xóa danh mục"
                            description="Danh mục này chưa được gắn với sách nào."
                            okText="Xóa"
                            cancelText="Hủy"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => deleteMutation.mutate(category._id)}
                          >
                            <Tooltip title="Xóa">
                              <button
                                type="button"
                                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
                              >
                                <DeleteOutlined />
                              </button>
                            </Tooltip>
                          </Popconfirm>
                        ) : (
                          <Tooltip title="Không thể xóa danh mục đang được sử dụng">
                            <button
                              type="button"
                              disabled
                              className="grid h-10 w-10 cursor-not-allowed place-items-center rounded-xl border border-slate-200 text-slate-300"
                            >
                              <DeleteOutlined />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!categoriesQuery.isLoading && pagedCategories.length === 0 ? (
          <div className="py-14">
            <Empty description="Không có danh mục phù hợp" />
          </div>
        ) : null}

        <div className="flex flex-col gap-4 border-t border-slate-200 px-5 py-4 text-sm font-semibold text-slate-600 lg:flex-row lg:items-center lg:justify-between">
          <span>
            Hiển thị {startItem} đến {endItem} trong tổng số {formatNumber(filteredCategories.length)} danh mục
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <select
              className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 outline-none focus:border-[#3157ff] focus:ring-4 focus:ring-blue-100"
              value={limit}
              onChange={(event) => updatePagination(1, Number(event.target.value))}
            >
              {[10, 20, 50].map((pageSize) => (
                <option value={pageSize} key={pageSize}>
                  {pageSize} / trang
                </option>
              ))}
            </select>

            <button
              type="button"
              className="h-10 min-w-10 rounded-xl border border-slate-200 bg-white px-3 font-extrabold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={safePage <= 1}
              onClick={() => updatePagination(safePage - 1)}
            >
              &lt;
            </button>

            {visiblePages.map((pageItem, index) =>
              pageItem === 'ellipsis' ? (
                <span className="px-2 font-extrabold text-slate-400" key={`ellipsis-${index}`}>
                  ...
                </span>
              ) : (
                <button
                  type="button"
                  className={`h-10 min-w-10 rounded-xl px-3 font-extrabold transition ${
                    pageItem === safePage
                      ? 'bg-[#3157ff] text-white shadow-[0_10px_20px_rgba(49,87,255,0.28)]'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-[#3157ff] hover:text-[#3157ff]'
                  }`}
                  onClick={() => updatePagination(pageItem)}
                  key={pageItem}
                >
                  {pageItem}
                </button>
              ),
            )}

            <button
              type="button"
              className="h-10 min-w-10 rounded-xl border border-slate-200 bg-white px-3 font-extrabold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={safePage >= totalPages}
              onClick={() => updatePagination(safePage + 1)}
            >
              &gt;
            </button>
          </div>
        </div>
      </section>

      <Modal
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục'}
        open={isModalOpen}
        onCancel={closeModal}
        onOk={() => form.submit()}
        okText={editingCategory ? 'Lưu thay đổi' : 'Tạo danh mục'}
        cancelText="Hủy"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={submitForm} requiredMark={false}>
          <Form.Item
            name="name"
            label="Tên danh mục"
            rules={[
              { required: true, message: 'Nhập tên danh mục' },
              { max: 100, message: 'Tên danh mục tối đa 100 ký tự' },
            ]}
          >
            <Input placeholder="Ví dụ: Văn học, Kỹ năng sống..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
