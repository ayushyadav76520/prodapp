import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listTasks, insertTask, GoogleApiError } from "@/lib/google-api";
import {
  getOrCreateSkillsList,
  encodeSkillNotes,
  decodeSkillNotes,
} from "@/lib/skills-sync";

export async function GET() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const taskListId = await getOrCreateSkillsList(session.accessToken);
    const tasks = await listTasks(session.accessToken, taskListId);

    const skills = tasks
      .map((t) => {
        const meta = decodeSkillNotes(t.notes);
        if (!meta) return null;
        return {
          id: t.id,
          name: t.title,
          durationDays: meta.durationDays,
          startDate: meta.startDate,
          completedDates: meta.completedDates,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    return NextResponse.json({ skills, taskListId });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to load skills" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { name, durationDays } = await req.json();
  if (!name || ![30, 60, 90].includes(durationDays)) {
    return NextResponse.json({ error: "Invalid skill data" }, { status: 400 });
  }

  try {
    const taskListId = await getOrCreateSkillsList(session.accessToken);
    const startDate = new Date().toISOString();
    const task = await insertTask(session.accessToken, taskListId, {
      title: name,
      notes: encodeSkillNotes({ durationDays, startDate, completedDates: [] }),
    });

    return NextResponse.json({
      skill: {
        id: task.id,
        name: task.title,
        durationDays,
        startDate,
        completedDates: [],
      },
      taskListId,
    });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create skill" }, { status: 500 });
  }
}
