import type { GoogleEvent, GoogleCalendarListEntry } from "@/lib/google-api";

const YOUR_EVENTS_COLOR = "#3fb950"; // fixed green for events on your own (primary) calendar
const SITE_ACCENT_COLOR = "var(--accent)"; // reuse the exact active theme accent
const DEFAULT_COLOR = SITE_ACCENT_COLOR; // fallback when Google provides no calendar color

function isHolidayCalendar(calendar?: GoogleCalendarListEntry) {
  if (!calendar || calendar.primary) return false;
  const source = `${calendar.summary ?? ""}`.trim().toLowerCase();
  const calendarId = `${calendar.id ?? ""}`.toLowerCase();
  return source.includes("holiday") || calendarId.includes("#holiday@group.v.calendar.google.com");
}

// Colors calendar events by their source Google Calendar.
// Primary-calendar events stay green. Holiday-source calendars use the site's
// active orange accent. Other subscribed calendars keep Google's own color.
export function getEventMeta(event: GoogleEvent, calendars: GoogleCalendarListEntry[]) {
  const cal = calendars.find((c) => c.id === event.calendarId);

  if (cal?.primary) {
    return { label: "You", color: YOUR_EVENTS_COLOR };
  }

  if (isHolidayCalendar(cal)) {
    return { label: cal?.summary ?? "Holiday", color: SITE_ACCENT_COLOR };
  }

  const label = cal?.summary ?? "Event";
  return { label, color: cal?.backgroundColor || DEFAULT_COLOR };
}
