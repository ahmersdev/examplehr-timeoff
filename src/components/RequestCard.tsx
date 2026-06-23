'use client';

import type { ReactNode } from 'react';

import { formatLeaveType } from '@/lib/utils/format';
import type { LeaveBalance, TimeOffRequest } from '@/types';

import { RequestStatusBadge } from './RequestStatusBadge';

export interface RequestCardProps {
  request: TimeOffRequest;
  showBalance?: LeaveBalance;
  balanceChanged?: boolean;
  children?: ReactNode;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function RequestCard({ request, showBalance, balanceChanged, children }: RequestCardProps) {
  return (
    <article
      className={`rounded-lg border bg-white p-4 shadow-sm dark:bg-zinc-900 ${
        balanceChanged
          ? 'border-yellow-400 dark:border-yellow-600'
          : 'border-zinc-200 dark:border-zinc-700'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
          {formatLeaveType(request.leaveType)}
        </h3>
        <RequestStatusBadge status={request.status} />
      </div>

      <dl className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-500">Dates</dt>
          <dd>
            {formatDate(request.startDate)} – {formatDate(request.endDate)}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-500">Days</dt>
          <dd>{request.days}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-medium text-zinc-500">Submitted</dt>
          <dd>{formatDate(request.submittedAt)}</dd>
        </div>
      </dl>

      {showBalance && (
        <p className="mt-3 rounded-md bg-zinc-50 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Available: {showBalance.available} days
        </p>
      )}

      {balanceChanged && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
        >
          Balance changed since this request was submitted. Review before approving.
        </p>
      )}

      {request.status === 'denied' && request.rejectionReason && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          Reason: {request.rejectionReason}
        </p>
      )}

      {children && <div className="mt-4 flex gap-2">{children}</div>}
    </article>
  );
}
