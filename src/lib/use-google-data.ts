"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { GoogleCalendarListEntry, GoogleEvent, GoogleTaskList, GoogleTask } from "./google-api";

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
