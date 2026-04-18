import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
        padding: 24,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 420, boxShadow: '0 18px 42px rgba(15, 23, 42, 0.08)' }}>
        <Typography.Title level={2} style={{ marginBottom: 8 }}>
          LIBERO Quản trị
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Đăng nhập bằng tài khoản thủ thư hoặc quản trị viên để quản lý danh mục sách, lưu thông, tiền phạt và báo cáo.
        </Typography.Paragraph>

        {loginState.isError ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
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
          <Button type="primary" htmlType="submit" block loading={loginState.isPending}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </div>
  );
}
