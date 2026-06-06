import { App as AntdApp, ConfigProvider, notification } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';

import { router } from './routes';
import { useNotificationsStore } from './store/notifications.store';

dayjs.locale('vi');

function NotificationBridge() {
  const [api, contextHolder] = notification.useNotification();
  const entries = useNotificationsStore((state) => state.entries);
  const consume = useNotificationsStore((state) => state.consume);

  useEffect(() => {
    entries.forEach((entry) => {
      api[entry.level]({
        message: entry.message,
        description: entry.description,
      });
      consume(entry.id);
    });
  }, [api, consume, entries]);

  return <>{contextHolder}</>;
}

export default function App() {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 10,
        },
      }}
    >
      <AntdApp>
        <NotificationBridge />
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AntdApp>
    </ConfigProvider>
  );
}
