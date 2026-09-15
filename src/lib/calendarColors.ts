import type { GoogleEvent, GoogleCalendarListEntry } from "@/lib/google-api";

const FALLBACK_COLORS = ["#e08a5f", "#5b8fd6", "#7fb069", "#c77dff", "#d6a24a"];

// Colors calendar events by their source Google Calendar (e.g. "Holidays",
// "Personal") — using Google's own calendar color when available, with a
// deterministic fallback so the same calendar always gets the same color.
export function getEventMeta(event: GoogleEvent, calendars: GoogleCalendarListEntry[]) {
  const cal = calendars.find((c) => c.id === event.calendarId);
  const label = cal?.summary ?? "Event";
  if (cal?.backgroundColor) return { label, color: cal.backgroundColor };
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return { label, color: FALLBACK_COLORS[hash % FALLBACK_COLORS.length] };
}
