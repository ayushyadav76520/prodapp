"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { useCalendarData } from "@/lib/use-google-data";
import { SyncStatus } from "@/components/SyncStatus";
import { MonthCalendarGrid } from "@/components/MonthCalendarGrid";
import {
  IconTrash,
  IconPlus,
  IconSun,
  IconClock,
  IconDots,
  IconLeaf,
  IconCalendar,
  IconSkills,
  IconCheck,
  IconTasks,
} from "@/components/icons";
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

/** Best-effort category label/color derived from the calendar the event lives on. */
function eventCategory(event: GoogleEvent): { label: string; dot: string; badgeBg: string; badgeText: string; bar: string } {
  const isHoliday = (event.calendarId ?? "").toLowerCase().includes("holiday");
  if (isHoliday) {
    return {
      label: "Holiday",
      dot: "bg-orange-500",
      badgeBg: "bg-orange-500/15",
      badgeText: "text-orange-400",
      bar: "bg-orange-500",
    };
  }
  return {
    label: "Personal",
    dot: "bg-blue-500",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-400",
    bar: "bg-blue-500",
  };
}

const VIEW_TABS = [
  { key: "Month" as const, label: "Month", Icon: IconCalendar },
  { key: "Today" as const, label: "Today", Icon: IconSun },
  { key: "Day" as const, label: "Day", Icon: IconCalendar },
  { key: "Week" as const, label: "Week", Icon: IconCalendar },
];

