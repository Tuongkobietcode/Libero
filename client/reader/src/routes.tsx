import type { ReactElement } from 'react';
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';

import { FullScreenLoader } from './components/ui';
import { useAuth, useBootstrapAuth } from './hooks/useAuth';
import AuthLayout from './layouts/AuthLayout';
import ReaderLayout from './layouts/ReaderLayout';
import BookDetailPage from './pages/BookDetail';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import MyFinesPage from './pages/MyFines';
import MyLoansPage from './pages/MyLoans';
import MyReservationsPage from './pages/MyReservations';
import ProfilePage from './pages/Profile';
import RegisterPage from './pages/Register';
import SearchPage from './pages/Search';

function ProtectedRoute({ children }: { children: ReactElement }) {
  useBootstrapAuth();
  const location = useLocation();
  const { initialized, isAuthenticated } = useAuth();

  if (!initialized) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function GuestOnly({ children }: { children: ReactElement }) {
  useBootstrapAuth();
  const { initialized, isAuthenticated } = useAuth();

  if (!initialized) {
    return <FullScreenLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function NotFoundPage() {
  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_20px_50px_rgba(15,31,56,0.08)]">
        <h1 className="m-0 text-2xl font-bold text-slate-900">Không tìm thấy trang</h1>
        <p className="mt-2 text-slate-500">Đường dẫn bạn vừa truy cập không tồn tại trong khu vực bạn đọc.</p>
      </section>
    </div>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <ReaderLayout />
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <HomePage /> },
        { path: 'search', element: <SearchPage /> },
        { path: 'books/:id', element: <BookDetailPage /> },
        { path: 'my-loans', element: <MyLoansPage /> },
        { path: 'my-reservations', element: <MyReservationsPage /> },
        { path: 'my-fines', element: <MyFinesPage /> },
        { path: 'profile', element: <ProfilePage /> },
      ],
    },
    {
      path: '/register',
      element: <AuthLayout />,
      children: [
        {
          index: true,
          element: (
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          ),
        },
      ],
    },
    {
      path: '/login',
      element: <AuthLayout />,
      children: [
        {
          index: true,
          element: (
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          ),
        },
      ],
    },
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);
