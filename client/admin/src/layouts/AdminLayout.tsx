import {
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  DollarOutlined,
  LogoutOutlined,
  SettingOutlined,
  SwapOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { Role } from '../types/models';
import { getRoleLabel } from '../utils/display';

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  roles?: Role[];
}

const navigationItems: MenuItem[] = [
  { key: '/', label: 'Tổng quan', icon: <DashboardOutlined /> },
  { key: '/catalog', label: 'Danh mục sách', icon: <BookOutlined /> },
  { key: '/members', label: 'Thành viên', icon: <TeamOutlined /> },
  { key: '/circulation/checkout', label: 'Lưu thông', icon: <SwapOutlined /> },
  { key: '/fines', label: 'Tiền phạt', icon: <DollarOutlined /> },
  { key: '/reports/loan-stats', label: 'Báo cáo', icon: <BarChartOutlined /> },
  { key: '/settings/loan-policies', label: 'Cài đặt', icon: <SettingOutlined />, roles: [Role.Admin] },
];

function resolveSelectedKey(pathname: string): string {
  for (let index = navigationItems.length - 1; index >= 0; index -= 1) {
    const item = navigationItems[index];

    if (pathname === item.key || pathname.startsWith(`${item.key}/`)) {
      return item.key;
    }
  }

  return '/';
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const selectedKey = resolveSelectedKey(location.pathname);

  const visibleItems = navigationItems.filter((item) => {
    if (!item.roles?.length) {
      return true;
    }

    return item.roles.includes(user?.role ?? Role.Student);
  });

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ padding: 24, color: '#fff', fontSize: 18, fontWeight: 700 }}>LIBERO Quản trị</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={visibleItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: '#fff',
            paddingInline: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              {visibleItems.find((item) => item.key === selectedKey)?.label ?? 'Quản trị'}
            </Typography.Title>
            <Typography.Text type="secondary">Không gian làm việc cho thủ thư và quản trị viên</Typography.Text>
          </div>
          <Space size="middle">
            <Space>
              <Avatar>{user?.fullName?.[0] ?? user?.role?.[0]?.toUpperCase() ?? 'A'}</Avatar>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Typography.Text strong>{user?.fullName ?? user?.email ?? 'Tài khoản quản trị'}</Typography.Text>
                <Typography.Text type="secondary">{getRoleLabel(user?.role)}</Typography.Text>
              </div>
            </Space>
            <Button icon={<LogoutOutlined />} onClick={() => void logout()}>
              Đăng xuất
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
