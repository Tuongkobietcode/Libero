import type { ReactNode } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  Edit3,
  GraduationCap,
  KeyRound,
  Library,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { StaggerContainer, StaggerItem } from '../../../components/motion/ReaderMotion';
import { ReaderEmptyState } from '../../../components/reader/ReaderEmptyState';
import { ReaderSummaryCard } from '../../../components/reader/ReaderSummaryCard';
import { MemberStatus, type MemberActivityItem, type MemberStatsView, type MemberView } from '../../../types/models';
import { getRoleLabel, getStatusLabel } from '../../../utils/display';
import { formatDate, formatDateTime } from '../../../utils/format';
import { formatAmount, formatMembershipTier, getInitials, type InfoItem } from '../profileView';

export function ProfileHeader() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <h1 className="m-0 font-display text-[2rem] font-black leading-tight tracking-tight text-slate-950">Hồ sơ của tôi</h1>
      <p className="m-0 mt-2 text-[1.02rem] font-medium text-slate-500">Theo dõi thông tin tài khoản, thẻ thư viện và trạng thái sử dụng dịch vụ tại LIBERO.</p>
    </section>
  );
}

function StatusPill({ profile }: { profile: MemberView }) {
  const isHealthy = profile.status === MemberStatus.Active && !profile.isBlocked;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-4 text-xs font-black uppercase tracking-[0.06em] ${
        isHealthy
          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
          : 'border-red-100 bg-red-50 text-red-700'
      }`}
    >
      {isHealthy ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
      {isHealthy ? getStatusLabel(profile.status) : 'Hạn chế mượn sách'}
    </span>
  );
}

function BlockedNotice() {
  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 shadow-[0_12px_28px_rgba(239,68,68,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white text-red-600">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className="m-0 text-base font-black text-red-700">Tài khoản đang bị hạn chế mượn sách.</h2>
          <p className="m-0 mt-2 max-w-3xl text-sm font-semibold leading-6 text-red-700/80">
            Vui lòng xử lý các khoản tiền phạt chưa thanh toán hoặc liên hệ thư viện nếu cần hỗ trợ thêm.
          </p>
        </div>
      </div>
    </section>
  );
}

function IdentityPanel({ profile }: { profile: MemberView }) {
  const secondaryInfo = [profile.faculty, profile.className].filter(Boolean).join(' · ');

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-brand-600 font-display text-[1.8rem] font-black text-white shadow-[0_18px_38px_rgba(38,117,217,0.22)]">
          {getInitials(profile.fullName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="m-0 font-display text-[2rem] font-black leading-tight tracking-tight text-slate-950">{profile.fullName}</h2>
            <StatusPill profile={profile} />
          </div>
          <p className="m-0 mt-2 font-mono text-base font-black text-brand-700">{profile.memberCardNo}</p>
          {secondaryInfo ? <p className="m-0 mt-2 text-sm font-medium text-slate-500">{secondaryInfo}</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <span className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-4 text-sm font-bold text-slate-600">{getRoleLabel(profile.role)}</span>
            {profile.membershipTier ? (
              <span className="inline-flex min-h-9 items-center rounded-full bg-brand-50 px-4 text-sm font-bold text-brand-700">{formatMembershipTier(profile.membershipTier)}</span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProfileOverviewSection({ profile, stats }: { profile: MemberView; stats?: MemberStatsView }) {
  return (
    <>
      {profile.status !== MemberStatus.Active || profile.isBlocked ? <BlockedNotice /> : null}

      <IdentityPanel profile={profile} />

      <StaggerContainer className="grid gap-5 lg:grid-cols-4">
        <ReaderSummaryCard icon={BookOpen} title="Đang mượn" value={stats?.activeLoans ?? '?'} description="Khoản mượn còn hiệu lực" tone="blue" />
        <ReaderSummaryCard icon={CalendarDays} title="Đặt chỗ" value={stats?.activeReservations ?? '?'} description="Yêu cầu đang chờ" tone="amber" />
        <ReaderSummaryCard icon={DollarSign} title="Phạt chưa thanh toán" value={stats ? formatAmount(stats.unpaidFineTotal) : '?'} description={`${stats?.unpaidFineCount ?? 0} khoản`} tone="red" />
        <ReaderSummaryCard icon={CheckCircle2} title="Lượt mượn hoàn tất" value={stats?.completedLoans ?? '?'} description="Đã trả thành công" tone="emerald" />
      </StaggerContainer>
    </>
  );
}

function InfoPanel({
  title,
  items,
  action,
}: {
  title: string;
  items: InfoItem[];
  action?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">{title}</h2>
        {action}
      </div>
      <StaggerContainer className="mt-5 grid gap-3">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <StaggerItem className="flex min-h-[72px] items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3" key={item.label}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-xs font-black uppercase tracking-[0.08em] text-slate-400">{item.label}</p>
                <p className="m-0 mt-1 break-words text-sm font-bold text-slate-800">{item.value}</p>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </section>
  );
}

export function ProfileDetailsSection({ profile, onEdit }: { profile: MemberView; onEdit: () => void }) {
  const personalItems: InfoItem[] = [
    { icon: UserRound, label: 'Họ và tên', value: profile.fullName },
    { icon: Mail, label: 'Email', value: profile.email },
    { icon: Phone, label: 'Số điện thoại', value: profile.phone || '-' },
    { icon: GraduationCap, label: 'Mã sinh viên', value: profile.studentId || '-' },
    { icon: Library, label: 'Khoa', value: profile.faculty || '-' },
    { icon: MapPin, label: 'Cơ sở', value: profile.campus || '-' },
  ];
  const libraryItems: InfoItem[] = [
    { icon: CreditCard, label: 'Mã thẻ thư viện', value: profile.memberCardNo },
    { icon: BadgeCheck, label: 'Vai trò', value: getRoleLabel(profile.role) },
    { icon: ShieldCheck, label: 'Trạng thái', value: profile.isBlocked ? 'Hạn chế mượn sách' : getStatusLabel(profile.status) },
    { icon: CalendarDays, label: 'Ngày tham gia', value: formatDate(profile.joinDate) },
    { icon: CalendarDays, label: 'Ngày hết hạn', value: formatDate(profile.expiryDate) },
    { icon: Library, label: 'Thư viện mặc định', value: profile.libraryBranch || '-' },
  ];

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <InfoPanel
        title="Thông tin cá nhân"
        items={personalItems}
        action={
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-sm font-bold text-brand-700 transition hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            type="button"
            onClick={onEdit}
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Chỉnh sửa
          </button>
        }
      />
      <InfoPanel title="Thông tin thư viện" items={libraryItems} />
    </section>
  );
}

function ActivityIcon({ activity }: { activity: MemberActivityItem }) {
  if (activity.kind === 'FINE_PAID') {
    return <DollarSign className="h-5 w-5" aria-hidden="true" />;
  }

  if (activity.kind === 'RESERVATION_CREATED' || activity.kind === 'RESERVATION_CANCELLED') {
    return <CalendarDays className="h-5 w-5" aria-hidden="true" />;
  }

  return <Library className="h-5 w-5" aria-hidden="true" />;
}

function ActivitySection({
  activities,
  loading,
}: {
  activities: MemberActivityItem[];
  loading: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
      <div className="mb-5 flex items-center gap-3">
        <HistoryIcon className="h-6 w-6 text-slate-400" />
        <h2 className="m-0 font-display text-2xl font-black tracking-tight text-slate-950">Hoạt động gần đây</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-[72px] animate-pulse rounded-xl bg-slate-100" key={index} />
          ))}
        </div>
      ) : activities.length > 0 ? (
        <StaggerContainer className="divide-y divide-slate-100">
          {activities.map((activity) => (
            <StaggerItem className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" key={activity.id}>
              <div className="flex min-w-0 items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <ActivityIcon activity={activity} />
                </span>
                <div className="min-w-0">
                  <p className="m-0 font-bold text-slate-900">{activity.title}</p>
                  <p className="m-0 mt-1 line-clamp-2 text-sm font-medium text-slate-500">{activity.description}</p>
                </div>
              </div>
              <span className="shrink-0 font-mono text-xs font-bold text-slate-400">{formatDate(activity.occurredAt)}</span>
            </StaggerItem>
          ))}
        </StaggerContainer>
      ) : (
        <ReaderEmptyState
          icon={Clock3}
          title="Chưa có hoạt động nào"
          description="Khi bạn mượn, trả, đặt chỗ hoặc thanh toán phạt, lịch sử sẽ xuất hiện tại đây."
        />
      )}
    </section>
  );
}

function HistoryIcon(props: { className?: string }) {
  return <Clock3 className={props.className} aria-hidden="true" />;
}

function SecurityPanel({ profile }: { profile: MemberView }) {
  const securityItems: InfoItem[] = [
    { icon: KeyRound, label: 'Đăng nhập gần nhất', value: profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '-' },
    { icon: ShieldCheck, label: 'Mật khẩu cập nhật', value: profile.passwordUpdatedAt ? formatDate(profile.passwordUpdatedAt) : '-' },
  ];

  return <InfoPanel title="Bảo mật tài khoản" items={securityItems} />;
}

export function ProfileActivitySection({
  profile,
  activities,
  loading,
}: {
  profile: MemberView;
  activities: MemberActivityItem[];
  loading: boolean;
}) {
  return (
    <StaggerContainer className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <StaggerItem>
        <ActivitySection activities={activities} loading={loading} />
      </StaggerItem>
      <StaggerItem>
        <SecurityPanel profile={profile} />
      </StaggerItem>
    </StaggerContainer>
  );
}
