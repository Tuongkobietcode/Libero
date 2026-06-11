import {
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HourglassOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Empty, Modal, Popconfirm } from 'antd';
import { useMemo, useState, type ReactNode } from 'react';

import { AdminSelect } from '../../components/AdminSurface';
import { memberApi } from '../../services/member.api';
import { reservationApi } from '../../services/reservation.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { ReservationStatus, type ReservationListItem } from '../../types/models';
import { getStatusLabel } from '../../utils/display';
import { formatDate, formatDateTime, formatList } from '../../utils/format';

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
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-2xl ring-8 ${statToneClassMap[tone]}`}>
          {icon}
        </span>
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
  return (
    <span className={`inline-flex rounded-lg px-3 py-1 text-xs font-extrabold ${reservationStatusClassMap[status]}`}>
      {getStatusLabel(status)}
    </span>
  );
}

function DetailField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="m-0 text-xs font-black uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <div className="mt-2 text-sm font-extrabold text-slate-900">{value ?? '-'}</div>
    </div>
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

export default function ReservationListPage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const [search, setSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>();
  const [selectedMemberLabel, setSelectedMemberLabel] = useState<string | undefined>();
  const [status, setStatus] = useState<ReservationStatusFilter>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedReservation, setSelectedReservation] = useState<ReservationListItem | null>(null);

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

  const pagination = reservationsQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;
  const items = reservationsQuery.data?.items ?? [];
  const startItem = pagination && pagination.totalItems > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const endItem = pagination ? Math.min(pagination.page * pagination.limit, pagination.totalItems) : 0;
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);

  const resetFilters = () => {
    setSearch('');
    setSelectedMemberId(undefined);
    setSelectedMemberLabel(undefined);
    setStatus('all');
    setPage(1);
  };

  return (
    <div className="space-y-7">
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        <StatCard icon={<HourglassOutlined />} label="Đang chờ" value={waitingCountQuery.data?.pagination.totalItems} tone="blue" helper="Đang ở hàng chờ" />
        <StatCard icon={<BellOutlined />} label="Đã thông báo" value={notifiedCountQuery.data?.pagination.totalItems} tone="emerald" helper="Đã đến lượt nhận" />
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
          <table className="min-w-[1360px] w-full border-collapse text-left">
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
                        <button
                          className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
                          type="button"
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          Xem chi tiết
                        </button>
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
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">‹</button>
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
              <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 text-slate-600 disabled:opacity-45">›</button>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        title={selectedReservation ? `Chi tiết đặt chỗ ${getReservationCode(selectedReservation)}` : 'Chi tiết đặt chỗ'}
        open={Boolean(selectedReservation)}
        onCancel={() => setSelectedReservation(null)}
        footer={null}
        width={760}
      >
        {selectedReservation ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <DetailField
                label="Độc giả"
                value={
                  <div>
                    <p className="m-0">{selectedReservation.member.fullName}</p>
                    <p className="m-0 mt-1 text-xs font-semibold text-slate-500">
                      {selectedReservation.member.memberCardNo} - {selectedReservation.member.email}
                    </p>
                  </div>
                }
              />
              <DetailField
                label="Sách"
                value={
                  <div>
                    <p className="m-0">{selectedReservation.book.title}</p>
                    <p className="m-0 mt-1 text-xs font-semibold text-slate-500">{formatList(selectedReservation.book.authors)}</p>
                  </div>
                }
              />
              <DetailField label="Vị trí hàng đợi" value={`${selectedReservation.queuePosition} / ${selectedReservation.queueTotal || selectedReservation.queuePosition}`} />
              <DetailField label="Trạng thái" value={<StatusPill status={selectedReservation.status} />} />
              <DetailField label="Ngày tạo" value={formatDateTime(selectedReservation.requestDate)} />
              <DetailField label="Hạn giữ chỗ" value={formatDateTime(selectedReservation.holdExpiryAt)} />
              <DetailField label="Barcode bản sao" value={selectedReservation.copy?.barcode} />
              <DetailField label="Vị trí kệ" value={selectedReservation.copy?.shelfLocation} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
