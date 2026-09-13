"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { IconSettings } from "@/components/icons";
import {
  useCalendarData,
  useTasksData,
  useSkillsData,
  useFocusSessionHistory,
} from "@/lib/use-google-data";
import { computeActiveDates } from "@/lib/level";

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 5 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
}

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const { events, error: calError, refresh: refreshEvents } = useCalendarData();
  const { tasks, error: taskError, refresh: refreshTasks } = useTasksData();
  const { skills } = useSkillsData();
  const { sessions: focusSessions } = useFocusSessionHistory();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const retry = () => {
    refreshEvents();
    refreshTasks();
  };

  const todayStr = new Date().toDateString();

  const eventsToday = events.filter((e) => {
    const start = e.start?.dateTime ?? e.start?.date;
    return start && new Date(start).toDateString() === todayStr;
  }).length;

  const tasksCompletedToday = tasks.filter(
    (t) => t.status === "completed" && t.completed && new Date(t.completed).toDateString() === todayStr
  ).length;

  const skillCheckinsToday = skills.filter((s) =>
    s.completedDates.includes(new Date().toISOString().slice(0, 10))
  ).length;

  const focusSessionsToday = focusSessions.filter(
    (f) => new Date(f.completedAt).toDateString() === todayStr
  ).length;

  const todayActions = eventsToday + tasksCompletedToday + skillCheckinsToday + focusSessionsToday;
  const todayGoal = 5;
  const todayPct = Math.min(100, Math.round((todayActions / todayGoal) * 100));

  const activeDates = computeActiveDates(events, tasks, skills, focusSessions);
  const level = activeDates.size;

  // Last 7 days activity count, oldest to newest, for the sparkline.
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toDateString();
    const count =
      events.filter((e) => {
        const s = e.start?.dateTime ?? e.start?.date;
        return s && new Date(s).toDateString() === key;
      }).length +
      tasks.filter((t) => t.completed && new Date(t.completed).toDateString() === key).length +
      skills.filter((s) => s.completedDates.includes(d.toISOString().slice(0, 10))).length +
      focusSessions.filter((f) => new Date(f.completedAt).toDateString() === key).length;
    return count;
  });
  const activeDaysThisWeek = last7.filter((c) => c > 0).length;
  const maxCount = Math.max(1, ...last7);
  const sparkPoints = last7
    .map((c, i) => {
      const x = (i / 6) * 100;
      const y = 30 - (c / maxCount) * 26;
      return `${x},${y}`;
    })
    .join(" ");

  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-3">
          Front Page
        </p>
        <h1 className="font-serif text-4xl font-semibold leading-tight">Your day, in order.</h1>
        <p className="text-sm text-ink-soft mt-4 leading-relaxed">
          Sign in once, and this page keeps itself current — real events, real tasks, no fake placeholders, ever.
        </p>
        <button
          onClick={() => signIn("google")}
          className="mt-6 inline-flex items-center gap-2 bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-accent transition-colors"
        >
          Connect Google Account →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-8 space-y-4">
      {/* Profile card */}
      <div
        className={`rounded-3xl border border-rule bg-paper-raised p-5 flex items-center justify-between transition-all duration-700 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shrink-0">
            <span className="font-serif font-bold text-paper text-lg">
              {getInitials(session?.user?.name)}
            </span>
          </div>
          <div>
            <p className="font-serif text-xl font-semibold">
              {getGreeting()}, {session?.user?.name?.split(" ")[0] ?? "there"}
            </p>
            <p className="text-xs text-ink-soft mt-0.5">{dateStr}</p>
          </div>
        </div>
        <Link
          href="/settings"
          aria-label="Settings"
          className="w-10 h-10 rounded-full border border-rule flex items-center justify-center hover:border-ink transition-colors"
        >
          <IconSettings className="w-5 h-5" />
        </Link>
      </div>

      {session?.error === "RefreshAccessTokenError" && (
        <div className="rounded-2xl border border-red-600/30 bg-red-600/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">
            Your Google session expired. Please reconnect.
          </p>
          <button
            onClick={() => signIn("google")}
            className="mt-3 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-red-700"
          >
            Reconnect
          </button>
        </div>
      )}

      {(calError || taskError) && (
        <div className="rounded-2xl border border-red-600/30 bg-red-600/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{calError ?? taskError}</p>
          <button onClick={retry} className="mt-2 text-xs underline text-red-700 dark:text-red-400">
            Retry
          </button>
        </div>
      )}

      {/* Today card */}
      <Link
        href="/calendar"
        className={`block rounded-3xl border border-rule bg-paper-raised p-5 hover:border-accent/50 transition-all duration-700 delay-75 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-ink-soft">
          <span>Today</span>
          <span>›</span>
        </div>
        <p className="font-serif text-xl font-semibold mt-2">
          {todayActions === 0 ? "A quiet day so far." : "Some real progress today."}
        </p>
        <p className="text-xs text-ink-soft mt-1">
          {eventsToday} events · {tasksCompletedToday} tasks done · {skillCheckinsToday} check-ins
        </p>
        <div className="mt-3 h-2.5 bg-rule rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${Math.max(todayPct, todayActions > 0 ? 6 : 0)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[11px]">
          <span className="text-ink-soft">+{todayActions} today</span>
          <span className="font-bold text-accent">LV {level}</span>
        </div>
      </Link>

      {/* Check-in card */}
      <Link
        href="/skills"
        className={`block rounded-3xl border border-rule bg-paper-raised p-5 hover:border-accent/50 transition-all duration-700 delay-100 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-ink-soft">
          <span>Check In</span>
          <span>›</span>
        </div>
        <p className="font-serif text-lg font-semibold mt-2">How did today go?</p>
      </Link>

      {/* Where you are */}
      <div className="pt-3">
        <p className="text-[11px] uppercase tracking-widest text-ink-soft mb-2">Where You Are</p>
        <div
          className={`rounded-3xl border border-rule bg-paper-raised p-5 transition-all duration-700 delay-150 ease-out ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-ink-soft">
            <span>This Week</span>
            <span>›</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="font-serif text-4xl font-bold">{activeDaysThisWeek}</p>
            <p className="text-sm text-ink-soft">active days out of the last 7</p>
          </div>
          <svg viewBox="0 0 100 32" className="w-full h-10 mt-3" preserveAspectRatio="none">
            <polyline
              points={sparkPoints}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Quote */}
      <div
        className={`rounded-3xl border border-rule bg-paper-raised p-6 transition-all duration-700 delay-200 ease-out ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <p className="font-serif italic text-base leading-relaxed text-ink">
          &ldquo;One day, you&apos;ll realize that every dream you had died
          because you chose comfort over effort, and there will be no one to
          blame but yourself. That regret will haunt you forever.&rdquo;
        </p>
      </div>
    </div>
  );
}
