"use client";

interface EventLike {
  start?: { dateTime?: string; date?: string };
}
interface TaskLike {
  status: string;
  completed?: string;
}
interface SkillLike {
  completedDates: string[];
}
interface FocusRecordLike {
  completedAt: string;
}

function dateKey(d: Date): string {
  return d.toDateString();
}

/**
 * Returns the set of distinct calendar days (as Date.toDateString() keys)
 * on which the user did *something* — attended/created an event, completed
 * a task, checked in on a skill, or ran a focus session. Each day counts
 * once no matter how many actions happened on it, which is what makes the
 * "+1 level per day" rule work automatically.
 */
export function computeActiveDates(
  events: EventLike[],
  tasks: TaskLike[],
  skills: SkillLike[],
  focusSessions: FocusRecordLike[]
): Set<string> {
  const active = new Set<string>();

  for (const e of events) {
    const start = e.start?.dateTime ?? e.start?.date;
    if (start) active.add(dateKey(new Date(start)));
  }
  for (const t of tasks) {
    if (t.status === "completed" && t.completed) {
      active.add(dateKey(new Date(t.completed)));
    }
  }
  for (const s of skills) {
    for (const d of s.completedDates) {
      // completedDates are stored as YYYY-MM-DD; parse as local date.
      active.add(dateKey(new Date(d + "T00:00:00")));
    }
  }
  for (const f of focusSessions) {
    active.add(dateKey(new Date(f.completedAt)));
  }

  return active;
}

export function computeLevel(activeDates: Set<string>): number {
  return activeDates.size;
}
