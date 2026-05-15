import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  InboxOutlined,
  PlusCircleOutlined,
  SafetyOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, DatePicker, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Tooltip } from 'antd';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type dayjs from 'dayjs';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { primaryActionButtonClass } from '../../components/AdminSurface';
import { BookCoverArt } from '../../components/BookCoverArt';
import { catalogApi } from '../../services/catalog.api';
import { useNotificationsStore } from '../../store/notifications.store';
import type { BookCopyView, BookDetail } from '../../types/models';
import { CopyStatus } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatCurrency, formatDate, formatDateTime, formatList } from '../../utils/format';

interface AddCopiesFormValues {
  count: number;
  shelfLocation?: string;
  acquiredDate?: dayjs.Dayjs;
}

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  tone: 'indigo' | 'emerald' | 'blue' | 'amber' | 'rose';
}

interface DetailRowProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}

const metricToneClassMap: Record<MetricCardProps['tone'], string> = {
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
};

const copyStatusClassMap: Record<CopyStatus, string> = {
  [CopyStatus.Available]: 'bg-emerald-50 text-emerald-600',
  [CopyStatus.Borrowed]: 'bg-blue-50 text-blue-600',
  [CopyStatus.Reserved]: 'bg-amber-50 text-amber-600',
  [CopyStatus.Damaged]: 'bg-orange-50 text-orange-600',
  [CopyStatus.Lost]: 'bg-rose-50 text-rose-600',
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}

function percent(value: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return `${Math.round((value / total) * 100)}%`;
}

