'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import {
  BalanceGrid,
  NotificationToast,
  RequestCard,
  RequestForm,
} from '@/components';
import type { SubmitRequestInput } from '@/lib/api/hcm';
import {
  useBalances,
  useReconciliation,
  useRequests,
  useSubmitRequest,
} from '@/lib/hooks';
import { useAppStore, useCurrentUser } from '@/store/useAppStore';
import type { TimeOffRequest } from '@/types';

const Employee = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const addPendingRequest = useAppStore((s) => s.addPendingRequest);
  const setRequestBalanceSnapshot = useAppStore((s) => s.setRequestBalanceSnapshot);
  const notifications = useAppStore((s) => s.notifications);
  const dismissNotification = useAppStore((s) => s.dismissNotification);

  const employeeId = currentUser?.id ?? '';
  const { balances, syncStatus, isLoading } = useBalances(employeeId);
  const { requests, refetch: refetchRequests } = useRequests(employeeId);
  const { submitAsync, isOptimistic, isRolledBack, reset } = useSubmitRequest();

  useReconciliation(employeeId);

  useEffect(() => {
    if (!currentUser) {
      router.replace('/');
    }
  }, [currentUser, router]);

  const handleSubmit = useCallback(
    async (input: SubmitRequestInput) => {
      reset();

      const balanceBefore = balances.find(
        (b) => b.locationId === input.locationId && b.leaveType === input.leaveType,
      );
      const expectedAvailable = (balanceBefore?.available ?? 0) - input.days;

      try {
        const request = await submitAsync(input);
        setRequestBalanceSnapshot(request.id, expectedAvailable);
        addPendingRequest(request);
        await refetchRequests();
      } catch {
        // rollback state handled by useSubmitRequest
      }
    },
    [
      balances,
      submitAsync,
      setRequestBalanceSnapshot,
      addPendingRequest,
      refetchRequests,
      reset,
    ],
  );

  if (!currentUser) {
    return null;
  }

  const locationBalances = balances.filter(
    (b) => b.locationId === currentUser.locationId,
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          My Time Off
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {currentUser.name}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Balances
        </h2>
        {isLoading ? (
          <p className="text-sm text-zinc-500">Loading balances…</p>
        ) : (
          <BalanceGrid
            balances={balances}
            syncStatus={syncStatus}
            locationId={currentUser.locationId}
          />
        )}
      </section>

      <section className="space-y-4">
        <RequestForm
          employeeId={currentUser.id}
          locationId={currentUser.locationId}
          availableBalances={locationBalances}
          onSubmit={(input) => void handleSubmit(input)}
          isSubmitting={isOptimistic}
        />

        {isRolledBack && (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
          >
            Your request could not be confirmed. Please try again.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Request History
        </h2>
        {requests.length === 0 && !isOptimistic ? (
          <p className="text-sm text-zinc-500">No requests yet.</p>
        ) : (
          <div className="space-y-4">
            {isOptimistic && (
              <RequestCard
                request={
                  {
                    id: 'optimistic',
                    employeeId: currentUser.id,
                    locationId: currentUser.locationId,
                    leaveType: locationBalances[0]?.leaveType ?? 'annual',
                    startDate: '',
                    endDate: '',
                    days: 0,
                    status: 'pending',
                    optimisticStatus: 'pending_submission',
                    submittedAt: new Date().toISOString(),
                  } satisfies TimeOffRequest
                }
              />
            )}
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>

      <NotificationToast
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </main>
  );
};

export default Employee;
