import {
  BookOutlined,
  CheckCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Empty, Tooltip } from 'antd';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { AdminSelect, primaryActionButtonClass } from '../../components/AdminSurface';
import { BookCoverArt } from '../../components/BookCoverArt';
import { catalogApi } from '../../services/catalog.api';
import { useDebounce } from '../../hooks/useDebounce';
import type { BookListItem } from '../../types/models';
import { formatList } from '../../utils/format';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value?: number;
  tone: 'indigo' | 'emerald' | 'amber' | 'rose';
  helper: string;
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

function formatNumber(value?: number): string {
  if (value === undefined) {
    return '...';
  }

  return new Intl.NumberFormat('vi-VN').format(value);
}

function getBookStatus(book: BookListItem): { label: string; className: string } {
  if (book.totalCopies === 0) {
    return {
      label: 'Chưa có bản',
      className: 'bg-slate-100 text-slate-600',
    };
  }

  if (book.availableCopies === 0) {
    return {
      label: 'Hết bản',
      className: 'bg-rose-50 text-rose-600',
    };
  }

  return {
    label: 'Hoạt động',
    className: 'bg-emerald-50 text-emerald-600',
  };
}

function BookCover({ book }: { book: BookListItem }) {
  return <BookCoverArt src={book.coverImage} title={book.title} seed={book._id} size="sm" />;
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
          <p className="m-0 mt-2 text-xs font-semibold text-slate-500">
            <span className={toneClasses.accent}>{helper}</span>
          </p>
        </div>
      </div>
    </section>
  );
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