export default function CalendarPage() {
  const { status: sessionStatus } = useSession();
  const { events, syncState, error, refresh } = useCalendarData();
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

  const totalEventCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.events.length, 0),
    [groups]
  );

  const listHeading = selectedDate
    ? dateHeading(selectedDate)
    : view === "Month"
    ? "This Month"
    : view === "Week"
    ? "This Week"
    : "Today";

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-5">
      <header className="flex items-start justify-between gap-4 border-b border-rule pb-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-1">
            Section Two
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1.5 text-sm text-ink-soft max-w-sm">
            Plan your days, stay consistent, and make time for what matters.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-3 shrink-0">
          <SyncStatus state={syncState} onRetry={refresh} />
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-accent text-ink px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition"
          >
            <IconPlus className="w-4 h-4" /> {showForm ? "Cancel" : "Add Event"}
          </button>
        </div>
      </header>

      {/* Compact sync + add row on mobile only */}
      <div className="flex sm:hidden items-center justify-between gap-3">
        <SyncStatus state={syncState} onRetry={refresh} />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-xl bg-accent text-ink px-3.5 py-2 text-xs font-semibold"
        >
          <IconPlus className="w-3.5 h-3.5" /> {showForm ? "Cancel" : "Add Event"}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {VIEW_TABS.map(({ key, label, Icon }) => {
          const isActive = key === "Month" ? view === "Month" && !selectedDate : view === key;
          return (
            <button
              key={label}
              onClick={() => {
                if (key === "Today") {
                  setView("Day");
                  setSelectedDate(new Date());
                } else {
                  setView(key as "Day" | "Week" | "Month");
                  setSelectedDate(null);
                }
              }}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors border ${
                isActive
                  ? "border-accent"
                  : "border-rule text-ink-soft hover:text-ink hover:border-ink"
              }`}
              style={isActive ? { backgroundColor: "var(--accent)", color: "#1a1410" } : undefined}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {showForm && (
        <div className="rounded-xl border border-rule p-5 space-y-3 bg-paper-raised">
          {formError && <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full rounded-lg border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div>
            <label className="text-[10px] uppercase tracking-widest text-ink-soft">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
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
                className="mt-1 w-full rounded-lg border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
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
                className="mt-1 w-full rounded-lg border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-40"
              />
            </div>
          </div>
          <button
            onClick={addEvent}
            disabled={!title.trim() || !date || saving}
            className="rounded-lg bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Adding…" : "Add to Google Calendar"}
          </button>
        </div>
      )}

      {(error || formError) && (
        <div className="rounded-xl border border-red-600/30 bg-red-600/5 p-4 text-sm text-red-700 dark:text-red-400">
          {error ?? formError}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="order-2 md:order-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg sm:text-xl font-semibold">{listHeading}</h2>
            <span className="text-xs text-ink-soft">{totalEventCount} events</span>
          </div>

          {syncState === "syncing" && events.length === 0 && (
            <p className="text-sm text-ink-soft">Loading your events…</p>
          )}

          {!error && syncState !== "syncing" && groups.length === 0 && (
            <div className="rounded-xl border border-dashed border-rule p-10 text-center text-sm text-ink-soft">
              No events{selectedDate ? " on this day" : " in this range"}.
            </div>
          )}

          <div className="space-y-3">
            {groups.map(({ date, events: dayEvents }) =>
              dayEvents.map((event) => {
                const cat = eventCategory(event);
                const weekday = date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
                const month = date.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
                return (
                  <div
                    key={event.id}
                    className="relative flex items-center justify-between gap-3 rounded-xl border border-rule bg-paper-raised py-3 pl-4 pr-3"
                    style={{ borderLeftWidth: 3 }}
                  >
                    <span className={`absolute left-0 top-0 h-full w-[3px] rounded-l-xl ${cat.bar}`} />
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="w-11 shrink-0 text-center">
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-soft">{weekday}</p>
                        <p className="font-serif text-xl font-bold leading-none">{date.getDate()}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-widest text-ink-soft">{month}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-sm">{event.summary || "(No title)"}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${cat.dot}`} />
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cat.badgeBg} ${cat.badgeText}`}
                          >
                            {cat.label}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-ink-soft">
                            <IconClock className="h-3 w-3" />
                            {formatEventTime(event)}
                            {event.recurringEventId && " · Recurring"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="grid h-7 w-7 place-items-center text-ink-soft/50" aria-hidden>
                        <IconDots className="h-4 w-4" />
                      </span>
                      <button
                        onClick={() => deleteEventItem(event.id, event.calendarId)}
                        disabled={deletingId === event.id}
                        className="grid h-7 w-7 place-items-center text-ink-soft/60 hover:text-red-500 transition-colors"
                        aria-label="Delete event"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="order-1 md:order-2 md:sticky md:top-8 space-y-5">
          <MonthCalendarGrid
            events={events}
            selectedDate={selectedDate ?? new Date()}
            onSelectDate={(d) => {
              setView("Month");
              setSelectedDate((cur) => (cur && cur.toDateString() === d.toDateString() ? null : d));
            }}
          />

          <div className="rounded-2xl border border-rule bg-paper-raised p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold">Quick Actions</h3>
              <span className="text-[10px] uppercase tracking-widest text-ink-soft">Create instantly</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 rounded-xl border border-rule p-2.5 text-left hover:border-ink transition-colors"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/20 text-accent">
                  <IconPlus className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium leading-tight">Add Event</span>
              </button>
              <Link
                href="/skills"
                className="flex items-center gap-2 rounded-xl border border-rule p-2.5 text-left hover:border-ink transition-colors"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-purple-500/15 text-purple-400">
                  <IconSkills className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium leading-tight">Focus Session</span>
              </Link>
              <Link
                href="/tasks"
                className="flex items-center gap-2 rounded-xl border border-rule p-2.5 text-left hover:border-ink transition-colors"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-400">
                  <IconCheck className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium leading-tight">Add Task</span>
              </Link>
              <Link
                href="/tasks"
                className="flex items-center gap-2 rounded-xl border border-rule p-2.5 text-left hover:border-ink transition-colors"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-500/15 text-blue-400">
                  <IconTasks className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium leading-tight">View All Tasks</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-rule bg-paper-raised p-4">
            <div className="flex items-start gap-3">
              <IconLeaf className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
              <p className="font-serif text-sm italic leading-snug">
                Discipline today,
                <br />
                freedom tomorrow.
              </p>
            </div>
            <div className="mt-3 h-px w-8 bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}
