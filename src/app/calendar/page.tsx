"use client";

import { useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useCalendarData } from "@/lib/use-google-data";
import { SyncStatus } from "@/components/SyncStatus";
import { MonthCalendarGrid } from "@/components/MonthCalendarGrid";
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
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function CalendarPage() {
  const { status: sessionStatus } = useSession();
  const { events, syncState, error, refresh } = useCalendarData();
  const [view, setView] = useState<"Day" | "Week" | "Month">("Week");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (selectedDate) {
      const seen = new Set<string>();
      const dayEvents = events
        .map((e) => ({ event: e, date: getEventDate(e) }))
        .filter(
          (x): x is { event: GoogleEvent; date: Date } =>
            x.date !== null && x.date.toDateString() === selectedDate.toDateString()
        )
        .filter(({ event, date }) => {
          const key = `${event.summary ?? ""}|${date.toISOString()}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((x) => x.event);
      return dayEvents.length ? [{ date: selectedDate, events: dayEvents }] : [];
    }

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
  }, [events, view, selectedDate]);

  const addEvent = async () => {
    if (!title.trim() || !date || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const allDay = !startTime;
      const startDateTime = startTime ? `${date}T${startTime}:00` : date;
      // Default end time: start + 1 hour if no end time given.
      let endDateTime = startDateTime;
      if (startTime) {
        if (endTime) {
          endDateTime = `${date}T${endTime}:00`;
        } else {
          const [h, m] = startTime.split(":").map(Number);
          const endH = (h + 1) % 24;
          endDateTime = `${date}T${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
        }
      }
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: title.trim(),
          startDateTime,
          endDateTime,
          allDay,
          timeZone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");
      setTitle("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setShowForm(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-serif text-3xl font-semibold mb-4">Calendar</h1>
        <div className="border border-rule p-10 text-center">
          <p className="text-sm text-ink-soft mb-4">
            Connect Google Calendar to see your events here.
          </p>
          <button
            onClick={() => signIn("google")}
            className="bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-accent transition-colors"
          >
            Connect Google Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-start justify-between border-b border-rule pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-1">
            Section Two
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">Calendar</h1>
        </div>
        <SyncStatus state={syncState} onRetry={refresh} />
      </header>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedDate(null)}
            className="text-xs uppercase tracking-widest text-ink-soft hover:text-accent transition-colors"
          >
            ↑ Today
          </button>
          <div className="flex gap-4 text-xs uppercase tracking-widest">
            {(["Day", "Week", "Month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  setSelectedDate(null);
                }}
                className={`pb-1 border-b-2 transition-colors ${
                  view === v ? "border-accent text-ink" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs uppercase tracking-widest border border-rule px-3 py-1.5 hover:border-ink transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Event"}
        </button>
      </div>

      {showForm && (
        <div className="border border-rule p-5 space-y-3 bg-paper-raised">
          {formError && <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-soft">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-ink-soft">
                Start time (blank = all day)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] uppercase tracking-widest text-ink-soft">
                End time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={!startTime}
                className="mt-1 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-40"
              />
            </div>
          </div>
          <button
            onClick={addEvent}
            disabled={!title.trim() || !date || saving}
            className="bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Adding…" : "Add to Google Calendar"}
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-600/30 bg-red-600/5 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_300px] gap-8 items-start">
        <div className="space-y-6 order-2 md:order-1">
          {syncState === "syncing" && events.length === 0 && (
            <p className="text-sm text-ink-soft">Loading your events…</p>
          )}

          {!error && syncState !== "syncing" && groups.length === 0 && (
            <div className="border border-dashed border-rule p-10 text-center text-sm text-ink-soft">
              No events{selectedDate ? " on this day" : " in this range"}.
            </div>
          )}

          {groups.map(({ date, events: dayEvents }) => (
            <section key={date.toDateString()} className="border border-rule">
              <h2 className="text-xs uppercase tracking-widest text-ink-soft px-4 py-2.5 border-b border-rule bg-paper-raised">
                {dateHeading(date)}
              </h2>
              <ul className="divide-y divide-rule px-4">
                {dayEvents.map((event) => (
                  <li key={event.id} className="py-3 flex items-baseline justify-between gap-4">
                    <p className="font-medium text-sm">{event.summary || "(No title)"}</p>
                    <p className="text-xs text-ink-soft whitespace-nowrap">
                      {formatEventTime(event)}
                      {event.recurringEventId && " · Recurring"}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="order-1 md:order-2 md:sticky md:top-10">
          <MonthCalendarGrid
            events={events}
            selectedDate={selectedDate ?? new Date()}
            onSelectDate={(d) =>
              setSelectedDate((cur) => (cur && cur.toDateString() === d.toDateString() ? null : d))
            }
          />
        </div>
      </div>
    </div>
  );
}
