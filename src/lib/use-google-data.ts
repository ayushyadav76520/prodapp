"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { GoogleCalendarListEntry, GoogleEvent, GoogleTaskList, GoogleTask } from "./google-api";
import { computeActiveDates, computeLevel } from "./level";

export type SyncState = "idle" | "syncing" | "error";

export function useCalendarData() {
  const { status: sessionStatus } = useSession();
  const [calendars, setCalendars] = useState<GoogleCalendarListEntry[]>([]);
  const [events, setEvents] = useState<GoogleEvent[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (sessionStatus !== "authenticated") return;
    setSyncState("syncing");
    setError(null);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load events");
      setCalendars(data.calendars ?? []);
      setEvents(data.events ?? []);
      setSyncState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown sync error");
      setSyncState("error");
    }
  }, [sessionStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { calendars, events, syncState, error, refresh };
}

export function useTasksData() {
  const { status: sessionStatus } = useSession();
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (sessionStatus !== "authenticated") return;
    setSyncState("syncing");
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load tasks");
      setTaskLists(data.taskLists ?? []);
      setTasks(data.tasks ?? []);
      setSyncState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown sync error");
      setSyncState("error");
    }
  }, [sessionStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { taskLists, tasks, syncState, error, refresh };
}

export function useSkillsData() {
  const { status: sessionStatus } = useSession();
  const [skills, setSkills] = useState<
    { id: string; name: string; durationDays: number; startDate: string; completedDates: string[] }[]
  >([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (sessionStatus !== "authenticated") return;
    setSyncState("syncing");
    setError(null);
    try {
      const res = await fetch("/api/skills");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load skills");
      setSkills(data.skills ?? []);
      setSyncState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown sync error");
      setSyncState("error");
    }
  }, [sessionStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { skills, syncState, error, refresh };
}

export function useFocusSessionHistory() {
  const { status: sessionStatus } = useSession();
  const [sessions, setSessions] = useState<
    { id: string; title: string; durationMinutes: number; completedAt: string }[]
  >([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const refresh = useCallback(async () => {
    if (sessionStatus !== "authenticated") return;
    setSyncState("syncing");
    try {
      const res = await fetch("/api/focus-sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load focus sessions");
      setSessions(data.sessions ?? []);
      setSyncState("idle");
    } catch {
      setSyncState("error");
    }
  }, [sessionStatus]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, syncState, refresh };
}

// Combines events, tasks, skills, and focus sessions into the user's
// "Level" — one point per distinct day with any real activity. Fully
// derived from already-synced data, so it's automatically consistent
// across devices with no extra storage.
export function useLevel() {
  const { events } = useCalendarData();
  const { tasks } = useTasksData();
  const { skills } = useSkillsData();
  const { sessions } = useFocusSessionHistory();

  const activeDates = computeActiveDates(events, tasks, skills, sessions);
  const level = computeLevel(activeDates);
  const todayActive = activeDates.has(new Date().toDateString());

  return { level, activeDates, todayActive };
}
