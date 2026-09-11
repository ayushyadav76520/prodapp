"use client";

import { useSession, signIn } from "next-auth/react";
import { SyncStatus } from "@/components/SyncStatus";
import { useCalendarData, useTasksData } from "@/lib/use-google-data";

export default function HomePage() {
  const { data: session, status } = useSession();
  const { events, syncState: calSync, error: calError, refresh: refreshEvents } = useCalendarData();
  const { tasks, syncState: taskSync, error: taskError, refresh: refreshTasks } = useTasksData();

  const overallSync: "idle" | "syncing" | "error" =
    session?.error === "RefreshAccessTokenError" || calSync === "error" || taskSync === "error"
      ? "error"
      : calSync === "syncing" || taskSync === "syncing"
      ? "syncing"
      : "idle";

  const todayStr = new Date().toDateString();
  const todaysEventCount = events.filter((e) => {
    const start = e.start?.dateTime ?? e.start?.date;
    return start && new Date(start).toDateString() === todayStr;
  }).length;
  const openTaskCount = tasks.filter((t) => t.status === "needsAction").length;

  const retry = () => {
    refreshEvents();
    refreshTasks();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {session?.user?.name ? `Hi, ${session.user.name.split(" ")[0]} 👋` : "Good to see you 👋"}
          </h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Here&apos;s what&apos;s coming up.
          </p>
        </div>
        {status === "authenticated" && (
          <SyncStatus state={overallSync} onRetry={retry} />
        )}
      </header>

      {status === "loading" && (
        <p className="text-sm text-black/50 dark:text-white/50">Checking your session…</p>
      )}

      {status === "unauthenticated" && (
        <section className="rounded-2xl border border-black/10 dark:border-white/10 p-5">
          <h2 className="font-medium mb-2">Not connected yet</h2>
          <p className="text-sm text-black/60 dark:text-white/60 mb-4">
            Sign in with Google to pull in your real Calendar events and Tasks.
            Nothing shown here is fake data — this app only ever displays what
            Google returns. You&apos;ll only need to do this once per device.
          </p>
          <button
            onClick={() => signIn("google")}
            className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700"
          >
            Connect Google Account
          </button>
        </section>
      )}

      {status === "authenticated" && session.error === "RefreshAccessTokenError" && (
        <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5">
          <p className="text-sm text-red-600 dark:text-red-400">
            Your Google session expired and couldn&apos;t refresh automatically.
            Please sign in again.
          </p>
          <button
            onClick={() => signIn("google")}
            className="mt-3 rounded-full bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700"
          >
            Reconnect Google Account
          </button>
        </section>
      )}

      {status === "authenticated" && !session.error && (
        <>
          {(calError || taskError) && (
            <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                {calError ?? taskError}
              </p>
              <button
                onClick={retry}
                className="mt-2 text-xs font-medium text-red-600 dark:text-red-400 underline"
              >
                Retry
              </button>
            </section>
          )}

          <section className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
              <p className="text-xs text-black/50 dark:text-white/50">Today&apos;s events</p>
              <p className="text-2xl font-semibold mt-1">
                {calSync === "syncing" ? "…" : todaysEventCount}
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
              <p className="text-xs text-black/50 dark:text-white/50">Open tasks</p>
              <p className="text-2xl font-semibold mt-1">
                {taskSync === "syncing" ? "…" : openTaskCount}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
