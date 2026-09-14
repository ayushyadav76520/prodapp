import { listTaskLists, createTaskList } from "@/lib/google-api";

export const FOCUS_LIST_TITLE = "Focus Sessions (Productivity App)";

export async function getOrCreateFocusList(accessToken: string): Promise<string> {
  const lists = await listTaskLists(accessToken);
  const existing = lists.find((l) => l.title === FOCUS_LIST_TITLE);
  if (existing) return existing.id;
  const created = await createTaskList(accessToken, FOCUS_LIST_TITLE);
  return created.id;
}

const NOTES_PREFIX = "FOCUS_META::";

export interface FocusMeta {
  durationMinutes: number;
  completedAt: string;
  // Present only when the session was ended before finishing — lets us
  // resume it later from exactly where it was left off.
  totalMinutes?: number;
  remainingSeconds?: number;
  incomplete?: boolean;
}

export function encodeFocusNotes(meta: FocusMeta): string {
  return NOTES_PREFIX + JSON.stringify(meta);
}

export function decodeFocusNotes(notes?: string): FocusMeta | null {
  if (!notes || !notes.startsWith(NOTES_PREFIX)) return null;
  try {
    return JSON.parse(notes.slice(NOTES_PREFIX.length));
  } catch {
    return null;
  }
}
