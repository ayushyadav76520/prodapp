import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listTaskLists, listTasks, GoogleApiError } from "@/lib/google-api";

export async function GET() {
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

  try {
    const taskLists = await listTaskLists(session.accessToken);

    const tasksByList = await Promise.all(
      taskLists.map((list) =>
        listTasks(session.accessToken!, list.id).catch((err) => {
          console.error(`Failed to fetch tasks for list ${list.id}`, err);
          return [];
        })
      )
    );

    const tasks = tasksByList.flat();

    return NextResponse.json({ taskLists, tasks });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status }
      );
    }
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}
