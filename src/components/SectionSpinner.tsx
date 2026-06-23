export function SectionSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[120px] items-center justify-center"
      role="status"
      aria-label={label}
    >
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 dark:border-zinc-600 dark:border-t-zinc-300"
        aria-hidden
      />
    </div>
  );
}
