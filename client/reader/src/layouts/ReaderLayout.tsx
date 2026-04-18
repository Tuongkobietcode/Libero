import { NavLink, Outlet } from 'react-router-dom';

import { useAuth, useBootstrapAuth } from '../hooks/useAuth';
import { getRoleLabel } from '../utils/display';

function getNavLinkClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'reader-nav-link active' : 'reader-nav-link';
}

export default function ReaderLayout() {
  useBootstrapAuth();
  const { initialized, isAuthenticated, user, logout } = useAuth();

  return (
    <div className="reader-shell">
      <header className="reader-header">
        <div className="reader-header-inner">
          <NavLink to="/" className="brand-mark">
            <span className="brand-title">LIBERO Reader</span>
            <span className="brand-subtitle">Tra cuu, dat cho va theo doi tai khoan thu vien</span>
          </NavLink>

          <nav className="reader-nav" aria-label="Dieu huong ban doc">
            <NavLink to="/" end className={getNavLinkClass}>
              Trang chu
            </NavLink>
            <NavLink to="/search" className={getNavLinkClass}>
              Tim sach
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink to="/my-loans" className={getNavLinkClass}>
                  Sach dang muon
                </NavLink>
                <NavLink to="/my-reservations" className={getNavLinkClass}>
                  Dat cho
                </NavLink>
                <NavLink to="/my-fines" className={getNavLinkClass}>
                  Tien phat
                </NavLink>
                <NavLink to="/profile" className={getNavLinkClass}>
                  Ho so
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className="reader-auth">
            {!initialized ? (
              <span className="reader-user-chip">Dang tai phien...</span>
            ) : isAuthenticated && user ? (
              <>
                <span className="reader-user-chip">
                  <strong>{user.fullName ?? 'Ban doc'}</strong>
                  <span>{getRoleLabel(user.role)}</span>
                </span>
                <button className="button secondary" type="button" onClick={() => void logout()}>
                  Dang xuat
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="reader-nav-link">
                  Dang nhap
                </NavLink>
                <NavLink to="/register" className="button">
                  Dang ky
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="reader-main">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="footer-note">LIBERO Reader • Functional-first UI cho quy trinh thu vien</footer>
    </div>
  );
}
