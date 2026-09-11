import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { patchTask, GoogleApiError } from "@/lib/google-api";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const { taskListId, status } = await req.json();

  if (!taskListId || !status) {
    return NextResponse.json({ error: "Missing taskListId or status" }, { status: 400 });
  }

  try {
    const updated = await patchTask(session.accessToken, taskListId, id, { status });
    return NextResponse.json({ task: updated });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}
