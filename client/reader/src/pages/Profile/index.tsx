import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../hooks/useAuth';
import { memberApi, type ChangeMyPasswordPayload, type UpdateMyProfilePayload } from '../../services/member.api';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationsStore } from '../../store/notifications.store';
import { extractErrorMessage } from '../../utils/format';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { EditProfileModal } from './components/EditProfileModal';
import { ProfileActivitySection, ProfileDetailsSection, ProfileHeader, ProfileOverviewSection } from './components/ProfileSections';
import { mergeProfileWithAuth } from './profileView';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const notify = useNotificationsStore((state) => state.push);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

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

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateMyProfilePayload) => memberApi.updateMyProfile(payload),
    onSuccess: (updatedProfile) => {
      notify({
        level: 'success',
        message: 'Đã cập nhật hồ sơ',
        description: 'Thông tin cá nhân của bạn đã được lưu.',
      });
      setEditOpen(false);
      queryClient.setQueryData(['reader-profile'], updatedProfile);
      if (user) {
        setAuthUser({
          ...user,
          fullName: updatedProfile.fullName,
          email: updatedProfile.email,
          memberCardNo: updatedProfile.memberCardNo,
          status: updatedProfile.status,
          isBlocked: updatedProfile.isBlocked,
        });
      }
      void queryClient.invalidateQueries({ queryKey: ['reader-profile'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể cập nhật hồ sơ lúc này.'),
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (payload: ChangeMyPasswordPayload) => memberApi.changeMyPassword(payload),
    onSuccess: (updatedProfile) => {
      notify({
        level: 'success',
        message: 'Đã đổi mật khẩu',
        description: 'Mật khẩu đăng nhập của bạn đã được cập nhật.',
      });
      setChangePasswordOpen(false);
      queryClient.setQueryData(['reader-profile'], updatedProfile);
      void queryClient.invalidateQueries({ queryKey: ['reader-profile'] });
    },
    onError: (error) => {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể đổi mật khẩu lúc này.'),
      });
    },
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
  const activities = activitiesQuery.data ?? [];
  return (
    <div className="flex flex-col gap-6 py-7">
      <ProfileHeader />

      {!profile || profileQuery.isLoading ? (
        <div className="grid min-h-[320px] place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-[0_12px_30px_rgba(15,31,56,0.04)]">
          Đang tải thông tin cá nhân...
        </div>
      ) : (
        <>
          <ProfileOverviewSection profile={profile} stats={stats} />

          <ProfileDetailsSection profile={profile} onEdit={() => setEditOpen(true)} />

          <ProfileActivitySection
            profile={profile}
            activities={activities}
            loading={activitiesQuery.isLoading}
            onChangePassword={() => setChangePasswordOpen(true)}
          />

          <EditProfileModal
            open={editOpen}
            profile={profile}
            saving={updateProfileMutation.isPending}
            onClose={() => setEditOpen(false)}
            onSubmit={(payload) => updateProfileMutation.mutate(payload)}
          />

          <ChangePasswordModal
            open={changePasswordOpen}
            saving={changePasswordMutation.isPending}
            onClose={() => setChangePasswordOpen(false)}
            onSubmit={(payload) => changePasswordMutation.mutate(payload)}
          />
        </>
      )}
    </div>
  );
}
