import { create } from 'zustand';

export type NotificationLevel = 'success' | 'info' | 'warning' | 'error';

export interface NotificationEntry {
  id: string;
  level: NotificationLevel;
  message: string;
  description?: string;
}

interface NotificationsState {
  entries: NotificationEntry[];
  push: (entry: Omit<NotificationEntry, 'id'>) => void;
  consume: (id: string) => void;
  clear: () => void;
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  entries: [],
  push: (entry) =>
    set((state) => ({
      entries: [...state.entries, { ...entry, id: createId() }],
    })),
  consume: (id) =>
    set((state) => ({
      entries: state.entries.filter((entry) => entry.id !== id),
    })),
  clear: () => set({ entries: [] }),
}));
