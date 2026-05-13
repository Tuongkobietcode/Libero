import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Form, Input } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

import { primaryButtonClass } from '../../components/AdminSurface';
import { useAuth } from '../../hooks/useAuth';
import { extractErrorMessage } from '../../utils/format';

interface LoginFormValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginState, login } = useAuth();
  const redirectTo = (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname ?? '/';

  const handleSubmit = async (values: LoginFormValues) => {
    await login(values);
    navigate(redirectTo, { replace: true });
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[#f7f9fc] p-6 text-[#071026]">
      <section className="w-full max-w-[440px] rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#3157ff] text-xl font-extrabold text-white shadow-[0_14px_30px_rgba(49,87,255,0.22)]">
            L
          </span>
          <div>
            <h1 className="m-0 text-2xl font-black tracking-tight">LIBERO Admin</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-500">Đăng nhập bằng tài khoản thủ thư hoặc quản trị viên.</p>
          </div>
        </div>

        {loginState.isError ? (
          <Alert
            type="error"
            showIcon
            className="mb-4"
            message={extractErrorMessage(loginState.error, 'Không thể đăng nhập')}
          />
        ) : null}

        <Form<LoginFormValues> layout="vertical" onFinish={(values) => void handleSubmit(values)}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email' }]}>
            <Input prefix={<MailOutlined />} autoComplete="email" placeholder="admin@library.edu" />
          </Form.Item>
          <Form.Item label="Mật khẩu" name="password" rules={[{ required: true }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="Nhập mật khẩu" />
          </Form.Item>
          <button className={`${primaryButtonClass} w-full`} disabled={loginState.isPending} type="submit">
            Đăng nhập
          </button>
        </Form>
      </section>
    </main>
  );
}
