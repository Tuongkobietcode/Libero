import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  QrcodeOutlined,
  SearchOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';

import { BookCoverArt } from '../../components/BookCoverArt';
import { catalogApi } from '../../services/catalog.api';
import { fineApi } from '../../services/fine.api';
import { loanApi } from '../../services/loan.api';
import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import {
  CopyStatus,
  FineStatus,
  LoanStatus,
  MemberStatus,
  Role,
  type BookCopyView,
  type BookDetail,
  type BookListItem,
  type LoanDetail,
  type LoanPolicyView,
  type MemberView,
} from '../../types/models';
import { getRoleLabel, getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatCurrency, formatDate } from '../../utils/format';

interface SelectedCopy {
  book: BookDetail;
  copy: BookCopyView;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function firstAuthor(book: BookListItem | BookDetail): string {
  return book.authors[0]?.name ?? book.isbn;
}

function findPolicy(policies: LoanPolicyView[] | undefined, role?: Role): LoanPolicyView | undefined {
  return policies?.find((policy) => policy.role === role);
}

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <span className="text-sm font-bold text-slate-600">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </span>
  );
}

function SectionTitle({ index, children }: { index: number; children: string }) {
  return <h2 className="m-0 text-lg font-extrabold text-slate-950">{index}. {children}</h2>;
}

function MemberOption({ member, onSelect }: { member: MemberView; onSelect: (member: MemberView) => void }) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
      onClick={() => onSelect(member)}
      type="button"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">{initials(member.fullName)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-extrabold text-slate-900">{member.fullName}</span>
        <span className="block truncate text-xs font-semibold text-slate-500">{member.memberCardNo} · {member.email}</span>
      </span>
      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{getRoleLabel(member.role)}</span>
    </button>
  );
}

function SelectedMemberCard({
  member,
  activeLoans,
}: {
  member: MemberView;
  activeLoans: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-50 text-base font-extrabold text-blue-700">{initials(member.fullName)}</span>
      <div className="min-w-[220px] flex-1">
        <p className="m-0 text-lg font-extrabold text-slate-950">{member.fullName}</p>
        <p className="m-0 mt-2 flex flex-wrap gap-3 text-sm font-semibold text-slate-500">
          <span>Mã thẻ: {member.memberCardNo}</span>
          <span>Loại: {getRoleLabel(member.role)}</span>
          <span>Trạng thái: <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{getStatusLabel(member.status)}</span></span>
          <span>Đang mượn: {activeLoans} cuốn</span>
        </p>
      </div>
    </div>
  );
}

function SelectedBookRow({ item, onRemove }: { item: SelectedCopy; onRemove: () => void }) {
  return (
    <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[52px_1.5fr_1fr_1fr_0.8fr_0.8fr_auto] md:items-center">
      <BookCoverArt src={item.book.coverImage} title={item.book.title} seed={item.book._id} size="xs" />
      <div>
        <p className="m-0 text-xs font-bold text-slate-500">Tên sách</p>
        <p className="m-0 mt-1 font-extrabold text-slate-950">{item.book.title}</p>
      </div>
      <div>
        <p className="m-0 text-xs font-bold text-slate-500">Tác giả</p>
        <p className="m-0 mt-1 font-semibold text-slate-700">{firstAuthor(item.book)}</p>
      </div>
      <div>
        <p className="m-0 text-xs font-bold text-slate-500">Barcode</p>
        <p className="m-0 mt-1 font-semibold text-slate-700">{item.copy.barcode}</p>
      </div>
      <div>
        <p className="m-0 text-xs font-bold text-slate-500">Tình trạng</p>
        <span className="mt-1 inline-flex rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{getStatusLabel(item.copy.status)}</span>
      </div>
      <div>
        <p className="m-0 text-xs font-bold text-slate-500">Vị trí</p>
        <p className="m-0 mt-1 font-semibold text-slate-700">{item.copy.shelfLocation ?? '-'}</p>
      </div>
      <button className="grid h-10 w-10 place-items-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100" onClick={onRemove} type="button">
        <DeleteOutlined />
      </button>
    </div>
  );
}

