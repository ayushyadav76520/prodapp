import { listTaskLists, createTaskList } from "@/lib/google-api";

export const SKILLS_LIST_TITLE = "Skill Challenges (Productivity App)";

export async function getOrCreateSkillsList(
  accessToken: string
): Promise<string> {
  const lists = await listTaskLists(accessToken);
  const existing = lists.find((l) => l.title === SKILLS_LIST_TITLE);
  if (existing) return existing.id;
  const created = await createTaskList(accessToken, SKILLS_LIST_TITLE);
  return created.id;
}

// Skill metadata is stored as a JSON blob inside the Google Task's `notes`
// field, prefixed so we can tell it apart from a task a user wrote by hand.
const NOTES_PREFIX = "SKILL_META::";

export interface SkillMeta {
  durationDays: number;
  startDate: string;
  completedDates: string[];
}

export function encodeSkillNotes(meta: SkillMeta): string {
  return NOTES_PREFIX + JSON.stringify(meta);
}

export function decodeSkillNotes(notes?: string): SkillMeta | null {
  if (!notes || !notes.startsWith(NOTES_PREFIX)) return null;
  try {
    return JSON.parse(notes.slice(NOTES_PREFIX.length));
  } catch {
    return null;
  }
}
