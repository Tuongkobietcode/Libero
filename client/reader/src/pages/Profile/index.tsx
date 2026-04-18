import { useQuery } from '@tanstack/react-query';

import { memberApi } from '../../services/member.api';
import { getRoleLabel, getStatusLabel } from '../../utils/display';
import { extractErrorMessage, formatDate } from '../../utils/format';

export default function ProfilePage() {
  const profileQuery = useQuery({
    queryKey: ['reader-profile'],
    queryFn: () => memberApi.getMe(),
  });

  return (
    <div className="page-stack">
      <section className="card">
        <div className="page-header">
          <h1 className="page-title">Ho so ca nhan</h1>
          <p className="page-description">Thong tin tai khoan thu vien hien tai duoc dong bo truc tiep tu backend.</p>
        </div>
      </section>

      <section className="card">
        {profileQuery.isLoading ? <div className="loading-state">Dang tai thong tin ca nhan...</div> : null}
        {profileQuery.isError ? (
          <div className="error-banner">{extractErrorMessage(profileQuery.error, 'Khong the tai thong tin ho so.')}</div>
        ) : null}
        {!profileQuery.isLoading && !profileQuery.isError && profileQuery.data ? (
          <>
            {profileQuery.data.status !== 'active' ? (
              <div className="warning-banner">
                Trang thai tai khoan hien tai: {getStatusLabel(profileQuery.data.status)}. Ban vui long lien he thu vien neu can ho tro them.
              </div>
            ) : null}
            {profileQuery.data.isBlocked ? (
              <div className="warning-banner">
                Tai khoan dang bi block do vi pham dieu kien muon sach hoac con cong no chua xu ly.
              </div>
            ) : null}

            <div className="profile-grid">
              <div className="profile-item">
                <strong>Ho va ten</strong>
                <span>{profileQuery.data.fullName}</span>
              </div>
              <div className="profile-item">
                <strong>Email</strong>
                <span>{profileQuery.data.email}</span>
              </div>
              <div className="profile-item">
                <strong>Vai tro</strong>
                <span>{getRoleLabel(profileQuery.data.role)}</span>
              </div>
              <div className="profile-item">
                <strong>Trang thai</strong>
                <span>{getStatusLabel(profileQuery.data.status)}</span>
              </div>
              <div className="profile-item">
                <strong>Ma the thu vien</strong>
                <span>{profileQuery.data.memberCardNo}</span>
              </div>
              <div className="profile-item">
                <strong>So dien thoai</strong>
                <span>{profileQuery.data.phone ?? '-'}</span>
              </div>
              <div className="profile-item">
                <strong>Ma sinh vien</strong>
                <span>{profileQuery.data.studentId ?? '-'}</span>
              </div>
              <div className="profile-item">
                <strong>Ngay tham gia</strong>
                <span>{formatDate(profileQuery.data.joinDate)}</span>
              </div>
              <div className="profile-item">
                <strong>Ngay het han</strong>
                <span>{formatDate(profileQuery.data.expiryDate)}</span>
              </div>
              <div className="profile-item">
                <strong>Bi khoa muon sach</strong>
                <span>{profileQuery.data.isBlocked ? 'Co' : 'Khong'}</span>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