function BookCover({ book }: { book: BookDetail }) {
  return <BookCoverArt src={book.coverImage} title={book.title} seed={book._id} size="lg" />;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="grid grid-cols-[24px_110px_minmax(0,1fr)] gap-3 text-sm">
      <span className="grid h-6 w-6 place-items-center text-slate-500">{icon}</span>
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="min-w-0 font-extrabold text-slate-800">{value}</span>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, tone }: MetricCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-4">
        <span className={`grid h-13 w-13 shrink-0 place-items-center rounded-full text-xl ring-8 ${metricToneClassMap[tone]}`}>{icon}</span>
        <div>
          <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
          <p className="m-0 mt-1 text-2xl font-extrabold text-slate-950">{formatNumber(value)}</p>
          <p className="m-0 mt-1 text-xs font-bold text-slate-500">{detail}</p>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: CopyStatus }) {
  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${copyStatusClassMap[status]}`}>{getStatusLabel(status)}</span>;
}

function copyActivityLabel(copy: BookCopyView): ReactNode {
  if (copy.currentDueDate) {
    return (
      <span>
        {formatDate(copy.currentDueDate)}
        <br />
        <span className="text-slate-500">{copy.currentLoanStatus ? getStatusLabel(copy.currentLoanStatus) : 'Đang lưu thông'}</span>
      </span>
    );
  }

  return <span className="text-slate-400">Chưa có lịch sử</span>;
}

function exportBookJson(book: BookDetail): void {
  const blob = new Blob([JSON.stringify(book, null, 2)], { type: 'application/json;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${book.isbn || book._id}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export default function BookDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [addCopiesForm] = Form.useForm<AddCopiesFormValues>();
  const [isAddCopiesOpen, setIsAddCopiesOpen] = useState(false);

  const bookQuery = useQuery({
    queryKey: ['catalog', 'book', id],
    enabled: Boolean(id),
    queryFn: () => catalogApi.getBook(id),
  });

  const book = bookQuery.data;

  const copyStats = useMemo(() => {
    const copies = book?.copies ?? [];
    const countByStatus = copies.reduce(
      (summary, copy) => {
        summary[copy.status] += 1;
        return summary;
      },
      {
        [CopyStatus.Available]: 0,
        [CopyStatus.Borrowed]: 0,
        [CopyStatus.Reserved]: 0,
        [CopyStatus.Damaged]: 0,
        [CopyStatus.Lost]: 0,
      } satisfies Record<CopyStatus, number>,
    );

    return {
      total: copies.length,
      ...countByStatus,
    };
  }, [book?.copies]);

  const addCopiesMutation = useMutation({
    mutationFn: (values: AddCopiesFormValues) =>
      catalogApi.addCopies(id, {
        count: values.count,
        shelfLocation: values.shelfLocation,
        acquiredDate: values.acquiredDate?.toISOString(),
      }),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã thêm bản sao', description: 'Bản sao mới đã được tạo từ API kho sách.' });
      addCopiesForm.resetFields();
      setIsAddCopiesOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'book', id] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'books'] });
    },
  });

  const updateCopyStatusMutation = useMutation({
    mutationFn: ({ copyId, status }: { copyId: string; status: CopyStatus }) => catalogApi.updateCopyStatus(copyId, status),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã cập nhật trạng thái bản sao' });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'book', id] });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'books'] });
    },
  });

  const hideBookMutation = useMutation({
    mutationFn: () => catalogApi.deleteBook(id),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã ẩn sách khỏi danh mục hoạt động' });
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'books'] });
      navigate('/catalog');
    },
  });

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500" aria-label="Breadcrumb">
        <Link className="hover:text-indigo-600" to="/">
          Tổng quan
        </Link>
        <span>›</span>
        <Link className="hover:text-indigo-600" to="/catalog">
          Sách
        </Link>
        <span>›</span>
        <span className="text-slate-800">Chi tiết sách</span>
      </nav>

      {bookQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải chi tiết sách" description={(bookQuery.error as Error).message} />
      ) : null}

      {bookQuery.isLoading ? (
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="h-[520px] animate-pulse rounded-2xl bg-white" />
          <div className="h-[520px] animate-pulse rounded-2xl bg-white" />
        </section>
      ) : null}

      {book ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)] lg:grid-cols-[300px_minmax(0,1fr)]">
              <BookCover book={book} />

              <div className="min-w-0">
                <h2 className="m-0 text-3xl font-extrabold tracking-tight text-slate-950">{book.title}</h2>
                <p className="m-0 mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-indigo-700">
                  <UserOutlined />
                  {formatList(book.authors, 'Chưa cập nhật tác giả')}
                </p>

                <div className="mt-8 grid gap-x-8 gap-y-5 lg:grid-cols-2">
                  <DetailRow icon={<FileTextOutlined />} label="ISBN" value={book.isbn} />
                  <DetailRow icon={<CopyOutlined />} label="Ngôn ngữ" value={book.language ?? 'Đang cập nhật'} />
                  <DetailRow icon={<TagsOutlined />} label="Danh mục" value={formatList(book.categories, 'Chưa phân loại')} />
                  <DetailRow icon={<BookOutlined />} label="Số trang" value={book.pageCount ? formatNumber(book.pageCount) : 'Đang cập nhật'} />
                  <DetailRow icon={<InboxOutlined />} label="Nhà xuất bản" value={book.publisher ?? 'Đang cập nhật'} />
                  <DetailRow icon={<SafetyOutlined />} label="Kích thước" value={book.bookSize ?? 'Đang cập nhật'} />
                  <DetailRow icon={<CalendarOutlined />} label="Năm xuất bản" value={book.publishYear ?? 'Đang cập nhật'} />
                  <DetailRow icon={<BookOutlined />} label="Giá trị" value={formatCurrency(book.bookValue)} />
                </div>

                <div className="mt-8 border-t border-slate-200 pt-6">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="text-sm font-semibold text-slate-500">Trạng thái sách</span>
                    <span className="inline-flex rounded-lg bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-600">Đang hiển thị</span>
                  </div>
                  {book.description ? <p className="m-0 mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-600">{book.description}</p> : null}
                </div>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <MetricCard icon={<BookOutlined />} label="Tổng bản sao" value={copyStats.total} detail={`${copyStats[CopyStatus.Lost]} bản sao đã mất`} tone="indigo" />
              <MetricCard
                icon={<CheckCircleOutlined />}
                label="Đang có sẵn"
                value={copyStats[CopyStatus.Available]}
                detail={percent(copyStats[CopyStatus.Available], copyStats.total)}
                tone="emerald"
              />
              <MetricCard
                icon={<TeamOutlined />}
                label="Đang mượn"
                value={copyStats[CopyStatus.Borrowed]}
                detail={percent(copyStats[CopyStatus.Borrowed], copyStats.total)}
                tone="blue"
              />
              <MetricCard
                icon={<InboxOutlined />}
                label="Đang đặt chỗ"
                value={copyStats[CopyStatus.Reserved]}
                detail={percent(copyStats[CopyStatus.Reserved], copyStats.total)}
                tone="amber"
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="m-0 text-base font-extrabold text-slate-950">Danh sách bản sao ({formatNumber(book.copies.length)})</h3>
              </div>

              {book.copies.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500">
                        <th className="px-5 py-4">Barcode</th>
                        <th className="px-5 py-4">Vị trí</th>
                        <th className="px-5 py-4">Tình trạng</th>
                        <th className="px-5 py-4">Trạng thái</th>
                        <th className="px-5 py-4">Lần mượn hiện tại</th>
                        <th className="px-5 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {book.copies.map((copy) => (
                        <tr className="text-sm font-semibold text-slate-700 transition hover:bg-slate-50" key={copy._id}>
                          <td className="px-5 py-4 font-extrabold text-slate-800">{copy.barcode}</td>
                          <td className="px-5 py-4">{copy.shelfLocation ?? 'Kho dự phòng'}</td>
                          <td className="px-5 py-4">
                            <StatusPill status={copy.status} />
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${copy.status === CopyStatus.Lost ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                              {copy.status === CopyStatus.Lost ? 'Ẩn' : 'Hiển thị'}
                            </span>
                          </td>
                          <td className="px-5 py-4 leading-6">{copyActivityLabel(copy)}</td>
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <Tooltip title="Xem bản sao">
                                <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600" type="button">
                                  <EyeOutlined />
                                </button>
                              </Tooltip>
                              <Select
                                size="small"
                                value={copy.status}
                                disabled={updateCopyStatusMutation.isPending}
                                style={{ width: 132 }}
                                onChange={(status) => updateCopyStatusMutation.mutate({ copyId: copy._id, status })}
                                options={Object.values(CopyStatus).map((status) => ({
                                  label: getStatusLabel(status),
                                  value: status,
                                }))}
                              />
                              <Tooltip title="Tác vụ khác">
                                <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600" type="button">
                                  <EllipsisOutlined />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-14">
                  <Empty description="Chưa có bản sao nào cho đầu sách này" />
                </div>
              )}

              <div className="border-t border-slate-200 px-5 py-4 text-sm font-semibold text-slate-500">
                Hiển thị 1 đến {formatNumber(book.copies.length)} trong tổng số {formatNumber(book.copies.length)} bản sao
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <h3 className="m-0 text-lg font-extrabold text-slate-950">Thao tác nhanh</h3>
              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/catalog/${book._id}/edit`)}
                  className={primaryActionButtonClass}
                >
                  <EditOutlined />
                  Chỉnh sửa sách
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddCopiesOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <PlusCircleOutlined />
                  Thêm bản sao
                </button>
                <Popconfirm
                  title="Ẩn sách này?"
                  description="Sách sẽ không còn xuất hiện trong danh mục hoạt động."
                  okText="Ẩn sách"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, loading: hideBookMutation.isPending }}
                  onConfirm={() => hideBookMutation.mutate()}
                >
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                  >
                    <EyeInvisibleOutlined />
                    Ẩn sách
                  </button>
                </Popconfirm>
                <button
                  type="button"
                  onClick={() => exportBookJson(book)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-indigo-700 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  <DownloadOutlined />
                  Xuất thông tin sách
                </button>
                <button
                  type="button"
                  disabled
                  title="Backend chưa có API lịch sử mượn theo đầu sách"
                  className="inline-flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-400"
                >
                  <ClockCircleOutlined />
                  Xem lịch sử mượn
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-4">
                <h3 className="m-0 text-lg font-extrabold text-slate-950">Thống kê nhanh</h3>
                <span className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Dữ liệu hiện tại</span>
              </div>
              <div className="mt-5 grid gap-4 text-sm font-semibold">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Sẵn sàng</span>
                  <strong className="text-slate-950">{formatNumber(copyStats[CopyStatus.Available])}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Đang mượn</span>
                  <strong className="text-slate-950">{formatNumber(copyStats[CopyStatus.Borrowed])}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Đặt chỗ</span>
                  <strong className="text-slate-950">{formatNumber(copyStats[CopyStatus.Reserved])}</strong>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Hỏng / mất</span>
                  <strong className="text-slate-950">{formatNumber(copyStats[CopyStatus.Damaged] + copyStats[CopyStatus.Lost])}</strong>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
              <h3 className="m-0 text-lg font-extrabold text-slate-950">Thông tin bổ sung</h3>
              <div className="mt-5 grid gap-4 text-sm">
                <DetailRow icon={<TagsOutlined />} label="Chủ đề" value={formatList(book.categories, 'Đang cập nhật')} />
                <DetailRow icon={<FileTextOutlined />} label="Từ khóa" value={formatList(book.authors, 'Đang cập nhật')} />
                <DetailRow icon={<CalendarOutlined />} label="Ngày thêm" value={formatDate(book.createdAt)} />
                <DetailRow icon={<ClockCircleOutlined />} label="Cập nhật" value={formatDateTime(book.updatedAt)} />
              </div>
            </section>
          </aside>
        </div>
      ) : null}

      <Modal
        title="Thêm bản sao"
        open={isAddCopiesOpen}
        onCancel={() => setIsAddCopiesOpen(false)}
        okText="Tạo bản sao"
        cancelText="Hủy"
        confirmLoading={addCopiesMutation.isPending}
        onOk={() => addCopiesForm.submit()}
      >
        <Form<AddCopiesFormValues>
          form={addCopiesForm}
          layout="vertical"
          initialValues={{ count: 1 }}
          onFinish={(values) => addCopiesMutation.mutate(values)}
        >
          <Form.Item label="Số lượng" name="count" rules={[{ required: true, type: 'number', min: 1 }]}>
            <InputNumber min={1} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Vị trí kệ" name="shelfLocation">
            <Input placeholder="Ví dụ: Kệ A-03" />
          </Form.Item>
          <Form.Item label="Ngày nhập" name="acquiredDate">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          {addCopiesMutation.isError ? <Alert type="error" showIcon message={extractErrorMessage(addCopiesMutation.error, 'Không thể thêm bản sao')} /> : null}
        </Form>
      </Modal>
    </div>
  );
}
