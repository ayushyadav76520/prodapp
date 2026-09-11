"use client";

export interface SkillChallenge {
  id: string;
  name: string;
  durationDays: 30 | 60 | 90;
  startDate: string; // ISO date string
  completedDates: string[]; // array of "YYYY-MM-DD" strings the user checked in
}

const STORAGE_KEY = "skill-challenges";

export function loadSkills(): SkillChallenge[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSkills(skills: SkillChallenge[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysElapsed(skill: SkillChallenge): number {
  const start = new Date(skill.startDate);
  const now = new Date();
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return Math.max(0, diff);
}

export function daysRemaining(skill: SkillChallenge): number {
  return Math.max(0, skill.durationDays - daysElapsed(skill));
}

export function progressPercent(skill: SkillChallenge): number {
  return Math.min(100, Math.round((daysElapsed(skill) / skill.durationDays) * 100));
}

// Current streak = consecutive days (ending today or yesterday) checked in.
export function currentStreak(skill: SkillChallenge): number {
  const done = new Set(skill.completedDates);
  let streak = 0;
  const cursor = new Date();

  // If today isn't checked in yet, the streak still counts up through yesterday.
  if (!done.has(todayKey())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (done.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function isCheckedInToday(skill: SkillChallenge): boolean {
  return skill.completedDates.includes(todayKey());
}

export function toggleTodayCheckIn(skill: SkillChallenge): SkillChallenge {
  const key = todayKey();
  const has = skill.completedDates.includes(key);
  return {
    ...skill,
    completedDates: has
      ? skill.completedDates.filter((d) => d !== key)
      : [...skill.completedDates, key],
  };
}
