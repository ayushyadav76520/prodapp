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
    <div className="border border-rule bg-paper-raised">
      <div className="flex items-center justify-between px-3 py-2 border-b border-rule">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="text-ink-soft hover:text-ink text-sm px-1"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-serif text-xs font-semibold tracking-wide">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase()}
        </p>
        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="text-ink-soft hover:text-ink text-sm px-1"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 text-center px-1.5 pt-2">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-[9px] uppercase tracking-widest text-ink-soft py-0.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 px-1.5 pb-2">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="aspect-square" />;
          const hasEvent = eventDays.has(date.toDateString());
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selectedDate);
          return (
            <button
              key={i}
              onClick={() => {
                onSelectDate(date);
              }}
              className={`aspect-square flex flex-col items-center justify-center text-[11px] relative transition-colors ${
                isSelected
                  ? "bg-ink text-paper"
                  : isToday
                  ? "text-accent font-semibold"
                  : "text-ink hover:bg-rule/40"
              }`}
            >
              <span>{date.getDate()}</span>
              {hasEvent && (
                <span
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                    isSelected ? "bg-paper" : "bg-accent"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
