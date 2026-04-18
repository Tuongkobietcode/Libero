import { apiClient } from '../services/api';
import { useAuthStore } from '../store/auth.store';

export function useApi() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return {
    api: apiClient,
    accessToken,
    user,
  };
}
