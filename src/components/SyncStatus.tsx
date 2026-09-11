"use client";

type SyncState = "idle" | "syncing" | "error";

export function SyncStatus({
  state = "idle",
  onRetry,
}: {
  state?: SyncState;
  onRetry?: () => void;
}) {
  const config = {
    idle: { color: "bg-emerald-500", label: "Synced" },
    syncing: { color: "bg-amber-500 animate-pulse", label: "Syncing…" },
    error: { color: "bg-red-500", label: "Sync error — tap to retry" },
  }[state];

  return (
    <button
      onClick={state === "error" ? onRetry : undefined}
      className="flex items-center gap-2 text-xs font-medium text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white"
    >
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      {config.label}
    </button>
  );
}
