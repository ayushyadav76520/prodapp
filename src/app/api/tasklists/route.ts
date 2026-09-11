import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createTaskList, GoogleApiError } from "@/lib/google-api";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { title } = await req.json();
  if (!title || !title.trim()) {
    return NextResponse.json({ error: "Missing category name" }, { status: 400 });
  }

  try {
    const list = await createTaskList(session.accessToken, title.trim());
    return NextResponse.json({ taskList: list });
  } catch (err) {
    if (err instanceof GoogleApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
