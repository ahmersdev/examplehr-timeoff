"use client";

import type { LeaveBalance, SyncStatus } from "@/types";

import { BalanceCard } from "./BalanceCard";

export interface BalanceGridProps {
  balances: LeaveBalance[];
  syncStatus: SyncStatus;
  locationId: string;
}

export function BalanceGrid({
  balances,
  syncStatus,
  locationId,
}: BalanceGridProps) {
  const locationBalances = balances.filter((b) => b.locationId === locationId);

  if (locationBalances.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No balances for this location</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {locationBalances.map((balance) => (
        <BalanceCard
          key={`${balance.locationId}-${balance.leaveType}`}
          balance={balance}
          syncStatus={syncStatus}
        />
      ))}
    </div>
  );
}
