import { Result, Spin } from 'antd';
import type { ReactElement } from 'react';
import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom';

import { useAuth, useBootstrapAuth } from './hooks/useAuth';
import AdminLayout from './layouts/AdminLayout';
import LoginPage from './pages/Auth/Login';
import DashboardPage from './pages/Dashboard';
import BookDetailPage from './pages/Catalog/BookDetail';
import BookFormPage from './pages/Catalog/BookForm';
import BookListPage from './pages/Catalog/BookList';
import CSVImportPage from './pages/Catalog/CSVImport';
import CheckoutPage from './pages/Circulation/Checkout';
import ReturnPage from './pages/Circulation/Return';
import FineManagerPage from './pages/Fines/FineManager';
import MemberDetailPage from './pages/Members/MemberDetail';
import MemberFormPage from './pages/Members/MemberForm';
import MemberListPage from './pages/Members/MemberList';
import FineStatsPage from './pages/Reports/FineStats';
import InventoryPage from './pages/Reports/Inventory';
import LoanStatsPage from './pages/Reports/LoanStats';
import OverdueListPage from './pages/Reports/OverdueList';
import PopularBooksPage from './pages/Reports/PopularBooks';
import FineRatesPage from './pages/Settings/FineRates';
import LoanPoliciesPage from './pages/Settings/LoanPolicies';
import { Role } from './types/models';

function FullScreenSpinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <Spin size="large" />
    </div>
  );
}

function AuthGate({
  children,
  allowedRoles,
  fallbackPath = '/login',
}: {
  children: ReactElement;
  allowedRoles?: Role[];
  fallbackPath?: string;
}) {
  useBootstrapAuth();
  const location = useLocation();
  const { initialized, isAuthenticated, user } = useAuth();

  if (!initialized) {
    return <FullScreenSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

function GuestOnly({ children }: { children: ReactElement }) {
  useBootstrapAuth();
  const { initialized, isAuthenticated } = useAuth();

  if (!initialized) {
    return <FullScreenSpinner />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AdminOnly({ children }: { children: ReactElement }) {
  return (
    <AuthGate allowedRoles={[Role.Admin]} fallbackPath="/">
      {children}
    </AuthGate>
  );
}

function NotFoundPage() {
  return <Result status="404" title="Không tìm thấy trang" subTitle="Trang quản trị bạn yêu cầu không tồn tại." />;
}

export const router = createBrowserRouter(
  [
    {
      path: '/login',
      element: (
        <GuestOnly>
          <LoginPage />
        </GuestOnly>
      ),
    },
    {
      path: '/',
      element: (
        <AuthGate allowedRoles={[Role.Librarian, Role.Admin]}>
          <AdminLayout />
        </AuthGate>
      ),
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'catalog', element: <BookListPage /> },
        { path: 'catalog/new', element: <BookFormPage /> },
        { path: 'catalog/import', element: <CSVImportPage /> },
        { path: 'catalog/:id', element: <BookDetailPage /> },
        { path: 'catalog/:id/edit', element: <BookFormPage /> },
        { path: 'members', element: <MemberListPage /> },
        { path: 'members/new', element: <MemberFormPage /> },
        { path: 'members/:id', element: <MemberDetailPage /> },
        { path: 'members/:id/edit', element: <MemberFormPage /> },
        { path: 'circulation/checkout', element: <CheckoutPage /> },
        { path: 'circulation/return', element: <ReturnPage /> },
        { path: 'fines', element: <FineManagerPage /> },
        { path: 'reports/loan-stats', element: <LoanStatsPage /> },
        { path: 'reports/overdue', element: <OverdueListPage /> },
        { path: 'reports/popular-books', element: <PopularBooksPage /> },
        { path: 'reports/inventory', element: <InventoryPage /> },
        { path: 'reports/fine-stats', element: <FineStatsPage /> },
        {
          path: 'settings/loan-policies',
          element: (
            <AdminOnly>
              <LoanPoliciesPage />
            </AdminOnly>
          ),
        },
        {
          path: 'settings/fine-rates',
          element: (
            <AdminOnly>
              <FineRatesPage />
            </AdminOnly>
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
