import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReturnPage from '../pages/Circulation/Return';
import { useNotificationsStore } from '../store/notifications.store';
import { MemberStatus, Role } from '../types/models';
import { renderWithProviders } from '../test/render';

const mocks = vi.hoisted(() => ({
  returnByBarcode: vi.fn(),
}));

vi.mock('../services/loan.api', () => ({
  loanApi: {
    returnByBarcode: mocks.returnByBarcode,
  },
}));

describe('ReturnPage', () => {
  beforeEach(() => {
    useNotificationsStore.getState().clear();
    mocks.returnByBarcode.mockReset();
    mocks.returnByBarcode.mockResolvedValue({
      _id: 'loan-2',
      member: {
        _id: 'member-2',
        fullName: 'Tran Thi B',
        email: 'member2@example.com',
        memberCardNo: 'CARD-002',
        role: Role.Student,
        status: MemberStatus.Active,
        isBlocked: false,
      },
      book: {
        _id: 'book-2',
        isbn: '9786047654321',
        title: 'Operating Systems',
      },
      copy: {
        _id: 'copy-2',
        barcode: 'BC-200',
        status: 'available',
      },
      checkoutDate: '2026-04-01T08:00:00.000Z',
      dueDate: '2026-04-11T08:00:00.000Z',
      returnDate: '2026-04-12T08:00:00.000Z',
      status: 'RETURNED',
      renewCount: 0,
      policyLoanDays: 10,
      policyMaxRenewals: 2,
      policyRenewDays: 5,
      fineCount: 1,
      unpaidFineTotal: 3000,
      fines: [
        {
          _id: 'fine-1',
          overdueDate: '2026-04-12T00:00:00.000Z',
          amount: 3000,
          status: 'UNPAID',
          note: 'Daily overdue fine',
          createdAt: '2026-04-12T08:00:00.000Z',
        },
      ],
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-12T08:00:00.000Z',
    });
  });

  it('processes a barcode return and shows loan plus fine details', async () => {
    const user = userEvent.setup();

    renderWithProviders(<ReturnPage />, {
      route: '/circulation/return',
    });

    await user.type(screen.getByPlaceholderText('Nhập hoặc quét mã vạch'), 'BC-200');
    await user.click(screen.getByRole('button', { name: 'Xử lý trả' }));

    expect(mocks.returnByBarcode).toHaveBeenCalledWith('BC-200');
    expect(await screen.findByText('Operating Systems')).toBeInTheDocument();
    expect(screen.getByText('Daily overdue fine')).toBeInTheDocument();
  });
});
