import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listCalendars, listEvents, insertEvent, GoogleApiError } from "@/lib/google-api";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (session.error === "RefreshAccessTokenError") {
    return NextResponse.json(
      { error: "Google session expired, please reconnect" },
      { status: 401 }
    );
  }

  // Default window: 30 days back to 90 days forward, unless the caller
  // (the Day/Week/Month view) specifies its own range.
  const { searchParams } = new URL(req.url);
  const now = new Date();
  const timeMin =
    searchParams.get("timeMin") ??
    new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const timeMax =
    searchParams.get("timeMax") ??
    new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const calendars = await listCalendars(session.accessToken);

    // Fetch events from every calendar the user has, in parallel.
    const eventsByCalendar = await Promise.all(
      calendars.map((cal) =>
        listEvents(session.accessToken!, cal.id, timeMin, timeMax).catch(
          (err) => {
            // If one calendar fails (e.g. permissions), don't kill the
            // whole request — just report it and continue with the rest.
            console.error(`Failed to fetch events for ${cal.id}`, err);
            return [];
          }
        )
      )
    );

    const events = eventsByCalendar.flat();

    return NextResponse.json({ calendars, events });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    console.error(err);
    return NextResponse.json({
      error: "Failed to fetch calendar data",
    }, { status: 500 });
  }
}

// Creates a new event on the user's primary Google Calendar.
// This is the "add from our app" side of the two-way sync — writes go
// straight to Google, there's no local-only event storage.
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json();
  const { summary, startDateTime, endDateTime, allDay, timeZone } = body;

  if (!summary || !startDateTime) {
    return NextResponse.json({ error: "Missing title or start time" }, { status: 400 });
  }

  try {
    const event = allDay
      ? {
          summary,
          start: { date: startDateTime.slice(0, 10) },
          end: { date: (endDateTime ?? startDateTime).slice(0, 10) },
        }
      : {
          summary,
          start: { dateTime: startDateTime, timeZone: timeZone || "UTC" },
          end: { dateTime: endDateTime ?? startDateTime, timeZone: timeZone || "UTC" },
        };

    const created = await insertEvent(session.accessToken, "primary", event);
    return NextResponse.json({ event: created });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
