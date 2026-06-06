import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Form, Input } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

import liberoIcon from '../../assets/Icon/icon.svg';
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
    <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#1e1b4b] p-6 text-stone-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.14),transparent_28%),linear-gradient(135deg,rgba(30,27,75,0.98)_0%,rgba(28,25,23,0.9)_100%)]" />
      <div className="absolute h-[460px] w-[460px] rounded-full border border-white/10 bg-white/[0.03] blur-3xl" />

      <section className="relative w-full max-w-[460px] rounded-[1.75rem] border border-white/12 bg-white/[0.96] p-7 shadow-[0_30px_90px_-52px_rgba(0,0,0,0.72)] ring-1 ring-stone-950/5 backdrop-blur-xl">
        <div className="mb-7 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_18px_34px_-18px_rgba(30,27,75,0.8)]">
            <img className="h-7 w-7 object-contain" src={liberoIcon} alt="" />
          </span>
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.18em] text-amber-600">Operations Console</p>
            <h1 className="m-0 mt-1 text-2xl font-black tracking-tight text-stone-950">LIBERO Admin</h1>
          </div>
        </div>

        <p className="m-0 mb-6 text-sm font-semibold leading-6 text-stone-500">
          Đăng nhập bằng tài khoản thủ thư hoặc quản trị viên để xử lý mượn trả, kho sách và báo cáo vận hành.
        </p>

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