export default function CreateCheckoutPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const notify = useNotificationsStore((state) => state.push);
  const [memberSearch, setMemberSearch] = useState('');
  const [bookSearch, setBookSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberView | null>(null);
  const [selectedCopies, setSelectedCopies] = useState<SelectedCopy[]>([]);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(true);

  const policiesQuery = useQuery({
    queryKey: ['settings', 'loan-policies'],
    queryFn: () => memberApi.listLoanPolicies(),
  });
  const membersQuery = useQuery({
    queryKey: ['checkout', 'member-search', memberSearch],
    queryFn: () => memberApi.listMembers({ q: memberSearch || undefined, page: 1, limit: 8 }),
  });
  const booksQuery = useQuery({
    queryKey: ['checkout', 'book-search', bookSearch],
    queryFn: () => catalogApi.listBooks({ q: bookSearch || undefined, page: 1, limit: 6 }),
  });
  const activeLoansQuery = useQuery({
    enabled: Boolean(selectedMember),
    queryKey: ['checkout', 'active-loans', selectedMember?._id],
    queryFn: () => loanApi.listLoans({ memberId: selectedMember?._id, status: LoanStatus.Active, page: 1, limit: 1 }),
  });
  const finesQuery = useQuery({
    enabled: Boolean(selectedMember),
    queryKey: ['checkout', 'unpaid-fines', selectedMember?._id],
    queryFn: () => fineApi.listFines({ memberId: selectedMember?._id, status: FineStatus.Unpaid, page: 1, limit: 1 }),
  });

  const addBookMutation = useMutation({
    mutationFn: async (book: BookListItem) => {
      const detail = await catalogApi.getBook(book._id);
      const selectedBarcodes = new Set(selectedCopies.map((item) => item.copy.barcode));
      const copy =
        detail.copies.find((item) => item.status === CopyStatus.Available && !selectedBarcodes.has(item.barcode)) ??
        detail.copies.find((item) => item.status === CopyStatus.Reserved && !selectedBarcodes.has(item.barcode));

      if (!copy) {
        throw new Error('Không còn bản sao sẵn sàng cho sách này.');
      }

      return { book: detail, copy };
    },
    onSuccess: (item) => {
      setSelectedCopies((current) => [...current, item]);
      setBookSearch('');
    },
    onError: (error) => {
      notify({ level: 'warning', message: 'Không thể thêm sách', description: extractErrorMessage(error) });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMember) {
        throw new Error('Vui lòng chọn độc giả.');
      }

      const results: LoanDetail[] = [];
      for (const item of selectedCopies) {
        const loan = await loanApi.checkout({
          memberId: selectedMember._id,
          barcode: item.copy.barcode,
        });
        results.push(loan);
      }
      return results;
    },
    onSuccess: async (loans) => {
      notify({
        level: 'success',
        message: 'Đã tạo phiếu mượn',
        description: `Ghi nhận ${loans.length} khoản mượn cho ${selectedMember?.fullName}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['loans'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/circulation/checkout');
    },
    onError: (error) => {
      notify({ level: 'error', message: 'Không thể tạo phiếu mượn', description: extractErrorMessage(error) });
    },
  });

  const activeLoans = activeLoansQuery.data?.pagination.totalItems ?? 0;
  const unpaidFineTotal = finesQuery.data?.summary.unpaidTotal ?? 0;
  const policy = findPolicy(policiesQuery.data, selectedMember?.role);
  const loanDate = dayjs();
  const dueDate = loanDate.add(policy?.loanDays ?? 14, 'day');

  const memberOptions = useMemo(
    () => (membersQuery.data?.items ?? []).filter((member) => member.role === Role.Student || member.role === Role.Lecturer),
    [membersQuery.data?.items],
  );
  const canBorrow =
    Boolean(selectedMember) &&
    selectedMember?.status === MemberStatus.Active &&
    !selectedMember?.isBlocked &&
    unpaidFineTotal <= 0 &&
    selectedCopies.length > 0 &&
    confirmed &&
    (!policy || activeLoans + selectedCopies.length <= policy.maxBooks);

  const warnings = [
    selectedMember?.status !== MemberStatus.Active ? 'Độc giả không ở trạng thái hoạt động.' : null,
    selectedMember?.isBlocked ? 'Tài khoản độc giả đang bị khóa.' : null,
    unpaidFineTotal > 0 ? 'Độc giả còn khoản phạt chưa thanh toán.' : null,
    policy && activeLoans + selectedCopies.length > policy.maxBooks ? `Vượt giới hạn ${policy.maxBooks} cuốn theo chính sách mượn.` : null,
  ].filter(Boolean);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
        <div className="space-y-8">
          <section className="space-y-4">
            <SectionTitle index={1}>Thông tin độc giả</SectionTitle>
            <label className="grid gap-2">
              <FieldLabel required>Chọn độc giả</FieldLabel>
              <span className="relative">
                <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#4f46e5] focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) => setMemberSearch(event.target.value)}
                  placeholder="Tìm theo tên, mã thẻ, email..."
                  value={memberSearch}
                />
              </span>
            </label>

            {memberSearch ? (
              <div className="rounded-xl border border-slate-200 bg-white p-2">
                {membersQuery.isLoading ? <p className="m-0 px-3 py-2 text-sm font-semibold text-slate-500">Đang tìm độc giả...</p> : null}
                {!membersQuery.isLoading && memberOptions.length
                  ? memberOptions.map((member) => (
                      <MemberOption
                        key={member._id}
                        member={member}
                        onSelect={(item) => {
                          setSelectedMember(item);
                          setMemberSearch('');
                        }}
                      />
                    ))
                  : null}
                {!membersQuery.isLoading && !memberOptions.length ? <p className="m-0 px-3 py-2 text-sm font-semibold text-slate-500">Không có độc giả phù hợp.</p> : null}
              </div>
            ) : null}

            {selectedMember ? <SelectedMemberCard activeLoans={activeLoans} member={selectedMember} /> : null}
          </section>

          <section className="space-y-4">
            <SectionTitle index={2}>Thông tin sách / bản sao</SectionTitle>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <span className="relative">
                <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-[#4f46e5] focus:ring-4 focus:ring-indigo-100"
                  onChange={(event) => setBookSearch(event.target.value)}
                  placeholder="Nhập barcode hoặc tên sách..."
                  value={bookSearch}
                />
              </span>
              <button
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                disabled={!booksQuery.data?.items.length || addBookMutation.isPending}
                onClick={() => {
                  const first = booksQuery.data?.items[0];
                  if (first) addBookMutation.mutate(first);
                }}
                type="button"
              >
                <QrcodeOutlined />
                Quét mã
              </button>
            </div>

            {bookSearch ? (
              <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2">
                {booksQuery.data?.items.map((book) => (
                  <button
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
                    disabled={addBookMutation.isPending}
                    key={book._id}
                    onClick={() => addBookMutation.mutate(book)}
                    type="button"
                  >
                    <BookCoverArt src={book.coverImage} title={book.title} seed={book._id} size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-900">{book.title}</span>
                      <span className="block truncate text-xs font-semibold text-slate-500">{firstAuthor(book)} · Còn {book.availableCopies} bản</span>
                    </span>
                    <PlusOutlined className="text-blue-600" />
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-3">
              {selectedCopies.map((item) => (
                <SelectedBookRow
                  item={item}
                  key={item.copy._id}
                  onRemove={() => setSelectedCopies((current) => current.filter((selected) => selected.copy._id !== item.copy._id))}
                />
              ))}
              {!selectedCopies.length ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
                  Chưa chọn sách hoặc bản sao nào.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle index={3}>Kỳ hạn mượn</SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2">
                <FieldLabel required>Ngày mượn</FieldLabel>
                <span className="flex h-12 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700">
                  {loanDate.format('DD/MM/YYYY')}
                  <CalendarOutlined />
                </span>
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Hạn trả</FieldLabel>
                <span className="flex h-12 items-center justify-between rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700">
                  {dueDate.format('DD/MM/YYYY')}
                  <CalendarOutlined />
                </span>
              </label>
              <label className="grid gap-2">
                <FieldLabel required>Chính sách mượn</FieldLabel>
                <span className="flex h-12 items-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700">
                  {selectedMember ? `${getRoleLabel(selectedMember.role)} - ${policy?.loanDays ?? 14} ngày` : 'Chọn độc giả trước'}
                </span>
              </label>
            </div>
            <label className="grid gap-2">
              <FieldLabel>Ghi chú tùy chọn</FieldLabel>
              <textarea
                className="min-h-24 rounded-xl border border-slate-200 p-4 text-sm font-semibold outline-none transition focus:border-[#4f46e5] focus:ring-4 focus:ring-indigo-100"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Nhập ghi chú nếu có..."
                value={notes}
              />
            </label>
          </section>

          <section className="space-y-4">
            <SectionTitle index={4}>Xác nhận</SectionTitle>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
              <input checked={confirmed} className="h-5 w-5 accent-[#4f46e5]" onChange={(event) => setConfirmed(event.target.checked)} type="checkbox" />
              Tôi đã kiểm tra tình trạng sách trước khi cho mượn
            </label>
          </section>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            <Link className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-6 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50" to="/circulation/checkout">
              Hủy
            </Link>
            <button className="h-11 rounded-xl border border-slate-200 px-6 text-sm font-extrabold text-slate-400" disabled title="Chưa có API lưu nháp" type="button">
              Lưu nháp
            </button>
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#4f46e5] px-6 text-sm font-extrabold text-white shadow-[0_14px_30px_rgba(79,70,229,0.24)] transition hover:bg-[#4338ca] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!canBorrow || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              type="button"
            >
              <CheckCircleOutlined />
              Xác nhận tạo phiếu mượn
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <h2 className="m-0 text-lg font-extrabold text-slate-950">A. Tóm tắt phiếu mượn</h2>
          <div className="mt-5 grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold text-slate-500"><UserOutlined /> Độc giả</span>
              <strong className="text-right text-slate-950">{selectedMember?.fullName ?? '-'}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold text-slate-500"><BookOutlined /> Số lượng sách</span>
              <strong className="text-slate-950">{selectedCopies.length}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold text-slate-500"><CalendarOutlined /> Ngày mượn</span>
              <strong className="text-slate-950">{loanDate.format('DD/MM/YYYY')}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold text-slate-500"><CalendarOutlined /> Hạn trả</span>
              <strong className="text-slate-950">{dueDate.format('DD/MM/YYYY')}</strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-3 font-semibold text-slate-500"><WarningOutlined /> Tiền phạt tồn</span>
              <strong className={unpaidFineTotal > 0 ? 'text-red-600' : 'text-emerald-600'}>{formatCurrency(unpaidFineTotal, '0 đ')}</strong>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <h2 className="m-0 text-lg font-extrabold text-slate-950">B. Quy tắc mượn</h2>
          <div className="mt-5 grid gap-4 text-sm font-semibold text-slate-600">
            <p className="m-0 flex items-center gap-3"><CheckCircleOutlined className="text-emerald-600" /> Tối đa {policy?.maxBooks ?? '-'} cuốn</p>
            <p className="m-0 flex items-center gap-3"><CheckCircleOutlined className="text-emerald-600" /> Không vượt quá hạn mức</p>
            <p className="m-0 flex items-center gap-3"><CheckCircleOutlined className="text-emerald-600" /> Không có khoản phạt chưa thanh toán</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
          <h2 className="m-0 text-lg font-extrabold text-slate-950">C. Cảnh báo hệ thống</h2>
          {warnings.length ? (
            <div className="mt-5 grid gap-3">
              {warnings.map((warning) => (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" key={warning}>
                  <WarningOutlined /> {warning}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-700">
              <InfoCircleOutlined /> Không có cảnh báo. Độc giả đủ điều kiện mượn sách.
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}
