import { create } from 'zustand';

import type { AuthUser } from '../types/models';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  initialized: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setInitialized: (initialized: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  initialized: false,
  setToken: (token) => set({ accessToken: token }),
  setUser: (user) => set({ user }),
  setInitialized: (initialized) => set({ initialized }),
  logout: () =>
    set({
      accessToken: null,
      user: null,
      initialized: true,
    }),
}));
