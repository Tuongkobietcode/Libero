import { Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import BookDetailPage from '../pages/BookDetail';
import { renderWithProviders } from '../test/render';
import { useAuthStore } from '../store/auth.store';
import { CopyStatus, MemberStatus, ReservationStatus, Role } from '../types/models';

const getBookMock = vi.fn();
const listMyReservationsMock = vi.fn();
const createReservationMock = vi.fn();

vi.mock('../services/catalog.api', () => ({
  catalogApi: {
    getBook: (...args: unknown[]) => getBookMock(...args),
  },
}));

vi.mock('../services/reservation.api', () => ({
  reservationApi: {
    listMyReservations: (...args: unknown[]) => listMyReservationsMock(...args),
    createReservation: (...args: unknown[]) => createReservationMock(...args),
  },
}));

describe('BookDetailPage', () => {
  beforeEach(() => {
    getBookMock.mockReset();
    listMyReservationsMock.mockReset();
    createReservationMock.mockReset();

    useAuthStore.setState({
      accessToken: 'reader-token',
      user: {
        _id: 'reader-1',
        role: Role.Student,
        isBlocked: false,
        status: MemberStatus.Active,
        fullName: 'Reader User',
      },
      initialized: true,
    });
  });

  it('shows reserve action when all copies are unavailable and lets reader place a reservation', async () => {
    getBookMock.mockResolvedValue({
      _id: 'book-1',
      isbn: '9781111111111',
      title: 'Unavailable Book',
      authors: [{ _id: 'author-1', name: 'Author One' }],
      categories: [{ _id: 'cat-1', name: 'Testing' }],
      totalCopies: 2,
      availableCopies: 0,
      copies: [
        { _id: 'copy-1', barcode: 'COPY-1', status: CopyStatus.Borrowed, shelfLocation: 'A1' },
        { _id: 'copy-2', barcode: 'COPY-2', status: CopyStatus.Reserved, shelfLocation: 'A2' },
      ],
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });
    listMyReservationsMock.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
    });
    createReservationMock.mockResolvedValue({
      _id: 'res-1',
      member: {
        _id: 'reader-1',
        fullName: 'Reader User',
        email: 'reader@example.com',
        memberCardNo: 'MEM-1',
        role: Role.Student,
        status: MemberStatus.Active,
        isBlocked: false,
      },
      book: {
        _id: 'book-1',
        isbn: '9781111111111',
        title: 'Unavailable Book',
      },
      queuePosition: 1,
      status: ReservationStatus.Waiting,
      requestDate: '2026-04-17T00:00:00.000Z',
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });

    renderWithProviders(
      <Routes>
        <Route path="/books/:id" element={<BookDetailPage />} />
      </Routes>,
      { route: '/books/book-1' },
    );

    const reserveButton = await screen.findByRole('button', { name: 'Đặt chỗ sách này' });
    await userEvent.click(reserveButton);

    await waitFor(() => {
      expect(createReservationMock).toHaveBeenCalledWith('book-1');
    });

    expect(await screen.findByText(/Đặt chỗ thành công/i)).toBeInTheDocument();
  });

  it('does not allow blocked readers to reserve even when all copies are unavailable', async () => {
    useAuthStore.setState({
      accessToken: 'reader-token',
      user: {
        _id: 'reader-1',
        role: Role.Student,
        isBlocked: true,
        status: MemberStatus.Active,
        fullName: 'Blocked Reader',
      },
      initialized: true,
    });

    getBookMock.mockResolvedValue({
      _id: 'book-1',
      isbn: '9781111111111',
      title: 'Unavailable Book',
      authors: [{ _id: 'author-1', name: 'Author One' }],
      categories: [{ _id: 'cat-1', name: 'Testing' }],
      totalCopies: 2,
      availableCopies: 0,
      copies: [
        { _id: 'copy-1', barcode: 'COPY-1', status: CopyStatus.Borrowed, shelfLocation: 'A1' },
        { _id: 'copy-2', barcode: 'COPY-2', status: CopyStatus.Reserved, shelfLocation: 'A2' },
      ],
      createdAt: '2026-04-17T00:00:00.000Z',
      updatedAt: '2026-04-17T00:00:00.000Z',
    });
    listMyReservationsMock.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 100, totalItems: 0, totalPages: 0 },
    });

    renderWithProviders(
      <Routes>
        <Route path="/books/:id" element={<BookDetailPage />} />
      </Routes>,
      { route: '/books/book-1' },
    );

    expect(await screen.findByText('Unavailable Book')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đặt chỗ sách này' })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Tài khoản của bạn đang bị khóa nên không thể đặt chỗ thêm/i),
    ).toBeInTheDocument();
    expect(createReservationMock).not.toHaveBeenCalled();
  });
});
