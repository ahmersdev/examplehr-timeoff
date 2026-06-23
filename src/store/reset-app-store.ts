import { useAppStore } from '@/store/useAppStore';

export function resetAppStore(): void {
  useAppStore.setState({
    currentUser: null,
    notifications: [],
    pendingRequests: [],
    requestBalanceSnapshots: {},
    reconciledAt: null,
  });
}
