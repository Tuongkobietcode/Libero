import { Outlet } from 'react-router-dom';

import Toast from '../components/Toast';
import { ReaderFooter } from '../components/layout/ReaderFooter';
import { ReaderHeader } from '../components/layout/ReaderHeader';
import { RouteTransition } from '../components/motion/ReaderMotion';
import { useBootstrapAuth } from '../hooks/useAuth';
import { useRealtime } from '../hooks/useRealtime';

export default function ReaderLayout() {
  useBootstrapAuth();
  useRealtime();

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-slate-900">
      <ReaderHeader />

      <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <RouteTransition>
          <Outlet />
        </RouteTransition>
      </main>

      <Toast />
      <ReaderFooter />
    </div>
  );
}
