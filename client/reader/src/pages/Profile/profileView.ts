import type { AuthUser, MemberView } from '../../types/models';
import type { UpdateMyProfilePayload } from '../../services/member.api';
import type { LucideIcon } from 'lucide-react';

export interface InfoItem {
  icon: LucideIcon;
  label: string;
  value: string;
}

export interface ProfileFormState {
  fullName: string;
  email: string;
  phone: string;
  studentId: string;
  faculty: string;
  className: string;
}

export function formatAmount(value: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`;
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function formatMembershipTier(value?: string | null): string {
  if (!value) {
    return '-';
  }

  const tierMap: Record<string, string> = {
    standard: 'Tiêu chuẩn',
    priority: 'Ưu tiên',
    faculty: 'Giảng viên',
    staff: 'Nhân sự',
    admin: 'Quản trị',
  };

  return tierMap[value] ?? value;
}

export function getProfileFormState(profile: MemberView): ProfileFormState {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone ?? '',
    studentId: profile.studentId ?? '',
    faculty: profile.faculty ?? '',
    className: profile.className ?? '',
  };
}

export function buildProfilePayload(form: ProfileFormState): UpdateMyProfilePayload {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    phone: form.phone.trim(),
    studentId: form.studentId.trim(),
    faculty: form.faculty.trim(),
    className: form.className.trim(),
  };
}

export function mergeProfileWithAuth(profile: MemberView, user: AuthUser | null | undefined): MemberView {
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
