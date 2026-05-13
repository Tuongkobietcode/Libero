import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateCheckoutPage from '../pages/Circulation/CreateCheckout';
import { useNotificationsStore } from '../store/notifications.store';
import { CopyStatus, FineStatus, LoanStatus, MemberStatus, Role } from '../types/models';
import { renderWithProviders } from '../test/render';

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn(),
  listLoanPolicies: vi.fn(),
  listBooks: vi.fn(),
  getBook: vi.fn(),
  listLoans: vi.fn(),
  listFines: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock('../services/member.api', () => ({
  memberApi: {
    listMembers: mocks.listMembers,
    listLoanPolicies: mocks.listLoanPolicies,
  },
}));

vi.mock('../services/catalog.api', () => ({
  catalogApi: {
    listBooks: mocks.listBooks,
    getBook: mocks.getBook,
  },
}));

vi.mock('../services/fine.api', () => ({
  fineApi: {
    listFines: mocks.listFines,
  },
}));

vi.mock('../services/loan.api', () => ({
  loanApi: {
    checkout: mocks.checkout,
    listLoans: mocks.listLoans,
  },
}));

describe('CreateCheckoutPage', () => {
  beforeEach(() => {
    useNotificationsStore.getState().clear();
    Object.values(mocks).forEach((mock) => mock.mockReset());

    mocks.listMembers.mockResolvedValue({
      items: [
        {
          _id: 'member-1',
          fullName: 'Nguyen Van A',
          email: 'member1@example.com',
          role: Role.Student,
          memberCardNo: 'CARD-001',
          status: MemberStatus.Active,
          isBlocked: false,
          failedLoginCount: 0,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 8,
        totalItems: 1,
        totalPages: 1,
      },
    });

    mocks.listLoanPolicies.mockResolvedValue([
      {
        role: Role.Student,
        maxBooks: 3,
        loanDays: 14,
        maxRenewals: 1,
        renewDays: 7,
        effectiveFrom: '2026-01-01T00:00:00.000Z',
      },
    ]);

    mocks.listBooks.mockResolvedValue({
      items: [
        {
          _id: 'book-1',
          isbn: '9786041234567',
          title: 'Distributed Systems',
          authors: [{ _id: 'author-1', name: 'Martin Kleppmann' }],
          categories: [],
          totalCopies: 1,
          availableCopies: 1,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 6,
        totalItems: 1,
        totalPages: 1,
      },
    });

    mocks.getBook.mockResolvedValue({
      _id: 'book-1',
      isbn: '9786041234567',
      title: 'Distributed Systems',
      authors: [{ _id: 'author-1', name: 'Martin Kleppmann' }],
      categories: [],
      totalCopies: 1,
      availableCopies: 1,
      copies: [
        {
          _id: 'copy-1',
          barcode: 'BC-100',
          status: CopyStatus.Available,
          shelfLocation: 'A-01',
        },
      ],
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    });

    mocks.listLoans.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 1,
        totalItems: 0,
        totalPages: 1,
      },
    });

    mocks.listFines.mockResolvedValue({
      summary: {
        unpaidTotal: 0,
        paidTotal: 0,
        waivedTotal: 0,
      },
      items: [],
      pagination: {
        page: 1,
        limit: 1,
        totalItems: 0,
        totalPages: 1,
      },
    });

    mocks.checkout.mockResolvedValue({
      _id: 'loan-1',
      member: {
        _id: 'member-1',
        fullName: 'Nguyen Van A',
        email: 'member1@example.com',
        memberCardNo: 'CARD-001',
        role: Role.Student,
        status: MemberStatus.Active,
        isBlocked: false,
      },
      book: {
        _id: 'book-1',
        isbn: '9786041234567',
        title: 'Distributed Systems',
        authors: [{ _id: 'author-1', name: 'Martin Kleppmann' }],
      },
      copy: {
        _id: 'copy-1',
        barcode: 'BC-100',
        status: CopyStatus.Borrowed,
      },
      checkoutDate: '2026-04-10T08:00:00.000Z',
      dueDate: '2026-04-20T08:00:00.000Z',
      status: LoanStatus.Active,
      renewCount: 0,
      policyLoanDays: 10,
      policyMaxRenewals: 2,
      policyRenewDays: 5,
      fineCount: 0,
      unpaidFineTotal: 0,
      fines: [],
      createdAt: '2026-04-10T08:00:00.000Z',
      updatedAt: '2026-04-10T08:00:00.000Z',
    });
  });

  it('selects a member and book then submits checkout with the selected barcode', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreateCheckoutPage />, {
      route: '/circulation/checkout/new',
    });

    await user.type(screen.getByPlaceholderText('Tìm theo tên, mã thẻ, email...'), 'CARD-001');
    await user.click(await screen.findByText('Nguyen Van A'));

    await user.type(screen.getByPlaceholderText('Nhập barcode hoặc tên sách...'), 'Distributed');
    await user.click(await screen.findByText('Distributed Systems'));

    expect(await screen.findByText('BC-100')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Xác nhận tạo phiếu mượn/i }));

    expect(mocks.checkout).toHaveBeenCalledWith({
      memberId: 'member-1',
      barcode: 'BC-100',
    });
  });
});
