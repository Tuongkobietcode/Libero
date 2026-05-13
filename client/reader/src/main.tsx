import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import axios from 'axios';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './App';
import { isAuthRequiredError } from './services/api';
import { useNotificationsStore } from './store/notifications.store';
import { extractErrorMessage } from './utils/format';
import './styles.css';

dayjs.locale('vi');

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (isAuthRequiredError(error) || (axios.isAxiosError(error) && error.response?.status === 401)) {
        return;
      }

      const silent = query.meta?.silent === true;
      if (silent) {
        return;
      }
      const fallback =
        typeof query.meta?.errorMessage === 'string' ? query.meta.errorMessage : 'Không thể tải dữ liệu.';
      useNotificationsStore.getState().push({
        level: 'error',
        message: extractErrorMessage(error, fallback),
      });
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isAuthRequiredError(error) || (axios.isAxiosError(error) && error.response?.status === 401)) {
          return false;
        }

        return failureCount < 1;
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
