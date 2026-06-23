'use client';

import { formatRelativeTime } from '@/lib/utils/format';
import type { SyncStatus } from '@/types';

export interface SyncStatusBarProps {
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  onManualRefresh: () => void;
}

function StatusDot({ syncStatus }: { syncStatus: SyncStatus }) {
  switch (syncStatus) {
    case 'synced':
      return <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />;
    case 'stale':
      return <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden />;
    case 'syncing':
      return (
        <span
          className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
          aria-hidden
        />
      );
    case 'error':
      return <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />;
  }
}

export function SyncStatusBar({
  lastSyncedAt,
  syncStatus,
  onManualRefresh,
}: SyncStatusBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
      <div className="flex items-center gap-2">
        <StatusDot syncStatus={syncStatus} />
        <span>
          Balances last updated {formatRelativeTime(lastSyncedAt)}
        </span>
      </div>
      <button
        type="button"
        onClick={onManualRefresh}
        disabled={syncStatus === 'syncing'}
        className="font-medium text-zinc-900 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-100"
      >
        Refresh
      </button>
    </div>
  );
}
