import { Link, useNavigate } from 'react-router-dom';

import { AuthCard } from '../../components/auth/AuthCard';
import { RegisterForm } from './components/RegisterForm';

export default function RegisterPage() {
  const navigate = useNavigate();

  function handleRegistered(message: string) {
    navigate('/login', { replace: true, state: { registrationMessage: message } });
  }

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
      <RegisterForm onRegistered={handleRegistered} />
    </AuthCard>
  );
}
