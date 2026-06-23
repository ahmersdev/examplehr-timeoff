"use client";

import { useEffect } from "react";

import type { AppNotification } from "@/store/useAppStore";

export interface NotificationToastProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

const TYPE_BORDER: Record<AppNotification["type"], string> = {
  info: "border-l-blue-500",
  warning: "border-l-yellow-500",
  error: "border-l-red-500",
};

const AUTO_DISMISS_MS = 5_000;

function ToastItem({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    if (notification.type === "warning") return;

    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [notification.id, notification.type, onDismiss]);

  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-md border border-zinc-200 border-l-4 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 ${TYPE_BORDER[notification.type]}`}
    >
      <p className="text-sm text-zinc-800 dark:text-zinc-200">
        {notification.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(notification.id)}
        className="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export function NotificationToast({
  notifications,
  onDismiss,
}: NotificationToastProps) {
  const active = notifications.filter((n) => !n.dismissedAt);

  if (active.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {active.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
