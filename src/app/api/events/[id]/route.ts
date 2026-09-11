import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteEvent, GoogleApiError } from "@/lib/google-api";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const calendarId = req.nextUrl.searchParams.get("calendarId") ?? "primary";

  try {
    await deleteEvent(session.accessToken, calendarId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
