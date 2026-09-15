import type { GoogleEvent, GoogleCalendarListEntry } from "@/lib/google-api";

const YOUR_EVENTS_COLOR = "#3fb950"; // fixed green for events on your own (primary) calendar
const DEFAULT_COLOR = "#e08a5f"; // the site's own accent orange — used whenever Google gives no calendar color

// Colors calendar events by their source Google Calendar. Events you created
// yourself (on your primary Google Calendar) are always shown in green and
// labeled "You". Everything else (holidays, subscribed calendars) uses
// Google's own calendar color when it provides one, otherwise falls back to
// the site's default accent orange — never a random/rotating color.
export function getEventMeta(event: GoogleEvent, calendars: GoogleCalendarListEntry[]) {
  const cal = calendars.find((c) => c.id === event.calendarId);

  if (cal?.primary) {
    return { label: "You", color: YOUR_EVENTS_COLOR };
  }

  const label = cal?.summary ?? "Event";
  return { label, color: cal?.backgroundColor || DEFAULT_COLOR };
}
