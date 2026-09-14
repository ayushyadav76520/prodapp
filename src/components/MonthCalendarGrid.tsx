"use client";

import { useState } from "react";
import type { GoogleEvent } from "@/lib/google-api";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function getEventDateKey(event: GoogleEvent): string | null {
  const start = event.start?.dateTime ?? event.start?.date;
  if (!start) return null;
  return new Date(start).toDateString();
}

export function MonthCalendarGrid({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: GoogleEvent[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
}) {
  const [cursor, setCursor] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const eventDays = new Set(events.map(getEventDateKey).filter(Boolean));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

  return (
    <div className="rounded-2xl border border-rule bg-paper-raised p-3">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="grid h-7 w-7 place-items-center rounded-lg border border-rule text-ink-soft hover:text-ink hover:border-ink transition-colors"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-serif text-sm font-bold tracking-wide">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="grid h-7 w-7 place-items-center rounded-lg border border-rule text-ink-soft hover:text-ink hover:border-ink transition-colors"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-[10px] font-medium uppercase tracking-widest text-ink-soft py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;
          const hasEvent = eventDays.has(date.toDateString());
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <div key={i} className="grid place-items-center py-0.5">
              <button
                onClick={() => {
                  onSelectDate(date);
                }}
                className={`relative flex h-8 w-8 flex-col items-center justify-center rounded-lg text-[12px] transition-colors ${
                  isSelected
                    ? "bg-accent text-ink font-semibold"
                    : isToday
                    ? "text-accent font-semibold"
                    : "text-ink hover:bg-rule/40"
                }`}
              >
                <span>{date.getDate()}</span>
                {hasEvent && (
                  <span
                    className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                      isSelected ? "bg-ink" : "bg-accent"
                    }`}
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
