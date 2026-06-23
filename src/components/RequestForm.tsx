'use client';

import { useEffect, useMemo, useState } from 'react';

import type { SubmitRequestInput } from '@/lib/api/hcm';
import { calculateInclusiveDays, formatLeaveType } from '@/lib/utils/format';
import type { LeaveBalance } from '@/types';

export interface RequestFormProps {
  employeeId: string;
  locationId: string;
  availableBalances: LeaveBalance[];
  onSubmit: (input: SubmitRequestInput) => void;
  isSubmitting: boolean;
  serverError?: string;
  successMessage?: string;
}

export function RequestForm({
  employeeId,
  locationId,
  availableBalances,
  onSubmit,
  isSubmitting,
  serverError,
  successMessage,
}: RequestFormProps) {
  const [leaveType, setLeaveType] = useState(
    availableBalances[0]?.leaveType ?? '',
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (
      availableBalances.length > 0 &&
      !availableBalances.some((b) => b.leaveType === leaveType)
    ) {
      setLeaveType(availableBalances[0].leaveType);
    }
  }, [availableBalances, leaveType]);

  const days = useMemo(
    () => calculateInclusiveDays(startDate, endDate),
    [startDate, endDate],
  );

  const selectedBalance = availableBalances.find((b) => b.leaveType === leaveType);
  const datesValid = startDate && endDate && endDate >= startDate;
  const overBalance = selectedBalance ? days > selectedBalance.available : false;
  const canSubmit =
    !isSubmitting &&
    !!leaveType &&
    datesValid &&
    days > 0 &&
    !overBalance;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      employeeId,
      locationId,
      leaveType,
      startDate,
      endDate,
      days,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Request Time Off
      </h2>

      <div>
        <label htmlFor="leaveType" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Leave Type
        </label>
        <select
          id="leaveType"
          value={leaveType}
          onChange={(e) => setLeaveType(e.target.value)}
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        >
          {availableBalances.map((b) => (
            <option key={b.leaveType} value={b.leaveType}>
              {formatLeaveType(b.leaveType)} ({b.available} available)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            End Date
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </div>
      </div>

      <div>
        <label htmlFor="days" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Days
        </label>
        <input
          id="days"
          type="text"
          readOnly
          value={days > 0 ? days : ''}
          placeholder="Auto-calculated"
          className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
        />
      </div>

      {overBalance && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Requested {days} days exceeds available balance of {selectedBalance?.available} days.
        </p>
      )}

      {startDate && endDate && endDate < startDate && (
        <p className="text-sm text-red-600 dark:text-red-400">
          End date must be on or after start date.
        </p>
      )}

      {serverError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {serverError}
        </p>
      )}

      {successMessage && (
        <p
          className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200"
          role="status"
        >
          {successMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  );
}
