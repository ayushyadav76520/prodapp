"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { SyncStatus } from "@/components/SyncStatus";
import { IconSettings } from "@/components/icons";
import { useCalendarData, useTasksData, useSkillsData } from "@/lib/use-google-data";

function getGreeting(name?: string) {
  const hour = new Date().getHours();
  const time =
    hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";
  return name ? `${time}, ${name}.` : `${time}.`;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const { events, syncState: calSync, error: calError, refresh: refreshEvents } = useCalendarData();
  const { tasks, syncState: taskSync, error: taskError, refresh: refreshTasks } = useTasksData();
  const { skills, syncState: skillSync } = useSkillsData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger the entrance animation just after first paint.
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const overallSync: "idle" | "syncing" | "error" =
    session?.error === "RefreshAccessTokenError" || calSync === "error" || taskSync === "error"
      ? "error"
      : calSync === "syncing" || taskSync === "syncing"
      ? "syncing"
      : "idle";

  const todayStr = new Date().toDateString();
  const todaysEventCount = events.filter((e) => {
    const start = e.start?.dateTime ?? e.start?.date;
    return start && new Date(start).toDateString() === todayStr;
  }).length;
  const openTaskCount = tasks.filter((t) => t.status === "needsAction").length;

  const retry = () => {
    refreshEvents();
    refreshTasks();
  };

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 md:py-14">
      <div className="flex items-center justify-between border-b border-rule pb-3 mb-10 text-[11px] uppercase tracking-widest text-ink-soft">
        <span>{dateStr}</span>
        {status === "authenticated" && <SyncStatus state={overallSync} onRetry={retry} />}
        <Link
          href="/settings"
          className="flex items-center gap-1.5 font-bold text-ink hover:text-accent transition-colors"
        >
          <IconSettings className="w-4 h-4" />
          Settings
        </Link>
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-10 items-start">
        <div
          className={`transition-all duration-700 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-3">
            Front Page
          </p>
          <h1 className="font-serif text-4xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
            {getGreeting(session?.user?.name?.split(" ")[0])}
          </h1>
          {status === "unauthenticated" && (
            <p className="text-sm text-ink-soft mt-6 max-w-md leading-relaxed">
              Sign in once, and this page keeps itself current — real events, real tasks, no fake placeholders, ever.
            </p>
          )}

          {status === "unauthenticated" && (
            <button
              onClick={() => signIn("google")}
              className="mt-6 inline-flex items-center gap-2 bg-ink text-paper text-sm font-medium px-5 py-2.5 rounded-none hover:bg-accent transition-colors"
            >
              Connect Google Account →
            </button>
          )}

          {status === "authenticated" && session.error === "RefreshAccessTokenError" && (
            <div className="mt-6 border border-red-600/30 bg-red-600/5 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                Your Google session expired. Please reconnect.
              </p>
              <button
                onClick={() => signIn("google")}
                className="mt-3 bg-red-600 text-white text-sm font-medium px-4 py-2 hover:bg-red-700"
              >
                Reconnect
              </button>
            </div>
          )}

          {(calError || taskError) && (
            <div className="mt-6 border border-red-600/30 bg-red-600/5 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">{calError ?? taskError}</p>
              <button onClick={retry} className="mt-2 text-xs underline text-red-700 dark:text-red-400">
                Retry
              </button>
            </div>
          )}
        </div>

        {status === "authenticated" && !session.error && (
          <div className="border border-rule bg-paper-raised">
            <p className="text-[10px] uppercase tracking-widest text-ink-soft px-4 pt-4">
              Today&apos;s Scorecard
            </p>
            <div className="grid grid-cols-3 divide-x divide-rule border-t border-rule mt-3">
              <Link
                href="/calendar"
                className="p-4 hover:bg-accent/10 transition-colors"
              >
                <p className="font-serif text-2xl md:text-3xl font-semibold">
                  {calSync === "syncing" ? "…" : todaysEventCount}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-ink-soft mt-1">
                  Events Today
                </p>
              </Link>
              <Link
                href="/tasks"
                className="p-4 hover:bg-accent/10 transition-colors"
              >
                <p className="font-serif text-2xl md:text-3xl font-semibold">
                  {taskSync === "syncing" ? "…" : openTaskCount}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-ink-soft mt-1">
                  Open Tasks
                </p>
              </Link>
              <Link
                href="/skills"
                className="p-4 hover:bg-accent/10 transition-colors"
              >
                <p className="font-serif text-2xl md:text-3xl font-semibold">
                  {skillSync === "syncing" ? "…" : skills.length}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-ink-soft mt-1">
                  Total Skills
                </p>
              </Link>
            </div>
          </div>
        )}
      </div>

      <div
        className={`mt-12 border border-rule bg-paper-raised p-6 md:p-8 transition-all duration-700 delay-150 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <p className="font-serif italic text-lg md:text-xl leading-relaxed text-ink">
          &ldquo;One day, you&apos;ll realize that every dream you had died
          because you chose comfort over effort, and there will be no one to
          blame but yourself. That regret will haunt you forever.&rdquo;
        </p>
      </div>
    </div>
  );
}
