"use client";

import { useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useCalendarData } from "@/lib/use-google-data";
import { SyncStatus } from "@/components/SyncStatus";
import { MonthCalendarGrid } from "@/components/MonthCalendarGrid";
import { IconTrash, IconCalendar, IconSun, IconClock } from "@/components/icons";
import type { GoogleEvent } from "@/lib/google-api";
import { getEventMeta } from "@/lib/calendarColors";

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
  const { events, calendars, syncState, error, refresh } = useCalendarData();
  const [view, setView] = useState<"Day" | "Week" | "Month">("Month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const rangedEvents = useMemo(() => {
    let list: { event: GoogleEvent; date: Date }[];

    if (selectedDate) {
      list = events
        .map((e) => ({ event: e, date: getEventDate(e) }))
        .filter(
          (x): x is { event: GoogleEvent; date: Date } =>
            x.date !== null && x.date.toDateString() === selectedDate.toDateString()
        );
    } else {
      const now = new Date();
      const days = view === "Day" ? 1 : view === "Week" ? 7 : 31;
      const windowStart = new Date(now);
      windowStart.setHours(0, 0, 0, 0);
      const windowEnd = new Date(now);
      windowEnd.setDate(now.getDate() + days);

      list = events
        .map((e) => ({ event: e, date: getEventDate(e) }))
        .filter(
          (x): x is { event: GoogleEvent; date: Date } =>
            x.date !== null && x.date >= windowStart && x.date <= windowEnd
        );
    }

    list.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Some Google accounts have the same holiday calendar subscribed more
    // than once — dedupe by title + exact start time.
    const seen = new Set<string>();
    return list.filter(({ event, date }) => {
      const key = `${event.summary ?? ""}|${date.toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [events, view, selectedDate]);

  const rangeLabel = selectedDate
    ? dateHeading(selectedDate)
    : view === "Day"
    ? "Today"
    : view === "Week"
    ? "This Week"
    : "This Month";

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

  const deleteEventItem = async (eventId: string, calendarId?: string) => {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setDeletingId(eventId);
    try {
      const res = await fetch(
        `/api/events/${eventId}?calendarId=${encodeURIComponent(calendarId ?? "primary")}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete event");
      refresh();
    } catch {
      setFormError("Couldn't delete that event. Try again.");
    } finally {
      setDeletingId(null);
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
      <header className="flex items-start justify-between gap-4 flex-wrap border-b border-rule pb-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-1">
            Section Two
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1.5 text-sm text-ink-soft max-w-md">
            Plan your days, stay consistent, and make time for what matters.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus state={syncState} onRetry={refresh} />
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-accent text-paper text-xs font-semibold uppercase tracking-widest px-4 py-2.5 hover:bg-ink transition-colors"
          >
            {showForm ? "Cancel" : "+ Add Event"}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-rule p-1 w-fit text-xs uppercase tracking-widest">
        {(["Month", "Day", "Week"] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              setSelectedDate(null);
            }}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors ${
              !selectedDate && view === v
                ? "bg-accent text-paper font-semibold"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            <IconCalendar className="w-3.5 h-3.5" />
            {v}
          </button>
        ))}
        <button
          onClick={() => setSelectedDate(null)}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-ink-soft hover:text-ink transition-colors"
        >
          <IconSun className="w-3.5 h-3.5" />
          Today
        </button>
      </div>

      {showForm && (
        <div className="border border-rule rounded-2xl p-5 space-y-3 bg-paper-raised">
          {formError && <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent rounded-lg"
          />
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-soft">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent rounded-lg"
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
                className="mt-1 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent rounded-lg"
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
                className="mt-1 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-40 rounded-lg"
              />
            </div>
          </div>
          <button
            onClick={addEvent}
            disabled={!title.trim() || !date || saving}
            className="bg-ink text-paper text-sm font-medium px-4 py-2 rounded-full hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Adding…" : "Add to Google Calendar"}
          </button>
        </div>
      )}

      {(error || formError) && (
        <div className="border border-red-600/30 bg-red-600/5 p-4 rounded-xl text-sm text-red-700 dark:text-red-400">
          {error ?? formError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8 items-start">
        <div className="order-2 md:order-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl font-semibold">{rangeLabel}</h2>
            <span className="text-xs text-ink-soft">
              {rangedEvents.length} event{rangedEvents.length === 1 ? "" : "s"}
            </span>
          </div>

          {syncState === "syncing" && events.length === 0 && (
            <p className="text-sm text-ink-soft">Loading your events…</p>
          )}

          {!error && syncState !== "syncing" && rangedEvents.length === 0 && (
            <div className="border border-dashed border-rule rounded-2xl p-10 text-center text-sm text-ink-soft">
              No events{selectedDate ? " on this day" : " in this range"}.
            </div>
          )}

          <ul className="space-y-2.5">
            {rangedEvents.map(({ event, date: evDate }) => {
              const { label, color } = getEventMeta(event, calendars);
              return (
                <li
                  key={event.id}
                  className="flex items-stretch gap-3 rounded-2xl border border-rule bg-paper-raised pr-3 overflow-hidden group"
                  style={{ borderLeft: `4px solid ${color}` }}
                >
                  <div className="flex flex-col items-center justify-center px-3 py-3 min-w-[64px] text-center">
                    <span className="text-[10px] uppercase tracking-widest text-ink-soft">
                      {evDate.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className="font-serif text-2xl font-semibold leading-none my-0.5">
                      {evDate.getDate()}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-ink-soft">
                      {evDate.toLocaleDateString(undefined, { month: "short" })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 py-3 flex flex-col justify-center gap-1.5">
                    <p className="font-semibold text-sm truncate">{event.summary || "(No title)"}</p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-ink-soft">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: `${color}26`, color }}
                        >
                          {label}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <IconClock className="w-3 h-3" />
                        {formatEventTime(event)}
                        {event.recurringEventId && " · Recurring"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteEventItem(event.id, event.calendarId)}
                    disabled={deletingId === event.id}
                    className="self-center w-9 h-9 rounded-full flex items-center justify-center text-ink-soft/50 hover:text-red-600 hover:bg-paper transition-colors shrink-0"
                    aria-label="Delete event"
                  >
                    <IconTrash className="w-4.5 h-4.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="order-1 md:order-2 md:sticky md:top-10 min-w-0">
          <MonthCalendarGrid
            events={events}
            calendars={calendars}
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
