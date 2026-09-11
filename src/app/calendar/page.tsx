"use client";

import { useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useCalendarData } from "@/lib/use-google-data";
import { SyncStatus } from "@/components/SyncStatus";
import type { GoogleEvent } from "@/lib/google-api";

function getEventDate(event: GoogleEvent): Date | null {
  const start = event.start?.dateTime ?? event.start?.date;
  return start ? new Date(start) : null;
}

function formatEventTime(event: GoogleEvent) {
  if (event.start?.date && !event.start?.dateTime) return "All day";
  const start = event.start?.dateTime;
  if (!start) return "";
  return new Date(start).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateHeading(d: Date) {
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  if (isSameDay(d, today)) return "Today";
  if (isSameDay(d, tomorrow)) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function CalendarPage() {
  const { status: sessionStatus } = useSession();
  const { events, syncState, error, refresh } = useCalendarData();
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");

  const groups = useMemo(() => {
    const now = new Date();
    const days = view === "Day" ? 1 : view === "Week" ? 7 : 31;
    const windowStart = new Date(now);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(now);
    windowEnd.setDate(now.getDate() + days);

    const withDates = events
      .map((e) => ({ event: e, date: getEventDate(e) }))
      .filter(
        (x): x is { event: GoogleEvent; date: Date } =>
          x.date !== null && x.date >= windowStart && x.date <= windowEnd
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Some Google accounts have the same holiday/festival calendar
    // subscribed more than once, which causes the same event to appear
    // in multiple calendars. Dedupe by title + exact start time so each
    // real event still shows once, without hiding genuinely distinct
    // events that happen to share a title.
    const seen = new Set<string>();
    const deduped = withDates.filter(({ event, date }) => {
      const key = `${event.summary ?? ""}|${date.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const byDay = new Map<string, { date: Date; events: GoogleEvent[] }>();
    for (const { event, date } of deduped) {
      const key = date.toDateString();
      if (!byDay.has(key)) byDay.set(key, { date, events: [] });
      byDay.get(key)!.events.push(event);
    }
    return Array.from(byDay.values());
  }, [events, view]);

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Calendar</h1>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8 text-center">
          <p className="text-sm text-black/60 dark:text-white/60 mb-4">
            Connect Google Calendar to see your events here.
          </p>
          <button
            onClick={() => signIn("google")}
            className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700 transition-colors"
          >
            Connect Google Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-black/50 dark:text-white/50 mt-0.5">
            {groups.reduce((n, g) => n + g.events.length, 0)} events in this view
          </p>
        </div>
        <SyncStatus state={syncState} onRetry={refresh} />
      </header>

      <div className="flex gap-1.5 text-sm bg-black/5 dark:bg-white/5 p-1 rounded-full w-fit">
        {(["Day", "Week", "Month"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-full font-medium transition-colors ${
              view === v
                ? "bg-white dark:bg-neutral-800 shadow-sm text-black dark:text-white"
                : "text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {syncState === "syncing" && events.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">Loading your events…</p>
      )}

      {!error && syncState !== "syncing" && groups.length === 0 && (
        <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center text-sm text-black/50 dark:text-white/50">
          No events in this range.
        </div>
      )}

      <div className="space-y-6">
        {groups.map(({ date, events: dayEvents }) => (
          <section key={date.toDateString()}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40 mb-2 sticky top-0">
              {dateHeading(date)}
            </h2>
            <ul className="space-y-1.5">
              {dayEvents.map((event) => (
                <li
                  key={event.id}
                  className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.02] p-3.5 flex items-center gap-3 hover:border-violet-300 dark:hover:border-violet-500/40 transition-colors"
                >
                  <div className="w-1 self-stretch rounded-full bg-violet-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{event.summary || "(No title)"}</p>
                    <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                      {formatEventTime(event)}
                      {event.recurringEventId && " · Recurring"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
