'use client';

import type { TimeOffRequest } from '@/types';

export interface RequestStatusBadgeProps {
  status: TimeOffRequest['status'];
}

const STATUS_STYLES: Record<TimeOffRequest['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  denied: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  rolled_back: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

const STATUS_LABELS: Record<TimeOffRequest['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  rolled_back: 'Rolled Back',
};

export function RequestStatusBadge({ status }: RequestStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
