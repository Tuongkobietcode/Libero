import { type FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LockKeyhole, X } from 'lucide-react';

import { PasswordField } from '../../../components/forms/PasswordField';
import type { ChangeMyPasswordPayload } from '../../../services/member.api';

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function getPasswordError(form: PasswordFormState): string | undefined {
  if (!form.currentPassword) {
    return 'Vui lòng nhập mật khẩu hiện tại.';
  }

  if (form.newPassword.length < 8) {
    return 'Mật khẩu mới cần ít nhất 8 ký tự.';
  }

  if (!/[A-Z]/.test(form.newPassword) || !/[0-9]/.test(form.newPassword)) {
    return 'Mật khẩu mới cần có chữ hoa và số.';
  }

  if (form.newPassword === form.currentPassword) {
    return 'Mật khẩu mới cần khác mật khẩu hiện tại.';
  }

  if (form.confirmPassword !== form.newPassword) {
    return 'Mật khẩu xác nhận không khớp.';
  }

  return undefined;
}

export function ChangePasswordModal({
  open,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: ChangeMyPasswordPayload) => void;
}) {
  const [form, setForm] = useState<PasswordFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSubmitted(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const error = getPasswordError(form);
  const showError = submitted ? error : undefined;

  const setField = (field: keyof PasswordFormState) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    if (error) {
      return;
    }

    onSubmit({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Đóng đổi mật khẩu" onClick={onClose} />

      <form className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_34px_90px_-34px_rgba(2,8,23,0.75)]" onSubmit={handleSubmit}>
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 id="change-password-title" className="m-0 font-display text-xl font-black tracking-tight text-slate-950">
              Đổi mật khẩu
            </h2>
            <p className="m-0 mt-1 text-sm font-medium text-slate-500">Cập nhật mật khẩu đăng nhập cho tài khoản bạn đọc.</p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            onClick={onClose}
            aria-label="Đóng đổi mật khẩu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <PasswordField
            label="Mật khẩu hiện tại"
            name="currentPassword"
            autoComplete="current-password"
            leftIcon={<LockKeyhole className="h-[18px] w-[18px]" aria-hidden />}
            value={form.currentPassword}
            onChange={(event) => setField('currentPassword')(event.target.value)}
          />
          <PasswordField
            label="Mật khẩu mới"
            name="newPassword"
            autoComplete="new-password"
            leftIcon={<LockKeyhole className="h-[18px] w-[18px]" aria-hidden />}
            value={form.newPassword}
            onChange={(event) => setField('newPassword')(event.target.value)}
          />
          <PasswordField
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            autoComplete="new-password"
            leftIcon={<LockKeyhole className="h-[18px] w-[18px]" aria-hidden />}
            value={form.confirmPassword}
            error={showError}
            onChange={(event) => setField('confirmPassword')(event.target.value)}
          />
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
            onClick={onClose}
            disabled={saving}
          >
            Hủy
          </button>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