export default function BookListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const search = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'all';
  const available = (searchParams.get('available') ?? 'all') as AvailabilityFilter;
  const page = Number(searchParams.get('page') ?? '1');
  const limit = Number(searchParams.get('limit') ?? '10');
  const debouncedSearch = useDebounce(search, 400);

  const booksQuery = useQuery({
    queryKey: ['catalog', 'books', debouncedSearch, category, available, page, limit],
    queryFn: () =>
      catalogApi.listBooks({
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(category !== 'all' ? { category } : {}),
        ...(available !== 'all' ? { available: available === 'available' } : {}),
        page,
        limit,
      }),
  });

  const facetsQuery = useQuery({
    queryKey: ['catalog', 'facets'],
    queryFn: () => catalogApi.getFacets(),
  });

  const totalBooksQuery = useQuery({
    queryKey: ['catalog', 'books', 'metrics', 'total'],
    queryFn: () => catalogApi.listBooks({ page: 1, limit: 1 }),
  });

  const availableBooksQuery = useQuery({
    queryKey: ['catalog', 'books', 'metrics', 'available'],
    queryFn: () => catalogApi.listBooks({ available: true, page: 1, limit: 1 }),
  });

  const unavailableBooksQuery = useQuery({
    queryKey: ['catalog', 'books', 'metrics', 'unavailable'],
    queryFn: () => catalogApi.listBooks({ available: false, page: 1, limit: 1 }),
  });

  const pagination = booksQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const items = booksQuery.data?.items ?? [];
  const startItem = pagination && pagination.totalItems > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.totalItems) : 0;
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

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

  const updatePagination = (nextPage: number, nextLimit = limit) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    next.set('limit', String(nextLimit));
    setSearchParams(next);
  };

  const openBookDetail = (bookId: string) => {
    navigate(`/catalog/${bookId}`);
  };

  const resetFilters = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('q');
    next.delete('category');
    next.delete('available');
    next.set('page', '1');
    next.set('limit', String(limit));
    setSearchParams(next);
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate('/catalog/import')}
            className={primaryActionButtonClass}
          >
            <UploadOutlined />
            Nhập CSV
          </button>
          <button
            type="button"
            onClick={() => navigate('/catalog/new')}
            className={primaryActionButtonClass}
          >
            <PlusOutlined />
            Thêm sách
            <DownOutlined className="text-xs opacity-80" />
          </button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={<BookOutlined />}
          label="Tổng đầu sách"
          value={totalBooksQuery.data?.pagination.totalItems}
          tone="indigo"
          helper="Từ API danh mục sách"
        />
        <StatCard
          icon={<CheckCircleOutlined />}
          label="Có bản sao sẵn"
          value={availableBooksQuery.data?.pagination.totalItems}
          tone="emerald"
          helper="Đầu sách còn mượn được"
        />
        <StatCard
          icon={<ExclamationCircleOutlined />}
          label="Hết bản sao"
          value={unavailableBooksQuery.data?.pagination.totalItems}
          tone="amber"
          helper="Không còn bản sẵn"
        />
        <StatCard
          icon={<StopOutlined />}
          label="Bản sao đang mượn"
          value={facetsQuery.data?.statuses.borrowing}
          tone="rose"
          helper="Tính từ trạng thái bản sao"
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1.2fr)_220px_220px_auto] xl:items-end">
          <label className="block">
            <span className="sr-only">Tìm theo tên sách, tác giả hoặc ISBN</span>
            <span className="relative block">
              <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              <input
                value={search}
                onChange={(event) => updateParam('q', event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                placeholder="Tìm theo tên sách, tác giả, ISBN..."
                type="search"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500">Danh mục</span>
            <AdminSelect
              value={category}
              onChange={(event) => updateParam('category', event.target.value)}
              wrapperClassName="w-full"
              className="h-11"
            >
              <option value="all">Tất cả danh mục</option>
              {facetsQuery.data?.categories.map((item) => (
                <option value={item._id} key={item._id}>
                  {item.name}
                </option>
              ))}
            </AdminSelect>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500">Tình trạng bản sao</span>
            <AdminSelect
              value={available}
              onChange={(event) => updateParam('available', event.target.value)}
              wrapperClassName="w-full"
              className="h-11"
            >
              <option value="all">Tất cả</option>
              <option value="available">Còn bản sẵn</option>
              <option value="unavailable">Hết bản sẵn</option>
            </AdminSelect>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
          >
            <ReloadOutlined />
            Đặt lại
          </button>
        </div>
      </section>

      {booksQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải danh sách sách" description={(booksQuery.error as Error).message} />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs font-extrabold text-slate-600">
                <th className="px-6 py-5">Ảnh bìa</th>
                <th className="px-5 py-5">Tên sách ↑</th>
                <th className="px-5 py-5">Tác giả</th>
                <th className="px-5 py-5">Danh mục</th>
                <th className="px-5 py-5">ISBN</th>
                <th className="px-5 py-5 text-center">Số bản sao</th>
                <th className="px-5 py-5 text-center">Có sẵn</th>
                <th className="px-5 py-5">Trạng thái</th>
                <th className="px-6 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {booksQuery.isLoading ? (
                Array.from({ length: limit }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 9 }).map((__, cellIndex) => (
                      <td className="px-5 py-5" key={cellIndex}>
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length ? (
                items.map((book) => {
                  const status = getBookStatus(book);

                  return (
                    <tr
                      className="cursor-pointer text-sm text-slate-700 transition hover:bg-slate-50/70 focus-within:bg-slate-50"
                      key={book._id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openBookDetail(book._id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openBookDetail(book._id);
                        }
                      }}
                    >
                      <td className="px-6 py-4">
                        <BookCover book={book} />
                      </td>
                      <td className="max-w-[260px] px-5 py-4">
                        <Link
                          to={`/catalog/${book._id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="block truncate text-sm font-extrabold text-slate-900 hover:text-indigo-600"
                        >
                          {book.title}
                        </Link>
                        <p className="m-0 mt-1 truncate text-xs font-semibold text-slate-500">{book.publisher ?? book.description ?? 'Chưa cập nhật mô tả'}</p>
                      </td>
                      <td className="max-w-[180px] px-5 py-4">
                        <span className="block truncate font-semibold">{formatList(book.authors)}</span>
                      </td>
                      <td className="max-w-[180px] px-5 py-4">
                        <span className="block truncate font-semibold">{formatList(book.categories)}</span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600">{book.isbn}</td>
                      <td className="px-5 py-4 text-center font-extrabold text-slate-900">{formatNumber(book.totalCopies)}</td>
                      <td className={`px-5 py-4 text-center font-extrabold ${book.availableCopies > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatNumber(book.availableCopies)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${status.className}`}>{status.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Tooltip title="Xem chi tiết">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openBookDetail(book._id);
                              }}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                              aria-label={`Xem ${book.title}`}
                            >
                              <EyeOutlined />
                            </button>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/catalog/${book._id}/edit`);
                              }}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                              aria-label={`Chỉnh sửa ${book.title}`}
                            >
                              <EditOutlined />
                            </button>
                          </Tooltip>
                          <Tooltip title="Thêm bản sao">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openBookDetail(book._id);
                              }}
                              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                              aria-label={`Thêm bản sao cho ${book.title}`}
                            >
                              <PlusOutlined />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : null}
            </tbody>
          </table>
        </div>

        {!booksQuery.isLoading && !items.length ? (
          <div className="px-6 py-16">
            <Empty description="Không có sách phù hợp với bộ lọc hiện tại." />
          </div>
        ) : null}

        {pagination ? (
          <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="m-0 text-sm font-semibold text-slate-500">
              Hiển thị {formatNumber(startItem)} đến {formatNumber(endItem)} trong tổng số {formatNumber(pagination.totalItems)} sách
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <AdminSelect
                value={limit}
                onChange={(event) => updatePagination(1, Number(event.target.value))}
                wrapperClassName="w-32"
              >
                {[10, 20, 50].map((pageSize) => (
                  <option value={pageSize} key={pageSize}>
                    {pageSize} / trang
                  </option>
                ))}
              </AdminSelect>

              <button
                type="button"
                disabled={page <= 1}
                onClick={() => updatePagination(page - 1)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Trang trước"
              >
                ‹
              </button>

              {visiblePages.map((pageItem, index) =>
                pageItem === 'ellipsis' ? (
                  <span className="grid h-11 w-8 place-items-center text-sm font-semibold text-slate-500" key={`ellipsis-${index}`}>
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => updatePagination(pageItem)}
                    className={[
                      'grid h-11 min-w-11 place-items-center rounded-xl px-3 text-sm font-semibold transition',
                      pageItem === page
                        ? 'bg-white !text-[#1677ff] shadow-[0_16px_36px_rgba(22,119,255,0.14)] ring-1 ring-blue-50'
                        : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600',
                    ].join(' ')}
                    key={pageItem}
                  >
                    {pageItem}
                  </button>
                ),
              )}

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => updatePagination(page + 1)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Trang sau"
              >
                ›
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
