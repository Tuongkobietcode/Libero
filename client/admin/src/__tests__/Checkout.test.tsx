import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CheckoutPage from '../pages/Circulation/Checkout';
import { useNotificationsStore } from '../store/notifications.store';
import { MemberStatus, Role } from '../types/models';
import { renderWithProviders } from '../test/render';

const mocks = vi.hoisted(() => ({
  listMembers: vi.fn(),
  checkout: vi.fn(),
}));

vi.mock('../services/member.api', () => ({
  memberApi: {
    listMembers: mocks.listMembers,
  },
}));

vi.mock('../services/loan.api', () => ({
  loanApi: {
    checkout: mocks.checkout,
  },
}));

describe('CheckoutPage', () => {
  beforeEach(() => {
    useNotificationsStore.getState().clear();
    mocks.listMembers.mockReset();
    mocks.checkout.mockReset();

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
        limit: 1,
        totalItems: 1,
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
      },
      copy: {
        _id: 'copy-1',
        barcode: 'BC-100',
        status: 'borrowed',
      },
      checkoutDate: '2026-04-10T08:00:00.000Z',
      dueDate: '2026-04-20T08:00:00.000Z',
      status: 'ACTIVE',
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

  it('finds a member and submits checkout with the scanned barcode', async () => {
    const user = userEvent.setup();

    renderWithProviders(<CheckoutPage />, {
      route: '/circulation/checkout',
    });

    await user.type(screen.getByPlaceholderText('Nhập hoặc quét mã thẻ thành viên'), 'CARD-001');
    await user.click(screen.getByRole('button', { name: 'Tìm thành viên' }));

    expect(await screen.findByText('Nguyen Van A')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Nhập hoặc quét mã vạch'), 'BC-100');
    await user.click(screen.getByRole('button', { name: 'Xác nhận mượn' }));

    expect(mocks.checkout).toHaveBeenCalledWith({
      memberId: 'member-1',
      barcode: 'BC-100',
    });
    expect(await screen.findByText('Distributed Systems')).toBeInTheDocument();
  });
});
