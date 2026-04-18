import { Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import MyLoansPage from '../pages/MyLoans';
import { renderWithProviders } from '../test/render';
import { useAuthStore } from '../store/auth.store';
import { CopyStatus, LoanStatus, MemberStatus, Role } from '../types/models';

const listMyLoansMock = vi.fn();
const renewLoanMock = vi.fn();

vi.mock('../services/loan.api', () => ({
  loanApi: {
    listMyLoans: (...args: unknown[]) => listMyLoansMock(...args),
    renewLoan: (...args: unknown[]) => renewLoanMock(...args),
  },
}));

describe('MyLoansPage', () => {
  beforeEach(() => {
    listMyLoansMock.mockReset();
    renewLoanMock.mockReset();

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

  it('renews an active loan and keeps non-renewable loans disabled', async () => {
    listMyLoansMock.mockResolvedValue({
      items: [
        {
          _id: 'loan-active',
          member: {
            _id: 'reader-1',
            fullName: 'Reader User',
            email: 'reader@example.com',
            memberCardNo: 'MEM-1',
            role: Role.Student,
            status: MemberStatus.Active,
            isBlocked: false,
          },
          book: { _id: 'book-1', isbn: '9781', title: 'Active Book' },
          copy: { _id: 'copy-1', barcode: 'COPY-1', status: CopyStatus.Borrowed, shelfLocation: 'A1' },
          checkoutDate: '2026-04-10T00:00:00.000Z',
          dueDate: '2026-04-24T00:00:00.000Z',
          status: LoanStatus.Active,
          renewCount: 0,
          policyLoanDays: 14,
          policyMaxRenewals: 1,
          policyRenewDays: 7,
          fineCount: 0,
          unpaidFineTotal: 0,
          createdAt: '2026-04-10T00:00:00.000Z',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
        {
          _id: 'loan-returned',
          member: {
            _id: 'reader-1',
            fullName: 'Reader User',
            email: 'reader@example.com',
            memberCardNo: 'MEM-1',
            role: Role.Student,
            status: MemberStatus.Active,
            isBlocked: false,
          },
          book: { _id: 'book-2', isbn: '9782', title: 'Returned Book' },
          copy: { _id: 'copy-2', barcode: 'COPY-2', status: CopyStatus.Available, shelfLocation: 'A2' },
          checkoutDate: '2026-04-01T00:00:00.000Z',
          dueDate: '2026-04-15T00:00:00.000Z',
          returnDate: '2026-04-14T00:00:00.000Z',
          status: LoanStatus.Returned,
          renewCount: 1,
          policyLoanDays: 14,
          policyMaxRenewals: 1,
          policyRenewDays: 7,
          fineCount: 0,
          unpaidFineTotal: 0,
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-14T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 10, totalItems: 2, totalPages: 1 },
    });

    renewLoanMock.mockResolvedValue({ _id: 'loan-active' });

    renderWithProviders(
      <Routes>
        <Route path="/my-loans" element={<MyLoansPage />} />
      </Routes>,
      { route: '/my-loans' },
    );

    const renewButtons = await screen.findAllByRole('button', { name: 'Gia han' });
    expect(renewButtons).toHaveLength(1);
    expect(renewButtons[0]).not.toBeDisabled();
    expect(screen.getByText('Returned Book')).toBeInTheDocument();
    expect(screen.queryByText(/Chi co the gia han phieu muon dang hoat dong/i)).not.toBeInTheDocument();

    await userEvent.click(renewButtons[0]);

    await waitFor(() => {
      expect(renewLoanMock).toHaveBeenCalledWith('loan-active');
    });

    expect(await screen.findByText(/Gia han thanh cong/i)).toBeInTheDocument();
  });

  it('disables renew when the current reader account is blocked', async () => {
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

    listMyLoansMock.mockResolvedValue({
      items: [
        {
          _id: 'loan-active',
          member: {
            _id: 'reader-1',
            fullName: 'Blocked Reader',
            email: 'reader@example.com',
            memberCardNo: 'MEM-1',
            role: Role.Student,
            status: MemberStatus.Active,
            isBlocked: true,
          },
          book: { _id: 'book-1', isbn: '9781', title: 'Active Book' },
          copy: { _id: 'copy-1', barcode: 'COPY-1', status: CopyStatus.Borrowed, shelfLocation: 'A1' },
          checkoutDate: '2026-04-10T00:00:00.000Z',
          dueDate: '2026-04-24T00:00:00.000Z',
          status: LoanStatus.Active,
          renewCount: 0,
          policyLoanDays: 14,
          policyMaxRenewals: 1,
          policyRenewDays: 7,
          fineCount: 0,
          unpaidFineTotal: 0,
          createdAt: '2026-04-10T00:00:00.000Z',
          updatedAt: '2026-04-10T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 10, totalItems: 1, totalPages: 1 },
    });

    renderWithProviders(
      <Routes>
        <Route path="/my-loans" element={<MyLoansPage />} />
      </Routes>,
      { route: '/my-loans' },
    );

    const renewButton = await screen.findByRole('button', { name: 'Gia han' });
    expect(renewButton).toBeDisabled();
    expect(
      screen.getByText(/Tai khoan cua ban dang bi khoa nen khong the gia han them/i),
    ).toBeInTheDocument();
    expect(renewLoanMock).not.toHaveBeenCalled();
  });
});
