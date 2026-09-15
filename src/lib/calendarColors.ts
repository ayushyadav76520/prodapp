import type { GoogleEvent, GoogleCalendarListEntry } from "@/lib/google-api";

const FALLBACK_COLORS = ["#e08a5f", "#5b8fd6", "#7fb069", "#c77dff", "#d6a24a"];
const YOUR_EVENTS_COLOR = "#3fb950"; // fixed green for events on your own (primary) calendar

// Colors calendar events by their source Google Calendar. Events you created
// yourself (on your primary Google Calendar) are always shown in green and
// labeled "You" — everything else (holidays, subscribed calendars) keeps
// Google's own calendar color, unchanged.
export function getEventMeta(event: GoogleEvent, calendars: GoogleCalendarListEntry[]) {
  const cal = calendars.find((c) => c.id === event.calendarId);

  if (cal?.primary) {
    return { label: "You", color: YOUR_EVENTS_COLOR };
  }

  const label = cal?.summary ?? "Event";
  if (cal?.backgroundColor) return { label, color: cal.backgroundColor };
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return { label, color: FALLBACK_COLORS[hash % FALLBACK_COLORS.length] };
}
