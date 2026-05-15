import { BookOutlined, CheckCircleOutlined, ClockCircleOutlined, PlusOutlined, ReloadOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Empty, Modal, Popconfirm } from 'antd';
import { useMemo, useState, type ReactNode } from 'react';

import { AdminSelect, primaryActionButtonClass } from '../../components/AdminSurface';
import { bookHoldApi } from '../../services/bookHold.api';
import { catalogApi } from '../../services/catalog.api';
import { loanApi } from '../../services/loan.api';
import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { BookHoldStatus, Role, type BookHoldListItem, type BookListItem, type MemberView } from '../../types/models';
import { getBookHoldStatusLabel, getRoleLabel } from '../../utils/display';
import { extractErrorMessage, formatDateTime, formatList } from '../../utils/format';

type StatusFilter = BookHoldStatus | 'all';

type StatTone = 'indigo' | 'emerald' | 'amber' | 'rose';

interface HoldStatCardProps {
  icon: ReactNode;
  label: string;
  value?: number;
  tone: StatTone;
  helper: string;
}

const statToneClassMap: Record<StatTone, { icon: string; accent: string }> = {
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

const holdStatusClassMap: Record<BookHoldStatus, string> = {
  [BookHoldStatus.Active]: 'bg-emerald-50 text-emerald-600',
  [BookHoldStatus.Fulfilled]: 'bg-cyan-50 text-cyan-600',
  [BookHoldStatus.Cancelled]: 'bg-rose-50 text-rose-600',
  [BookHoldStatus.Expired]: 'bg-orange-50 text-orange-600',
};

function StatusPill({ status }: { status: BookHoldStatus }) {
  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${holdStatusClassMap[status]}`}>{getBookHoldStatusLabel(status)}</span>;
}

function formatNumber(value?: number): string {
  if (value === undefined) {
    return '...';
  }

  return new Intl.NumberFormat('vi-VN').format(value);
}

function HoldStatCard({ icon, label, value, tone, helper }: HoldStatCardProps) {
  const toneClasses = statToneClassMap[tone];

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

export default function BookHoldListPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberView | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookListItem | null>(null);

  const holdsQuery = useQuery({
    queryKey: ['book-holds', status, page, limit],
    queryFn: () => bookHoldApi.listHolds({ status: status === 'all' ? undefined : status, page, limit }),
  });

  const activeCountQuery = useQuery({
    queryKey: ['book-holds', 'metrics', BookHoldStatus.Active],
    queryFn: () => bookHoldApi.listHolds({ status: BookHoldStatus.Active, page: 1, limit: 1 }),
  });

  const fulfilledCountQuery = useQuery({
    queryKey: ['book-holds', 'metrics', BookHoldStatus.Fulfilled],
    queryFn: () => bookHoldApi.listHolds({ status: BookHoldStatus.Fulfilled, page: 1, limit: 1 }),
  });

  const cancelledCountQuery = useQuery({
    queryKey: ['book-holds', 'metrics', BookHoldStatus.Cancelled],
    queryFn: () => bookHoldApi.listHolds({ status: BookHoldStatus.Cancelled, page: 1, limit: 1 }),
  });

  const expiredCountQuery = useQuery({
    queryKey: ['book-holds', 'metrics', BookHoldStatus.Expired],
    queryFn: () => bookHoldApi.listHolds({ status: BookHoldStatus.Expired, page: 1, limit: 1 }),
  });

  const membersQuery = useQuery({
    enabled: createModalOpen,
    queryKey: ['book-holds', 'create', 'members', memberSearch],
    queryFn: () => memberApi.listMembers({ q: memberSearch || undefined, page: 1, limit: 6 }),
  });

  const booksQuery = useQuery({
    enabled: createModalOpen,
    queryKey: ['book-holds', 'create', 'books', bookSearch],
    queryFn: () => catalogApi.listBooks({ q: bookSearch || undefined, available: true, page: 1, limit: 6 }),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedMember || !selectedBook) {
        throw new Error('Vui lòng chọn độc giả và sách cần đặt giữ.');
      }

      return bookHoldApi.createHoldForMember({ memberId: selectedMember._id, bookId: selectedBook._id });
    },
    onSuccess: (hold) => {
      notify({ level: 'success', message: 'Đã tạo đặt giữ', description: `${hold.member.fullName} có 24 giờ để nhận ${hold.book.title}.` });
      setCreateModalOpen(false);
      setMemberSearch('');
      setBookSearch('');
      setSelectedMember(null);
      setSelectedBook(null);
      void queryClient.invalidateQueries({ queryKey: ['book-holds'] });
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể tạo đặt giữ', description: extractErrorMessage(error) });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (holdId: string) => bookHoldApi.cancelHold(holdId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã trả lại bản đặt giữ' });
      void queryClient.invalidateQueries({ queryKey: ['book-holds'] });
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể trả lại đặt giữ', description: extractErrorMessage(error) });
    },
  });

  const fulfillMutation = useMutation({
    mutationFn: (hold: BookHoldListItem) =>
      loanApi.checkout({
        memberId: hold.member._id,
        barcode: hold.copy.barcode,
      }),
    onSuccess: (loan) => {
      notify({
        level: 'success',
        message: 'Đã xác nhận độc giả nhận sách',
        description: `Phiếu mượn ${loan.book.title} đã được tạo cho ${loan.member.fullName}.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['book-holds'] });
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
      void queryClient.invalidateQueries({ queryKey: ['catalog'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể xác nhận nhận sách', description: extractErrorMessage(error) });
    },
  });

  const memberOptions = useMemo(
    () => (membersQuery.data?.items ?? []).filter((member) => member.role === Role.Student || member.role === Role.Lecturer),
    [membersQuery.data?.items],
  );
  const bookOptions = booksQuery.data?.items ?? [];
  const items = holdsQuery.data?.items ?? [];
  const pagination = holdsQuery.data?.pagination;

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className={primaryActionButtonClass}
        >
          <PlusOutlined />
          Tạo đặt giữ
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <HoldStatCard icon={<BookOutlined />} label="Đang chờ lấy" value={activeCountQuery.data?.pagination.totalItems} tone="emerald" helper="Còn hiệu lực giữ sách" />
        <HoldStatCard icon={<CheckCircleOutlined />} label="Đã nhận" value={fulfilledCountQuery.data?.pagination.totalItems} tone="indigo" helper="Đã tạo phiếu mượn" />
        <HoldStatCard icon={<StopOutlined />} label="Đã hủy" value={cancelledCountQuery.data?.pagination.totalItems} tone="rose" helper="Đã trả lại bản giữ" />
        <HoldStatCard icon={<ClockCircleOutlined />} label="Hết hạn" value={expiredCountQuery.data?.pagination.totalItems} tone="amber" helper="Quá hạn 24 giờ" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500">Trạng thái</span>
            <AdminSelect
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-60"
              className="h-11"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.values(BookHoldStatus).map((value) => (
                <option value={value} key={value}>{getBookHoldStatusLabel(value)}</option>
              ))}
            </AdminSelect>
          </label>
          <button
            type="button"
            onClick={() => void queryClient.invalidateQueries({ queryKey: ['book-holds'] })}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600"
          >
            <ReloadOutlined />
            Tải lại
          </button>
        </div>
      </section>

      {holdsQuery.error ? <Alert type="error" showIcon message="Không thể tải danh sách đặt giữ" description={(holdsQuery.error as Error).message} /> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-600">
                <th className="px-5 py-5">Độc giả</th>
                <th className="px-5 py-5">Sách</th>
                <th className="px-5 py-5">Barcode</th>
                <th className="px-5 py-5">Ngày tạo</th>
                <th className="px-5 py-5">Hạn lấy</th>
                <th className="px-5 py-5">Trạng thái</th>
                <th className="px-5 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holdsQuery.isLoading ? (
                Array.from({ length: limit }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 7 }).map((__, cellIndex) => (
                      <td className="px-5 py-5" key={cellIndex}><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length ? (
                items.map((hold) => (
                  <tr className="text-sm font-semibold text-slate-700 transition hover:bg-slate-50" key={hold._id}>
                    <td className="px-5 py-4">
                      <p className="m-0 font-extrabold text-slate-900">{hold.member.fullName}</p>
                      <p className="m-0 mt-1 text-xs text-slate-500">{hold.member.memberCardNo}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="m-0 max-w-[340px] truncate font-extrabold text-slate-900">{hold.book.title}</p>
                      <p className="m-0 mt-1 text-xs text-slate-500">{formatList(hold.book.authors)}</p>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-slate-800">{hold.copy.barcode}</td>
                    <td className="px-5 py-4">{formatDateTime(hold.requestDate)}</td>
                    <td className="px-5 py-4">{formatDateTime(hold.holdExpiryAt)}</td>
                    <td className="px-5 py-4"><StatusPill status={hold.status} /></td>
                    <td className="px-5 py-4 text-right">
                      {hold.status === BookHoldStatus.Active ? (
                        <div className="flex justify-end gap-2">
                          <Popconfirm
                            title="Xác nhận độc giả đã đến nhận sách?"
                            description="Hệ thống sẽ tạo phiếu mượn từ bản sách đang được giữ."
                            okText="Xác nhận"
                            cancelText="Đóng"
                            okButtonProps={{ loading: fulfillMutation.isPending && fulfillMutation.variables?._id === hold._id }}
                            onConfirm={() => fulfillMutation.mutate(hold)}
                          >
                            <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-50 px-4 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100" type="button">
                              <CheckCircleOutlined />
                              Xác nhận nhận
                            </button>
                          </Popconfirm>

                          <Popconfirm
                          title="Trả lại bản đặt giữ này?"
                          okText="Trả lại"
                          cancelText="Đóng"
                          okButtonProps={{ danger: true, loading: cancelMutation.isPending && cancelMutation.variables === hold._id }}
                          onConfirm={() => cancelMutation.mutate(hold._id)}
                        >
                          <button className="h-9 rounded-lg bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100" type="button">
                            Trả lại
                          </button>
                        </Popconfirm>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>

        {!holdsQuery.isLoading && !items.length ? (
          <div className="px-6 py-16"><Empty description="Không có đặt giữ phù hợp." /></div>
        ) : null}

        {pagination ? (
          <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="m-0 text-sm font-semibold text-slate-500">
              Tổng số {formatNumber(pagination.totalItems)} đặt giữ
            </p>
            <div className="flex items-center gap-3">
              <AdminSelect
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                wrapperClassName="w-32"
              >
                {[10, 20, 50].map((pageSize) => <option value={pageSize} key={pageSize}>{pageSize} / trang</option>)}
              </AdminSelect>
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">‹</button>
              <span className="text-sm font-semibold text-slate-600">{pagination.page} / {Math.max(1, pagination.totalPages)}</span>
              <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">›</button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        title="Tạo đặt giữ cho độc giả"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createMutation.mutate()}
        okText="Xác nhận đặt giữ"
        cancelText="Đóng"
        confirmLoading={createMutation.isPending}
        okButtonProps={{ disabled: !selectedMember || !selectedBook }}
        width={760}
      >
        <div className="grid gap-5 pt-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Độc giả</span>
              <input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3157ff] focus:ring-4 focus:ring-blue-100" placeholder="Tìm theo tên, email hoặc mã thẻ..." type="search" />
            </label>
            <div className="mt-3 grid gap-2">
              {memberOptions.map((member) => (
                <button type="button" key={member._id} onClick={() => setSelectedMember(member)} className={`rounded-xl border px-3 py-2 text-left transition ${selectedMember?._id === member._id ? 'border-[#3157ff] bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'}`}>
                  <span className="block text-sm font-extrabold text-slate-900">{member.fullName}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{member.memberCardNo} - {member.email} - {getRoleLabel(member.role)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Sách còn bản để giữ</span>
              <input value={bookSearch} onChange={(event) => setBookSearch(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3157ff] focus:ring-4 focus:ring-blue-100" placeholder="Tìm theo tên sách, tác giả hoặc ISBN..." type="search" />
            </label>
            <div className="mt-3 grid gap-2">
              {bookOptions.map((book) => (
                <button type="button" key={book._id} onClick={() => setSelectedBook(book)} className={`rounded-xl border px-3 py-2 text-left transition ${selectedBook?._id === book._id ? 'border-[#3157ff] bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'}`}>
                  <span className="block text-sm font-extrabold text-slate-900">{book.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{formatList(book.authors)} - Còn {book.availableCopies}/{book.totalCopies} bản</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </Modal>
    </div>
  );
}
