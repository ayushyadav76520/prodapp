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
    idle: { color: "bg-emerald-600", label: "Synced" },
    syncing: { color: "bg-amber-500 animate-pulse", label: "Syncing…" },
    error: { color: "bg-red-600", label: "Sync error — retry" },
  }[state];

  return (
    <button
      onClick={state === "error" ? onRetry : undefined}
      className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-ink-soft hover:text-ink transition-colors"
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.color}`} />
      {config.label}
    </button>
  );
}
