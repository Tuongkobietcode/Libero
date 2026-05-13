import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
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
  type LucideIcon,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { memberApi } from '../../services/member.api';
import { useNotificationsStore } from '../../store/notifications.store';
import { MemberStatus, type MemberActivityItem, type MemberView } from '../../types/models';
import { getRoleLabel, getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatDate, formatDateTime } from '../../utils/format';

interface InfoItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

function formatAmount(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function mergeProfileWithAuth(profile: MemberView, user: ReturnType<typeof useAuth>['user']): MemberView {
  if (!user) {
    return profile;
  }

  return {
    ...profile,
    _id: user._id ?? profile._id,
    fullName: user.fullName ?? profile.fullName,
    email: user.email ?? profile.email,
    role: user.role ?? profile.role,
    memberCardNo: user.memberCardNo ?? profile.memberCardNo,
    status: user.status ?? profile.status,
    isBlocked: user.isBlocked ?? profile.isBlocked,
  };
}

function StatusPill({ profile }: { profile: MemberView }) {
  const isHealthy = profile.status === MemberStatus.Active && !profile.isBlocked;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-sm font-extrabold ${
        isHealthy ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
      }`}
    >
      {isHealthy ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <AlertCircle className="h-4 w-4" aria-hidden="true" />}
      {isHealthy ? getStatusLabel(profile.status) : 'Hạn chế mượn sách'}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tone: 'blue' | 'emerald' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-50 text-[#2675d9]'
      : tone === 'emerald'
        ? 'bg-emerald-50 text-emerald-600'
        : tone === 'amber'
          ? 'bg-amber-50 text-amber-600'
          : 'bg-red-50 text-red-600';

  return (
    <article className="flex min-h-[116px] items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_14px_32px_rgba(15,31,56,0.04)]">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full ${toneClass}`}>
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-sm font-semibold text-slate-500">{label}</p>
        <strong className="mt-1 block text-[1.55rem] leading-tight text-[#0f1f44]">{value}</strong>
      </div>
    </article>
  );
}

