"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  BackToHome,
  ManagerRequestQueue,
  NotificationToast,
  SectionSpinner,
  SyncStatusBar,
} from "@/components";
import {
  useApproveRequest,
  useBalance,
  useBalances,
  useDenyRequest,
  usePendingRequests,
} from "@/lib/hooks";
import { useAppStore, useCurrentUser } from "@/store/useAppStore";
import type { LeaveBalance, TimeOffRequest } from "@/types";

function ManagerRequestBalanceLoader({
  request,
  onBalanceLoaded,
  onLoadingChange,
}: {
  request: TimeOffRequest;
  onBalanceLoaded: (requestId: string, balance: LeaveBalance) => void;
  onLoadingChange: (requestId: string, isLoading: boolean) => void;
}) {
  const { balance, isLoading } = useBalance(
    request.employeeId,
    request.locationId,
    request.leaveType,
  );

  useEffect(() => {
    onLoadingChange(request.id, isLoading);
  }, [request.id, isLoading, onLoadingChange]);

  useEffect(() => {
    if (balance) {
      onBalanceLoaded(request.id, balance);
    }
  }, [request.id, balance, onBalanceLoaded]);

  return null;
}

const Manager = () => {
  const router = useRouter();
  const currentUser = useCurrentUser();
  const requestBalanceSnapshots = useAppStore((s) => s.requestBalanceSnapshots);
  const resolvePendingRequest = useAppStore((s) => s.resolvePendingRequest);
  const notifications = useAppStore((s) => s.notifications);
  const dismissNotification = useAppStore((s) => s.dismissNotification);

  const {
    requests: pendingRequests,
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = usePendingRequests();
  const { syncStatus, lastSyncedAt, refetch } = useBalances(
    currentUser?.id ?? "",
  );
  const { approve, conflictError, reset: resetApprove } = useApproveRequest();
  const { deny } = useDenyRequest();

  const [liveBalances, setLiveBalances] = useState<
    Record<string, LeaveBalance>
  >({});
  const [loadingBalanceIds, setLoadingBalanceIds] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUser) {
      router.replace("/");
    }
  }, [currentUser, router]);

  const handleBalanceLoaded = useCallback(
    (requestId: string, balance: LeaveBalance) => {
      setLiveBalances((prev) => ({ ...prev, [requestId]: balance }));
    },
    [],
  );

  const handleLoadingChange = useCallback(
    (requestId: string, isLoading: boolean) => {
      setLoadingBalanceIds((prev) => {
        const next = new Set(prev);
        if (isLoading) {
          next.add(requestId);
        } else {
          next.delete(requestId);
        }
        return next;
      });
    },
    [],
  );

  const visibleRequests = useMemo(
    () => pendingRequests.filter((r) => !hiddenIds.has(r.id)),
    [pendingRequests, hiddenIds],
  );

  const balancesForQueue = useMemo(
    () => Object.values(liveBalances),
    [liveBalances],
  );

  const balanceChangedFlags = useMemo(() => {
    const flags: Record<string, boolean> = {};
    for (const request of visibleRequests) {
      const live = liveBalances[request.id];
      const snapshot = requestBalanceSnapshots[request.id];
      if (live != null && snapshot != null) {
        flags[request.id] = live.available !== snapshot;
      }
    }
    return flags;
  }, [visibleRequests, liveBalances, requestBalanceSnapshots]);

  const isLoadingBalance = loadingBalanceIds.size > 0;

  const handleApprove = useCallback(
    (requestId: string) => {
      const request = pendingRequests.find((r) => r.id === requestId);
      if (!request) return;

      resetApprove();
      setHiddenIds((prev) => new Set(prev).add(requestId));

      approve(
        {
          requestId,
          employeeId: request.employeeId,
          locationId: request.locationId,
          leaveType: request.leaveType,
        },
        {
          onSuccess: () => {
            resolvePendingRequest(requestId, "approved");
            void refetchPending();
          },
          onError: () => {
            setHiddenIds((prev) => {
              const next = new Set(prev);
              next.delete(requestId);
              return next;
            });
            void refetchPending();
          },
        },
      );
    },
    [
      pendingRequests,
      approve,
      resolvePendingRequest,
      refetchPending,
      resetApprove,
    ],
  );

  const handleDeny = useCallback(
    (requestId: string) => {
      const request = pendingRequests.find((r) => r.id === requestId);
      if (!request) return;

      setHiddenIds((prev) => new Set(prev).add(requestId));

      deny(
        {
          requestId,
          employeeId: request.employeeId,
          locationId: request.locationId,
          leaveType: request.leaveType,
          days: request.days,
        },
        {
          onSuccess: () => {
            resolvePendingRequest(requestId, "denied");
            void refetchPending();
          },
          onError: () => {
            setHiddenIds((prev) => {
              const next = new Set(prev);
              next.delete(requestId);
              return next;
            });
            void refetchPending();
          },
        },
      );
    },
    [pendingRequests, deny, resolvePendingRequest, refetchPending],
  );

  if (!currentUser) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col">
      <SyncStatusBar
        lastSyncedAt={lastSyncedAt}
        syncStatus={syncStatus}
        onManualRefresh={() => void refetch()}
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-6">
        <header>
          <BackToHome />
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Manager Queue
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {currentUser.name}
          </p>
        </header>

        {conflictError && (
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
          >
            {conflictError.message}
          </p>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Pending Approvals
          </h2>

          {isLoadingPending ? (
            <SectionSpinner label="Loading pending approvals" />
          ) : (
            <>
              {visibleRequests.map((request) => (
                <ManagerRequestBalanceLoader
                  key={request.id}
                  request={request}
                  onBalanceLoaded={handleBalanceLoaded}
                  onLoadingChange={handleLoadingChange}
                />
              ))}

              <ManagerRequestQueue
                requests={visibleRequests}
                balances={balancesForQueue}
                balanceChangedFlags={balanceChangedFlags}
                onApprove={handleApprove}
                onDeny={handleDeny}
                isLoadingBalance={isLoadingBalance}
              />
            </>
          )}
        </section>
      </main>

      <NotificationToast
        notifications={notifications}
        onDismiss={dismissNotification}
      />
    </div>
  );
};

export default Manager;
