import { useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';

import { authApi } from '../services/auth.api';
import { memberApi } from '../services/member.api';
import { useAuthStore } from '../store/auth.store';
import type {
  AuthUser,
  LoginPayload,
  MemberView,
  RegisterPayload,
  RegisterResponse,
  Role,
} from '../types/models';
import { Role as AppRole } from '../types/models';
import { clearSessionHint, hasSessionHint, setSessionHint } from '../utils/sessionHint';

function mergeUser(baseUser: AuthUser, member?: MemberView): AuthUser {
  if (!member) {
    return baseUser;
  }

  return {
    ...baseUser,
    fullName: member.fullName,
    email: member.email,
    memberCardNo: member.memberCardNo,
    status: member.status,
    isBlocked: member.isBlocked,
  };
}

export function hasReaderAccess(user: Pick<AuthUser, 'role'> | null | undefined): boolean {
  return user?.role === AppRole.Student || user?.role === AppRole.Lecturer;
}

export function useBootstrapAuth(): void {
  const initialized = useAuthStore((state) => state.initialized);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (initialized) {
      return;
    }

    let mounted = true;

    async function bootstrap() {
      try {
        if (accessToken) {
          const profile = await memberApi.getMe();
          const currentUser = useAuthStore.getState().user;
          const mergedUser = currentUser
            ? mergeUser(currentUser, profile)
            : {
                _id: profile._id,
                role: profile.role,
                isBlocked: profile.isBlocked,
                fullName: profile.fullName,
                email: profile.email,
                memberCardNo: profile.memberCardNo,
                status: profile.status,
              };

          if (!hasReaderAccess(mergedUser)) {
            await authApi.logout().catch(() => undefined);
            clearSessionHint();

            if (mounted) {
              logout();
            }

            return;
          }

          if (mounted) {
            setUser(mergedUser);
          }

          return;
        }

        if (!hasSessionHint()) {
          if (mounted) {
            logout();
          }

          return;
        }

        const refreshed = await authApi.refresh();
        const profile = await memberApi.getMe(refreshed.accessToken).catch(() => undefined);
        const mergedUser = mergeUser(refreshed.user, profile);

        if (!hasReaderAccess(mergedUser)) {
          await authApi.logout().catch(() => undefined);
          clearSessionHint();

          if (mounted) {
            logout();
          }

          return;
        }

        if (mounted) {
          setToken(refreshed.accessToken);
          setUser(mergedUser);
        }
      } catch {
        clearSessionHint();

        if (mounted) {
          logout();
        }
      } finally {
        if (mounted) {
          setInitialized(true);
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, [accessToken, initialized, logout, setInitialized, setToken, setUser]);
}

export function useAuth() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const logoutStore = useAuthStore((state) => state.logout);

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const result = await authApi.login(payload);
      const profile = await memberApi.getMe(result.accessToken).catch(() => undefined);
      const mergedUser = mergeUser(result.user, profile);

      if (!hasReaderAccess(mergedUser)) {
        await authApi.logout().catch(() => undefined);
        throw new Error('Tài khoản này không thuộc khu vực bạn đọc.');
      }

      return {
        ...result,
        user: mergedUser,
      };
    },
    onSuccess: (result) => {
      setSessionHint();
      setToken(result.accessToken);
      setUser(result.user);
    },
  });

  const registerMutation = useMutation<RegisterResponse, Error, RegisterPayload>({
    mutationFn: (payload) => authApi.register(payload),
  });

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore transport failures and clear local state.
    } finally {
      clearSessionHint();
      logoutStore();
    }
  };

  return useMemo(
    () => ({
      accessToken,
      user,
      initialized,
      isAuthenticated: Boolean(accessToken && user && hasReaderAccess(user)),
      login: loginMutation.mutateAsync,
      register: registerMutation.mutateAsync,
      loginState: loginMutation,
      registerState: registerMutation,
      logout,
    }),
    [accessToken, initialized, loginMutation, registerMutation, user],
  );
}

export function isReaderRole(role: Role | undefined): boolean {
  return role === AppRole.Student || role === AppRole.Lecturer;
}
