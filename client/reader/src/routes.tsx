import type { ReactElement } from 'react';
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';

import { useAuth, useBootstrapAuth } from './hooks/useAuth';
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

function FullScreenLoader() {
  return <div className="loading-state">Dang tai du lieu...</div>;
}

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
    <div className="page-stack">
      <section className="empty-state">
        <h1>Khong tim thay trang</h1>
        <p className="page-description">Duong dan ban vua truy cap khong ton tai trong khu vuc ban doc.</p>
      </section>
    </div>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <ReaderLayout />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'search', element: <SearchPage /> },
        { path: 'books/:id', element: <BookDetailPage /> },
        {
          path: 'login',
          element: (
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          ),
        },
        {
          path: 'register',
          element: (
            <GuestOnly>
              <RegisterPage />
            </GuestOnly>
          ),
        },
        {
          path: 'my-loans',
          element: (
            <ProtectedRoute>
              <MyLoansPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'my-reservations',
          element: (
            <ProtectedRoute>
              <MyReservationsPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'my-fines',
          element: (
            <ProtectedRoute>
              <MyFinesPage />
            </ProtectedRoute>
          ),
        },
        {
          path: 'profile',
          element: (
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
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
