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

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
      <div className="flex items-center justify-between border-b border-rule pb-3 mb-10 text-[11px] uppercase tracking-widest text-ink-soft">
        <span>{dateStr}</span>
        {status === "authenticated" && <SyncStatus state={overallSync} onRetry={retry} />}
        <span>Edition: Private</span>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-10 items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-3">
            Front Page
          </p>
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
            {session?.user?.name
              ? `Good to see you, ${session.user.name.split(" ")[0]}.`
              : "Your day, in order."}
          </h1>
          <p className="font-serif italic text-2xl md:text-3xl text-ink-soft mt-4 leading-snug">
            Everything Google knows, shown honestly.
          </p>
          <p className="text-sm text-ink-soft mt-6 max-w-md leading-relaxed">
            {status === "authenticated"
              ? "Your calendar, tasks and skill streaks below are pulled live from your Google account — nothing here is invented."
              : "Sign in once, and this page keeps itself current — real events, real tasks, no fake placeholders, ever."}
          </p>

          {status === "unauthenticated" && (
            <button
              onClick={() => signIn("google")}
              className="mt-6 inline-flex items-center gap-2 bg-ink text-paper text-sm font-medium px-5 py-2.5 rounded-none hover:bg-accent transition-colors"
            >
              Connect Google Account →
            </button>
          )}

          {status === "authenticated" && session.error === "RefreshAccessTokenError" && (
            <div className="mt-6 border border-red-600/30 bg-red-600/5 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                Your Google session expired. Please reconnect.
              </p>
              <button
                onClick={() => signIn("google")}
                className="mt-3 bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700"
              >
                Reconnect
              </button>
            </div>
          )}

          {(calError || taskError) && (
            <div className="mt-6 border border-red-600/30 bg-red-600/5 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{calError ?? taskError}</p>
              <button onClick={retry} className="mt-2 text-xs underline text-red-700 dark:text-red-400">
                Retry
              </button>
            </div>
          )}
        </div>

        {status === "authenticated" && !session.error && (
          <div className="border border-rule bg-paper-raised">
            <p className="text-[10px] uppercase tracking-widest text-ink-soft px-4 pt-4">
              Today&apos;s Scorecard
            </p>
            <div className="grid grid-cols-2 divide-x divide-rule border-t border-rule mt-3">
              <div className="p-4">
                <p className="font-serif text-3xl font-semibold">
                  {calSync === "syncing" ? "…" : todaysEventCount}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-ink-soft mt-1">
                  Events Today
                </p>
              </div>
              <div className="p-4">
                <p className="font-serif text-3xl font-semibold">
                  {taskSync === "syncing" ? "…" : openTaskCount}
                </p>
                <p className="text-[10px] uppercase tracking-widest text-ink-soft mt-1">
                  Open Tasks
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
