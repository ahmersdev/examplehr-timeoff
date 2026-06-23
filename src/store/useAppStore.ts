import { create } from 'zustand';

import type { Employee, TimeOffRequest } from '@/types';

export type NotificationType = 'info' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  message: string;
  dismissedAt?: string;
}

interface AppState {
  currentUser: Employee | null;
  notifications: AppNotification[];
  pendingRequests: TimeOffRequest[];
  requestBalanceSnapshots: Record<string, number>;
  reconciledAt: string | null;

  setCurrentUser: (employee: Employee | null) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'dismissedAt'>) => void;
  dismissNotification: (id: string) => void;
  addPendingRequest: (request: TimeOffRequest) => void;
  resolvePendingRequest: (id: string, finalStatus: TimeOffRequest['status']) => void;
  setRequestBalanceSnapshot: (requestId: string, availableAfterSubmit: number) => void;
  setReconciledAt: (timestamp: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  notifications: [],
  pendingRequests: [],
  requestBalanceSnapshots: {},
  reconciledAt: null,

  setCurrentUser: (employee) => set({ currentUser: employee }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { ...notification, id: crypto.randomUUID() },
      ],
    })),

  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, dismissedAt: new Date().toISOString() } : n,
      ),
    })),

  addPendingRequest: (request) =>
    set((state) => ({
      pendingRequests: [...state.pendingRequests, request],
    })),

  resolvePendingRequest: (id, _finalStatus) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== id),
    })),

  setRequestBalanceSnapshot: (requestId, availableAfterSubmit) =>
    set((state) => ({
      requestBalanceSnapshots: {
        ...state.requestBalanceSnapshots,
        [requestId]: availableAfterSubmit,
      },
    })),

  setReconciledAt: (timestamp) => set({ reconciledAt: timestamp }),
}));

export function useCurrentUser() {
  return useAppStore((s) => s.currentUser);
}
