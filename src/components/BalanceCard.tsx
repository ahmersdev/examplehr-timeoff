"use client";

import { formatLeaveType, formatRelativeTime } from "@/lib/utils/format";
import type { LeaveBalance, SyncStatus } from "@/types";

export interface BalanceCardProps {
  balance: LeaveBalance;
  syncStatus: SyncStatus;
  isOptimistic?: boolean;
}

function SyncIndicator({
  syncStatus,
  lastSyncedAt,
}: {
  syncStatus: SyncStatus;
  lastSyncedAt: string;
}) {
  switch (syncStatus) {
    case "synced":
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
          <span className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
          Synced
        </span>
      );
    case "stale":
      return (
        <span className="flex items-center gap-1.5 text-xs text-yellow-700 dark:text-yellow-400">
          <span className="h-2 w-2 rounded-full bg-yellow-500" aria-hidden />
          as of {formatRelativeTime(lastSyncedAt)}
        </span>
      );
    case "syncing":
      return (
        <span className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400">
          <span
            className="h-3 w-3 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
            aria-hidden
          />
          Syncing
        </span>
      );
    case "error":
      return (
        <span className="flex items-center gap-1.5 text-xs text-red-700 dark:text-red-400">
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
          Sync error
        </span>
      );
  }
}

export function BalanceCard({
  balance,
  syncStatus,
  isOptimistic,
}: BalanceCardProps) {
  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm dark:bg-zinc-900 ${
        isOptimistic
          ? "border-dashed border-blue-400"
          : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
          {formatLeaveType(balance.leaveType)}
        </h3>
        <SyncIndicator
          syncStatus={syncStatus}
          lastSyncedAt={balance.lastSyncedAt}
        />
      </div>

      <p className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        {balance.available}
        <span className="ml-1 text-base font-normal text-zinc-500">
          days available
        </span>
      </p>

      <p className="mt-1 text-sm text-zinc-500">
        {balance.used} used · {balance.total} total
      </p>

      {isOptimistic && (
        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
          Updating…
        </p>
      )}
    </article>
  );
}
