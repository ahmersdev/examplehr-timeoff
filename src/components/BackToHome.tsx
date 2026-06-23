"use client";

import { useRouter } from "next/navigation";

export function BackToHome() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/")}
      className="mb-3 inline-flex cursor-pointer items-center gap-1 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
    >
      ← Back
    </button>
  );
}
