"use client";

export interface FocusSessionRecord {
  id: string;
  title: string;
  durationMinutes: number;
  completedAt: string; // ISO string
}

const KEY = "focus-sessions";

export function loadFocusSessions(): FocusSessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addFocusSessionRecord(record: FocusSessionRecord) {
  const current = loadFocusSessions();
  localStorage.setItem(KEY, JSON.stringify([record, ...current].slice(0, 200)));
}

export function focusSessionStats() {
  const all = loadFocusSessions();
  const totalMinutes = all.reduce((sum, s) => sum + s.durationMinutes, 0);
  return { totalSessions: all.length, totalMinutes };
}
