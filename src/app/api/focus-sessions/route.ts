import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteTask, listTasks, insertTask, GoogleApiError } from "@/lib/google-api";
import {
  getOrCreateFocusList,
  encodeFocusNotes,
  decodeFocusNotes,
} from "@/lib/focus-sync";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const taskListId = await getOrCreateFocusList(session.accessToken);
    const tasks = await listTasks(session.accessToken, taskListId);

    const sessions = tasks
      .map((t) => {
        const meta = decodeFocusNotes(t.notes);
        if (!meta) return null;
        return {
          id: t.id,
          title: t.title,
          durationMinutes: meta.durationMinutes,
          completedAt: meta.completedAt,
          totalMinutes: meta.totalMinutes,
          remainingSeconds: meta.remainingSeconds,
          incomplete: meta.incomplete ?? false,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    return NextResponse.json({ sessions });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to load focus sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { title, durationMinutes, totalMinutes, remainingSeconds, incomplete } = await req.json();
  const minutes = Number(durationMinutes);
  if (!title || !Number.isFinite(minutes) || minutes < 0) {
    return NextResponse.json({ error: "Invalid session data" }, { status: 400 });
  }

  try {
    const taskListId = await getOrCreateFocusList(session.accessToken);
    const completedAt = new Date().toISOString();
    const task = await insertTask(session.accessToken, taskListId, {
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
        id: task.id,
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
    return NextResponse.json({ error: "Failed to save focus session" }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing session id" }, { status: 400 });
  }

  try {
    const taskListId = await getOrCreateFocusList(session.accessToken);
    await deleteTask(session.accessToken, taskListId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to delete focus session" }, { status: 500 });
  }
}
