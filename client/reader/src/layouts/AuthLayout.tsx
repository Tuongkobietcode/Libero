import { Outlet, useLocation } from 'react-router-dom';

import Toast from '../components/Toast';
import AuthBackground from './AuthBackground';

export default function AuthLayout() {
  const location = useLocation();
  const isRegisterPage = location.pathname.endsWith('/register');

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-surface text-slate-900">
      <AuthBackground variant={isRegisterPage ? 'register' : 'login'} />

      <main
        className={`relative z-10 grid flex-1 place-items-center px-4 ${
          isRegisterPage ? 'py-8 sm:px-6 sm:py-[52px]' : 'pb-5 pt-14 sm:px-6 sm:pt-[72px]'
        }`}
      >
        <Outlet />
      </main>

      {!isRegisterPage ? (
        <footer className="relative z-10 px-4 pb-8 text-center text-[15px] text-slate-500 sm:pb-[68px]">
          Cần hỗ trợ?{' '}
          <a className="font-bold text-brand-600 transition-colors hover:text-brand-700" href="mailto:support@library.edu">
            Liên hệ với chúng tôi
          </a>
        </footer>
      ) : null}
      <Toast />
    </div>
  );
}
