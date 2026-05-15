import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EllipsisOutlined,
  HourglassOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Empty, Modal, Popconfirm, Tooltip } from 'antd';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { AdminSelect, primaryActionButtonClass } from '../../components/AdminSurface';
import { catalogApi } from '../../services/catalog.api';
import { memberApi } from '../../services/member.api';
import { reservationApi } from '../../services/reservation.api';
import { useNotificationsStore } from '../../store/notifications.store';
import type { BookListItem, MemberView, ReservationListItem } from '../../types/models';
import { ReservationStatus, Role } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatDate, formatDateTime, formatList } from '../../utils/format';

type ReservationStatusFilter = ReservationStatus | 'all';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value?: number;
  tone: 'blue' | 'emerald' | 'orange' | 'indigo';
  helper: string;
}

const statToneClassMap: Record<StatCardProps['tone'], string> = {
  blue: 'bg-blue-50 text-blue-600 ring-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  orange: 'bg-orange-50 text-orange-600 ring-orange-100',
  indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100',
};

const reservationStatusClassMap: Record<ReservationStatus, string> = {
  [ReservationStatus.Waiting]: 'bg-blue-50 text-blue-600',
  [ReservationStatus.Notified]: 'bg-emerald-50 text-emerald-600',
  [ReservationStatus.Fulfilled]: 'bg-cyan-50 text-cyan-600',
  [ReservationStatus.Cancelled]: 'bg-rose-50 text-rose-600',
  [ReservationStatus.Expired]: 'bg-orange-50 text-orange-600',
};

function formatNumber(value?: number): string {
  if (value === undefined) {
    return '...';
  }

  return new Intl.NumberFormat('vi-VN').format(value);
}

function getReservationCode(reservation: ReservationListItem): string {
  return `RES-${reservation.createdAt.slice(0, 4)}-${reservation._id.slice(-5).toUpperCase()}`;
}

