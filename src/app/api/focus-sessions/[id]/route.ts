import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { patchTask, GoogleApiError } from "@/lib/google-api";
import { getOrCreateFocusList, encodeFocusNotes } from "@/lib/focus-sync";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const { title, durationMinutes, totalMinutes, remainingSeconds, incomplete } = await req.json();
  const minutes = Number(durationMinutes);
  if (!title || !Number.isFinite(minutes) || minutes < 0) {
    return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
  }

  try {
    const taskListId = await getOrCreateFocusList(session.accessToken);
    const completedAt = new Date().toISOString();
    await patchTask(session.accessToken, taskListId, id, {
      title,
      notes: encodeFocusNotes({
        durationMinutes: minutes,
        completedAt,
        totalMinutes,
        remainingSeconds,
        incomplete,
      }),
    });

    return NextResponse.json({
      session: {
        id,
        title,
        durationMinutes: minutes,
        completedAt,
        totalMinutes,
        remainingSeconds,
        incomplete: incomplete ?? false,
      },
    });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to update focus session" }, { status: 500 });
  }
}
