'use client';

import type { LeaveBalance, TimeOffRequest } from '@/types';

import { RequestCard } from './RequestCard';

export interface ManagerRequestQueueProps {
  requests: TimeOffRequest[];
  balances: LeaveBalance[];
  balanceChangedFlags?: Record<string, boolean>;
  onApprove: (requestId: string) => void;
  onDeny: (requestId: string) => void;
  isLoadingBalance: boolean;
}

function findBalance(
  balances: LeaveBalance[],
  employeeId: string,
  locationId: string,
  leaveType: string,
): LeaveBalance | undefined {
  return balances.find(
    (b) =>
      b.employeeId === employeeId &&
      b.locationId === locationId &&
      b.leaveType === leaveType,
  );
}

export function ManagerRequestQueue({
  requests,
  balances,
  balanceChangedFlags = {},
  onApprove,
  onDeny,
  isLoadingBalance,
}: ManagerRequestQueueProps) {
  const hasBalanceWarnings = requests.some(
    (r) => balanceChangedFlags[r.id] === true,
  );

  if (requests.length === 0) {
    return (
      <p className="text-sm text-zinc-500">No pending requests in queue.</p>
    );
  }

  return (
    <div className="space-y-4">
      {hasBalanceWarnings && (
        <div
          role="alert"
          className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
        >
          Balance changed since one or more requests were submitted. Review before
          approving.
        </div>
      )}

      {requests.map((request) => {
        const showBalance = findBalance(
          balances,
          request.employeeId,
          request.locationId,
          request.leaveType,
        );
        const isPending = request.status === 'pending';
        const actionsDisabled = isLoadingBalance || !isPending;

        return (
          <RequestCard
            key={request.id}
            request={request}
            showBalance={showBalance}
            balanceChanged={balanceChangedFlags[request.id] === true}
          >
            <button
              type="button"
              onClick={() => onApprove(request.id)}
              disabled={actionsDisabled}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => onDeny(request.id)}
              disabled={actionsDisabled}
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Deny
            </button>
          </RequestCard>
        );
      })}
    </div>
  );
}
