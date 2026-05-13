import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AuthCard } from '../../components/auth/AuthCard';
import { RegisterForm } from './sections/RegisterForm';

export default function RegisterPage() {
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <AuthCard
      size="lg"
      title="Tạo tài khoản"
      subtitle="Tham gia LIBERO để khám phá thư viện và quản lý tài khoản của bạn."
      footer={
        <>
          Đã có tài khoản?{' '}
          <Link className="font-semibold text-brand-600 hover:text-brand-700" to="/login">
            Đăng nhập ngay
          </Link>
        </>
      }
    >
      {feedback ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">
          {feedback}
        </div>
      ) : null}
      <RegisterForm onRegistered={setFeedback} />
    </AuthCard>
  );
}
