import { type FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import type { UpdateMyProfilePayload } from '../../../services/member.api';
import type { MemberView } from '../../../types/models';
import { buildProfilePayload, getProfileFormState, type ProfileFormState } from '../profileView';

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel';
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-slate-400">{label}</span>
      <input
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-brand-300 focus:ring-4 focus:ring-brand-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        type={type}
        required={required}
      />
    </label>
  );
}

export function EditProfileModal({
  open,
  profile,
  saving,
  onClose,
  onSubmit,
}: {
  open: boolean;
  profile: MemberView | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (payload: UpdateMyProfilePayload) => void;
}) {
  const [form, setForm] = useState<ProfileFormState | null>(null);

  useEffect(() => {
    if (open && profile) {
      setForm(getProfileFormState(profile));
    }
  }, [open, profile]);

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

  if (!open || !form) {
    return null;
  }

  const setField = (field: keyof ProfileFormState) => (value: string) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(buildProfilePayload(form));
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Đóng chỉnh sửa hồ sơ" onClick={onClose} />

      <form className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_34px_90px_-34px_rgba(2,8,23,0.75)]" onSubmit={handleSubmit}>
        <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 id="edit-profile-title" className="m-0 font-display text-xl font-black tracking-tight text-slate-950">
              Chỉnh sửa thông tin cá nhân
            </h2>
            <p className="m-0 mt-1 text-sm font-medium text-slate-500">Các trường thư viện và trạng thái tài khoản do thủ thư quản lý.</p>
          </div>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            onClick={onClose}
            aria-label="Đóng chỉnh sửa hồ sơ"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-4 px-6 py-5 md:grid-cols-2">
          <TextField label="Họ và tên" value={form.fullName} onChange={setField('fullName')} required />
          <TextField label="Email" value={form.email} onChange={setField('email')} type="email" required />
          <TextField label="Số điện thoại" value={form.phone} onChange={setField('phone')} type="tel" />
          <TextField label="Mã sinh viên" value={form.studentId} onChange={setField('studentId')} />
          <TextField label="Khoa" value={form.faculty} onChange={setField('faculty')} />
          <TextField label="Lớp" value={form.className} onChange={setField('className')} />
          <div className="md:col-span-2">
            <TextField label="Cơ sở" value={form.campus} onChange={setField('campus')} />
          </div>
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
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
