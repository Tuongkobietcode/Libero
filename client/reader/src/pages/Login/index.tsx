import { AuthCard } from '../../components/auth/AuthCard';
import { LoginForm } from './components/LoginForm';

export default function LoginPage() {
  return (
    <AuthCard title="Đăng nhập" subtitle="Chào mừng bạn quay trở lại LIBERO">
      <LoginForm />
    </AuthCard>
  );
}