function StatCard({ icon, label, value, tone, helper }: StatCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-5">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl ring-8 ${statToneClassMap[tone]}`}>{icon}</span>
        <div>
          <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
          <p className="m-0 mt-1 text-3xl font-extrabold tracking-tight text-slate-950">{formatNumber(value)}</p>
          <p className="m-0 mt-2 text-xs font-semibold text-emerald-600">{helper}</p>
        </div>
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: ReservationStatus }) {
  return <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${reservationStatusClassMap[status]}`}>{getStatusLabel(status)}</span>;
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

export default function ReservationListPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [selectedMemberLabel, setSelectedMemberLabel] = useState<string | undefined>();
  const [status, setStatus] = useState<ReservationStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createMemberSearch, setCreateMemberSearch] = useState('');
  const [createBookSearch, setCreateBookSearch] = useState('');
  const [reservationMember, setReservationMember] = useState<MemberView | null>(null);
  const [reservationBook, setReservationBook] = useState<BookListItem | null>(null);

  const reservationsQuery = useQuery({
    queryKey: ['reservations', selectedMemberId, status, page, limit],
    queryFn: () =>
      reservationApi.listReservations({
        memberId: selectedMemberId,
        status: status === 'all' ? undefined : status,
        page,
        limit,
      }),
  });

  const waitingCountQuery = useQuery({
    queryKey: ['reservations', 'metrics', selectedMemberId, ReservationStatus.Waiting],
    queryFn: () => reservationApi.listReservations({ memberId: selectedMemberId, status: ReservationStatus.Waiting, page: 1, limit: 1 }),
  });

  const notifiedCountQuery = useQuery({
    queryKey: ['reservations', 'metrics', selectedMemberId, ReservationStatus.Notified],
    queryFn: () => reservationApi.listReservations({ memberId: selectedMemberId, status: ReservationStatus.Notified, page: 1, limit: 1 }),
  });

  const expiredCountQuery = useQuery({
    queryKey: ['reservations', 'metrics', selectedMemberId, ReservationStatus.Expired],
    queryFn: () => reservationApi.listReservations({ memberId: selectedMemberId, status: ReservationStatus.Expired, page: 1, limit: 1 }),
  });

  const fulfilledCountQuery = useQuery({
    queryKey: ['reservations', 'metrics', selectedMemberId, ReservationStatus.Fulfilled],
    queryFn: () => reservationApi.listReservations({ memberId: selectedMemberId, status: ReservationStatus.Fulfilled, page: 1, limit: 1 }),
  });

  const createMembersQuery = useQuery({
    enabled: createModalOpen,
    queryKey: ['reservations', 'create', 'members', createMemberSearch],
    queryFn: () => memberApi.listMembers({ q: createMemberSearch || undefined, page: 1, limit: 6 }),
  });

  const createBooksQuery = useQuery({
    enabled: createModalOpen,
    queryKey: ['reservations', 'create', 'books', createBookSearch],
    queryFn: () => catalogApi.listBooks({ q: createBookSearch || undefined, available: false, page: 1, limit: 6 }),
  });

  const searchMemberMutation = useMutation({
    mutationFn: async (keyword: string) => {
      if (!keyword) {
        return null;
      }

      const params = keyword.toUpperCase().startsWith('MEM-') ? { memberCardNo: keyword, limit: 1, page: 1 } : { q: keyword, limit: 1, page: 1 };
      const response = await memberApi.listMembers(params);
      return response.items[0] ?? null;
    },
    onSuccess: (member) => {
      setPage(1);
      setSelectedMemberId(member?._id);
      setSelectedMemberLabel(member ? `${member.fullName} - ${member.memberCardNo}` : undefined);
      notify(
        member
          ? { level: 'info', message: 'Đã áp dụng bộ lọc độc giả', description: `${member.fullName} đang là bộ lọc đặt chỗ.` }
          : { level: 'warning', message: 'Không tìm thấy độc giả', description: 'Danh sách đang hiển thị toàn bộ đặt chỗ.' },
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (reservationId: string) => reservationApi.cancelReservation(reservationId),
    onSuccess: () => {
      notify({ level: 'success', message: 'Đã hủy đặt chỗ' });
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
  });

  const createReservationMutation = useMutation({
    mutationFn: () => {
      if (!reservationMember || !reservationBook) {
        throw new Error('Vui lòng chọn độc giả và sách cần đặt chỗ.');
      }

      return reservationApi.createReservationForMember({
        memberId: reservationMember._id,
        bookId: reservationBook._id,
      });
    },
    onSuccess: (reservation) => {
      notify({
        level: 'success',
        message: 'Đã tạo đặt chỗ',
        description: `${reservation.member.fullName} đã được đặt chỗ sách ${reservation.book.title}.`,
      });
      setCreateModalOpen(false);
      setCreateMemberSearch('');
      setCreateBookSearch('');
      setReservationMember(null);
      setReservationBook(null);
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: 'Không thể tạo đặt chỗ',
        description: extractErrorMessage(error),
      });
    },
  });

  const pagination = reservationsQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const items = reservationsQuery.data?.items ?? [];
  const startItem = pagination && pagination.totalItems > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.totalItems) : 0;
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);
  const reservationMemberOptions = useMemo(
    () => (createMembersQuery.data?.items ?? []).filter((member) => member.role === Role.Student || member.role === Role.Lecturer),
    [createMembersQuery.data?.items],
  );
  const reservationBookOptions = createBooksQuery.data?.items ?? [];

  const resetFilters = () => {
    setSearch('');
    setSelectedMemberId(undefined);
    setSelectedMemberLabel(undefined);
    setStatus('all');
    setPage(1);
  };

  return (
    <div className="space-y-7">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className={primaryActionButtonClass}
        >
          <PlusOutlined />
          Tạo đặt chỗ
        </button>
      </div>

      <Modal
        title="Tạo đặt chỗ cho độc giả"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createReservationMutation.mutate()}
        okText="Xác nhận đặt chỗ"
        cancelText="Đóng"
        confirmLoading={createReservationMutation.isPending}
        okButtonProps={{ disabled: !reservationMember || !reservationBook }}
        width={760}
      >
        <div className="grid gap-5 pt-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Độc giả</span>
              <input
                value={createMemberSearch}
                onChange={(event) => {
                  setCreateMemberSearch(event.target.value);
                  setReservationMember(null);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3157ff] focus:ring-4 focus:ring-blue-100"
                placeholder="Tìm theo tên, email hoặc mã thẻ..."
                type="search"
              />
            </label>
            <div className="mt-3 grid gap-2">
              {reservationMemberOptions.map((member) => (
                <button
                  type="button"
                  key={member._id}
                  onClick={() => setReservationMember(member)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    reservationMember?._id === member._id ? 'border-[#3157ff] bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'
                  }`}
                >
                  <span className="block text-sm font-extrabold text-slate-900">{member.fullName}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">{member.memberCardNo} - {member.email}</span>
                </button>
              ))}
              {!reservationMemberOptions.length && !createMembersQuery.isLoading ? (
                <p className="m-0 rounded-xl bg-white px-3 py-4 text-sm font-semibold text-slate-500">Không tìm thấy độc giả phù hợp.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Sách cần đặt chỗ</span>
              <input
                value={createBookSearch}
                onChange={(event) => {
                  setCreateBookSearch(event.target.value);
                  setReservationBook(null);
                }}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#3157ff] focus:ring-4 focus:ring-blue-100"
                placeholder="Tìm theo tên sách, tác giả hoặc ISBN..."
                type="search"
              />
            </label>
            <p className="m-0 mt-2 text-xs font-semibold text-slate-500">Chỉ hiển thị sách đang hết bản sao có sẵn để đúng quy tắc đặt chỗ.</p>
            <div className="mt-3 grid gap-2">
              {reservationBookOptions.map((book) => (
                <button
                  type="button"
                  key={book._id}
                  onClick={() => setReservationBook(book)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    reservationBook?._id === book._id ? 'border-[#3157ff] bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/60'
                  }`}
                >
                  <span className="block text-sm font-extrabold text-slate-900">{book.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">
                    {formatList(book.authors)} - Còn {book.availableCopies}/{book.totalCopies} bản
                  </span>
                </button>
              ))}
              {!reservationBookOptions.length && !createBooksQuery.isLoading ? (
                <p className="m-0 rounded-xl bg-white px-3 py-4 text-sm font-semibold text-slate-500">Không có sách hết bản sao phù hợp.</p>
              ) : null}
            </div>
          </section>
        </div>
      </Modal>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={<HourglassOutlined />} label="Đang chờ" value={waitingCountQuery.data?.pagination.totalItems} tone="blue" helper="Theo API trạng thái" />
        <StatCard icon={<BellOutlined />} label="Đã thông báo" value={notifiedCountQuery.data?.pagination.totalItems} tone="emerald" helper="Đã có bản giữ chỗ" />
        <StatCard icon={<ClockCircleOutlined />} label="Hết hạn giữ chỗ" value={expiredCountQuery.data?.pagination.totalItems} tone="orange" helper="Cần rà soát" />
        <StatCard icon={<CheckCircleOutlined />} label="Đã hoàn tất" value={fulfilledCountQuery.data?.pagination.totalItems} tone="indigo" helper="Đã xử lý xong" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_240px_auto] xl:items-end">
          <label className="block">
            <span className="sr-only">Tìm đặt chỗ theo độc giả</span>
            <span className="relative block">
              <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    searchMemberMutation.mutate(search.trim());
                  }
                }}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                placeholder="Tìm kiếm mã đặt chỗ, độc giả..."
                type="search"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold text-slate-500">Trạng thái</span>
            <AdminSelect
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ReservationStatusFilter);
                setPage(1);
              }}
              wrapperClassName="w-full"
              className="h-11"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.values(ReservationStatus).map((value) => (
                <option value={value} key={value}>
                  {getStatusLabel(value)}
                </option>
              ))}
            </AdminSelect>
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => searchMemberMutation.mutate(search.trim())}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <SearchOutlined />
              Tìm
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              <ReloadOutlined />
              Đặt lại
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm font-semibold text-slate-500">Bộ lọc đang chọn:</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">Trạng thái: {status === 'all' ? 'Tất cả' : getStatusLabel(status)}</span>
          {selectedMemberLabel ? <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600">{selectedMemberLabel}</span> : null}
        </div>
      </section>

      {reservationsQuery.error ? (
        <Alert type="error" showIcon message="Không thể tải danh sách đặt chỗ" description={(reservationsQuery.error as Error).message} />
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1460px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-600">
                <th className="whitespace-nowrap px-5 py-5">Mã đặt chỗ</th>
                <th className="whitespace-nowrap px-5 py-5">Độc giả</th>
                <th className="whitespace-nowrap px-5 py-5">Sách</th>
                <th className="whitespace-nowrap px-5 py-5">Vị trí hàng đợi</th>
                <th className="whitespace-nowrap px-5 py-5">Ngày tạo</th>
                <th className="whitespace-nowrap px-5 py-5">Hạn giữ chỗ</th>
                <th className="whitespace-nowrap px-5 py-5">Trạng thái</th>
                <th className="whitespace-nowrap px-5 py-5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reservationsQuery.isLoading ? (
                Array.from({ length: limit }).map((_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td className="px-5 py-5" key={cellIndex}>
                        <div className="h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length ? (
                items.map((reservation) => (
                  <tr className="text-sm font-semibold text-slate-700 transition hover:bg-slate-50" key={reservation._id}>
                    <td className="whitespace-nowrap px-5 py-4 font-extrabold text-slate-800">{getReservationCode(reservation)}</td>
                    <td className="px-5 py-4">
                      <p className="m-0 max-w-[260px] truncate whitespace-nowrap font-extrabold text-slate-900">{reservation.member.fullName}</p>
                      <p className="m-0 mt-1 max-w-[260px] truncate whitespace-nowrap text-xs text-slate-500">{reservation.member.memberCardNo}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="m-0 max-w-[340px] truncate whitespace-nowrap font-extrabold text-slate-900">{reservation.book.title}</p>
                      <p className="m-0 mt-1 max-w-[340px] truncate whitespace-nowrap text-xs text-slate-500">{formatList(reservation.book.authors)}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-extrabold text-slate-800">
                      {reservation.queuePosition} / {reservation.queueTotal || reservation.queuePosition}
                    </td>
                    <td className="px-5 py-4">
                      <p className="m-0 whitespace-nowrap font-semibold text-slate-900">{formatDate(reservation.requestDate)}</p>
                      <p className="m-0 mt-1 whitespace-nowrap text-xs text-slate-500">{formatDateTime(reservation.requestDate).slice(11)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="m-0 whitespace-nowrap font-semibold text-slate-900">{formatDate(reservation.holdExpiryAt)}</p>
                      <p className="m-0 mt-1 max-w-[240px] truncate whitespace-nowrap text-xs text-slate-500">{formatDateTime(reservation.holdExpiryAt)}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <StatusPill status={reservation.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600" type="button">
                          Xem chi tiết
                        </button>
                        {reservation.status === ReservationStatus.Notified ? (
                          <span className="grid h-9 place-items-center rounded-lg bg-emerald-50 px-4 text-sm font-semibold text-emerald-600">Thông báo nhận sách</span>
                        ) : null}
                        {[ReservationStatus.Waiting, ReservationStatus.Notified, ReservationStatus.Expired].includes(reservation.status) ? (
                          <Popconfirm
                            title="Hủy đặt chỗ này?"
                            okText="Hủy đặt chỗ"
                            cancelText="Không"
                            okButtonProps={{ danger: true, loading: cancelMutation.isPending }}
                            onConfirm={() => cancelMutation.mutate(reservation._id)}
                          >
                            <button className="h-9 rounded-lg bg-rose-50 px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-100" type="button">
                              Hủy
                            </button>
                          </Popconfirm>
                        ) : (
                          <span className="grid h-9 min-w-16 place-items-center text-slate-400">-</span>
                        )}
                        <Tooltip title="Tác vụ khác">
                          <button className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600" type="button">
                            <EllipsisOutlined />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>

        {!reservationsQuery.isLoading && !items.length ? (
          <div className="px-6 py-16">
            <Empty description="Không có đặt chỗ phù hợp với bộ lọc hiện tại." />
          </div>
        ) : null}

        {pagination ? (
          <div className="flex flex-col gap-4 border-t border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <p className="m-0 text-sm font-semibold text-slate-500">
              Hiển thị {formatNumber(startItem)} đến {formatNumber(endItem)} trong tổng số {formatNumber(pagination.totalItems)} đặt chỗ
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <AdminSelect
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
                wrapperClassName="w-32"
              >
                {[10, 20, 50].map((pageSize) => (
                  <option value={pageSize} key={pageSize}>
                    {pageSize} / trang
                  </option>
                ))}
              </AdminSelect>
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">
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
                    onClick={() => setPage(pageItem)}
                    className={`grid h-11 min-w-11 place-items-center rounded-xl px-3 text-sm font-semibold transition ${
                      pageItem === page ? 'bg-white !text-[#1677ff] shadow-[0_16px_36px_rgba(22,119,255,0.14)] ring-1 ring-blue-50' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                    }`}
                    key={pageItem}
                  >
                    {pageItem}
                  </button>
                ),
              )}
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">
                ›
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