function InfoGrid({ title, items }: { title: string; items: InfoItem[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,31,56,0.04)]">
      <h2 className="m-0 text-lg font-extrabold text-[#0f1f44]">{title}</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div className="flex min-h-[74px] items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3" key={item.label}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-slate-500 shadow-sm">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="m-0 text-xs font-bold uppercase text-slate-400">{item.label}</p>
                <p className="m-0 mt-1 break-words text-sm font-extrabold text-slate-800">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ProfilePage() {
  const notify = useNotificationsStore((state) => state.push);
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['reader-profile'],
    queryFn: () => memberApi.getMe(),
  });

  const statsQuery = useQuery({
    queryKey: ['reader-profile-stats'],
    queryFn: () => memberApi.getMyStats(),
  });

  const activitiesQuery = useQuery({
    queryKey: ['reader-profile-activities'],
    queryFn: () => memberApi.getMyActivities(5),
  });

  useEffect(() => {
    if (profileQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(profileQuery.error, 'Không thể tải thông tin hồ sơ.'),
      });
    }
  }, [notify, profileQuery.error, profileQuery.isError]);

  useEffect(() => {
    if (statsQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(statsQuery.error, 'Không thể tải thống kê hồ sơ.'),
      });
    }
  }, [notify, statsQuery.error, statsQuery.isError]);

  useEffect(() => {
    if (activitiesQuery.isError) {
      notify({
        level: 'error',
        message: extractErrorMessage(activitiesQuery.error, 'Không thể tải hoạt động gần đây.'),
      });
    }
  }, [notify, activitiesQuery.error, activitiesQuery.isError]);

  const profile = useMemo(
    () => (profileQuery.data ? mergeProfileWithAuth(profileQuery.data, user) : null),
    [profileQuery.data, user],
  );
  const stats = statsQuery.data;
  const activities: MemberActivityItem[] = activitiesQuery.data ?? [];
  const personalItems: InfoItem[] = profile
    ? [
        { icon: UserRound, label: 'Họ và tên', value: profile.fullName },
        { icon: Mail, label: 'Email', value: profile.email },
        { icon: Phone, label: 'Số điện thoại', value: profile.phone ?? '-' },
        { icon: GraduationCap, label: 'Mã sinh viên', value: profile.studentId ?? '-' },
        { icon: Library, label: 'Khoa', value: profile.faculty ?? '-' },
        { icon: MapPin, label: 'Cơ sở', value: profile.campus ?? '-' },
      ]
    : [];
  const libraryItems: InfoItem[] = profile
    ? [
        { icon: CreditCard, label: 'Mã thẻ thư viện', value: profile.memberCardNo },
        { icon: BadgeCheck, label: 'Vai trò', value: getRoleLabel(profile.role) },
        { icon: ShieldCheck, label: 'Trạng thái', value: profile.isBlocked ? 'Hạn chế mượn sách' : getStatusLabel(profile.status) },
        { icon: CalendarDays, label: 'Ngày tham gia', value: formatDate(profile.joinDate) },
        { icon: CalendarDays, label: 'Ngày hết hạn', value: formatDate(profile.expiryDate) },
        { icon: Library, label: 'Thư viện mặc định', value: profile.libraryBranch ?? '-' },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6 py-9">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-[2.35rem] font-extrabold leading-tight text-[#0f1f44]">Hồ sơ cá nhân</h1>
          <p className="m-0 mt-3 text-base text-slate-500">Quản lý thông tin tài khoản thư viện và trạng thái sử dụng dịch vụ.</p>
        </div>
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-5 text-sm font-extrabold text-[#2675d9] transition hover:bg-blue-50" type="button">
          <Edit3 className="h-4 w-4" aria-hidden="true" />
          Cập nhật hồ sơ
        </button>
      </section>

      {!profile || profileQuery.isLoading ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border border-slate-200 bg-white text-slate-500">Đang tải thông tin cá nhân...</div>
      ) : (
        <>
          {profile.status !== MemberStatus.Active || profile.isBlocked ? (
            <section className="flex gap-4 rounded-xl border border-red-200 bg-red-50 px-6 py-5 text-red-700 shadow-[0_12px_28px_rgba(239,68,68,0.08)]">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="m-0 text-base font-extrabold">Tài khoản đang bị hạn chế mượn sách.</h2>
                <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Vui lòng xử lý các khoản tiền phạt chưa thanh toán hoặc liên hệ thư viện nếu cần hỗ trợ thêm.</p>
              </div>
            </section>
          ) : null}

          <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <article className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-7 shadow-[0_18px_42px_rgba(15,31,56,0.05)]">
              <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-full bg-blue-50" />
              <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2675d9] to-[#18a999] text-[2rem] font-extrabold text-white shadow-[0_18px_38px_rgba(38,117,217,0.22)]">
                  {getInitials(profile.fullName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="m-0 text-[2rem] font-extrabold leading-tight text-[#0f1f44]">{profile.fullName}</h2>
                    <StatusPill profile={profile} />
                  </div>
                  <p className="m-0 mt-2 text-base font-bold text-[#2675d9]">{profile.memberCardNo}</p>
                  {profile.faculty || profile.className ? (
                    <p className="m-0 mt-2 text-sm text-slate-500">
                      {[profile.faculty, profile.className].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <span className="inline-flex min-h-9 items-center rounded-full bg-slate-100 px-4 text-sm font-bold text-slate-600">{getRoleLabel(profile.role)}</span>
                    {profile.membershipTier ? (
                      <span className="inline-flex min-h-9 items-center rounded-full bg-amber-50 px-4 text-sm font-bold text-amber-700">{profile.membershipTier}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-[#0f1f44] p-6 text-white shadow-[0_18px_42px_rgba(15,31,56,0.12)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="m-0 text-sm font-semibold text-blue-100">Thẻ thư viện</p>
                  <h2 className="m-0 mt-2 text-xl font-extrabold">{profile.memberCardNo}</h2>
                </div>
                <CreditCard className="h-9 w-9 text-blue-200" aria-hidden="true" />
              </div>
              <div className="mt-8 grid grid-cols-[repeat(12,1fr)] gap-1" aria-hidden="true">
                {Array.from({ length: 36 }).map((_, index) => (
                  <span className={`h-10 rounded-sm ${index % 3 === 0 ? 'bg-white/85' : index % 3 === 1 ? 'bg-white/50' : 'bg-white/25'}`} key={index} />
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="m-0 text-blue-100">Ngày tham gia</p>
                  <strong className="mt-1 block">{formatDate(profile.joinDate)}</strong>
                </div>
                <div>
                  <p className="m-0 text-blue-100">Hết hạn</p>
                  <strong className="mt-1 block">{formatDate(profile.expiryDate)}</strong>
                </div>
              </div>
            </article>
          </section>

          <section className="grid gap-5 lg:grid-cols-4">
            <StatCard icon={BookOpen} label="Đang mượn" value={stats?.activeLoans ?? '—'} tone="blue" />
            <StatCard icon={CalendarDays} label="Đặt chỗ" value={stats?.activeReservations ?? '—'} tone="amber" />
            <StatCard icon={DollarSign} label="Phạt chưa thanh toán" value={stats ? formatAmount(stats.unpaidFineTotal) : '—'} tone="red" />
            <StatCard icon={CheckCircle2} label="Lượt mượn hoàn tất" value={stats?.completedLoans ?? '—'} tone="emerald" />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <InfoGrid title="Thông tin cá nhân" items={personalItems} />
            <InfoGrid title="Thông tin thư viện" items={libraryItems} />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,31,56,0.04)]">
              <div className="flex items-center justify-between gap-4">
                <h2 className="m-0 text-lg font-extrabold text-[#0f1f44]">Hoạt động gần đây</h2>
                <button className="text-sm font-extrabold text-[#2675d9]" type="button">Xem tất cả</button>
              </div>
              <div className="mt-5 divide-y divide-slate-100">
                {activitiesQuery.isLoading ? (
                  <p className="py-4 text-sm text-slate-500">Đang tải hoạt động...</p>
                ) : activities.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">Chưa có hoạt động nào.</p>
                ) : (
                  activities.map((activity) => (
                    <div className="flex items-center justify-between gap-4 py-4" key={activity.id}>
                      <div className="flex min-w-0 items-center gap-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-[#2675d9]">
                          <Library className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 font-extrabold text-slate-800">{activity.title}</p>
                          <p className="m-0 mt-1 truncate text-sm text-slate-500">{activity.description}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-slate-400">{formatDate(activity.occurredAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_14px_32px_rgba(15,31,56,0.04)]">
              <h2 className="m-0 text-lg font-extrabold text-[#0f1f44]">Bảo mật tài khoản</h2>
              <div className="mt-5 grid gap-4">
                <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-500 shadow-sm">
                    <KeyRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="m-0 text-xs font-bold uppercase text-slate-400">Đăng nhập gần nhất</p>
                    <p className="m-0 mt-1 text-sm font-extrabold text-slate-800">{profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-slate-500 shadow-sm">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="m-0 text-xs font-bold uppercase text-slate-400">Mật khẩu cập nhật</p>
                    <p className="m-0 mt-1 text-sm font-extrabold text-slate-800">{profile.passwordUpdatedAt ? formatDate(profile.passwordUpdatedAt) : '—'}</p>
                  </div>
                </div>
                <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#2675d9] px-5 text-sm font-extrabold text-white transition hover:bg-[#1f67c3]" type="button">
                  Đổi mật khẩu
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
