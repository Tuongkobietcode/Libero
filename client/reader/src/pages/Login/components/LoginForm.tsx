import { useState, type FormEvent } from 'react';
import { Mail, Lock } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '../../../components/ui/Button';
import { Checkbox } from '../../../components/forms/Checkbox';
import { FormField } from '../../../components/forms/FormField';
import { PasswordField } from '../../../components/forms/PasswordField';
import { useAuth } from '../../../hooks/useAuth';
import { useNotificationsStore } from '../../../store/notifications.store';
import { extractErrorMessage } from '../../../utils/format';

interface LocationState {
  from?: { pathname?: string };
}

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginState } = useAuth();
  const notify = useNotificationsStore((state) => state.push);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const fromPath = (location.state as LocationState | null)?.from?.pathname ?? '/';
  const trimmedEmail = email.trim();
  const emailError = emailTouched && !trimmedEmail ? 'Vui lòng nhập email hoặc tài khoản.' : undefined;
  const passwordError = passwordTouched && !password ? 'Vui lòng nhập mật khẩu.' : undefined;
  const isFormValid = Boolean(trimmedEmail && password);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (!isFormValid) return;

    try {
      await login({ email: trimmedEmail, password });
      navigate(fromPath, { replace: true });
    } catch (error) {
      notify({
        level: 'error',
        message: extractErrorMessage(error, 'Không thể đăng nhập vào khu vực bạn đọc.'),
      });
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <FormField
        id="reader-email"
        label="Email hoặc tài khoản"
        name="email"
        autoComplete="username"
        value={email}
        placeholder="Nhập email hoặc tài khoản"
        leftIcon={<Mail className="h-[18px] w-[18px]" aria-hidden />}
        error={emailError}
        onBlur={() => setEmailTouched(true)}
        onChange={(e) => setEmail(e.target.value)}
      />

      <PasswordField
        id="reader-password"
        label="Mật khẩu"
        name="password"
        autoComplete="current-password"
        value={password}
        placeholder="Nhập mật khẩu"
        leftIcon={<Lock className="h-[18px] w-[18px]" aria-hidden />}
        error={passwordError}
        onBlur={() => setPasswordTouched(true)}
        onChange={(e) => setPassword(e.target.value)}
      />

      <div className="flex items-center justify-between gap-4 text-sm">
        <Checkbox
          name="rememberMe"
          label="Ghi nhớ đăng nhập"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <a
          className="font-semibold text-brand-600 hover:text-brand-700"
          href="mailto:support@library.edu?subject=LIBERO%20password%20support"
        >
          Quên mật khẩu?
        </a>
      </div>

      <Button type="submit" fullWidth size="lg" isLoading={loginState.isPending} disabled={!isFormValid}>
        {loginState.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>

      <div className="my-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-slate-400">
        <span className="h-px bg-slate-200" />
        <span>hoặc</span>
        <span className="h-px bg-slate-200" />
      </div>

      <p className="text-center text-sm text-slate-500">
        Chưa có tài khoản?{' '}
        <Link className="font-semibold text-brand-600 hover:text-brand-700" to="/register">
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}
