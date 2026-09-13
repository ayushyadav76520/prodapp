"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconFocus,
  IconProfile,
  IconSettings,
  IconTasks,
  IconTrophy,
} from "@/components/icons";
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

function formatTime(dateValue?: string) {
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
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

  const today = new Date();
  const todayKey = today.toDateString();
  const dateStr = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const todaysEvents = useMemo(
    () =>
      events
        .filter((e) => {
          const raw = e.start?.dateTime ?? e.start?.date;
          return raw && new Date(e.start?.date ? `${e.start.date}T00:00:00` : raw).toDateString() === todayKey;
        })
        .sort((a, b) => {
          const aRaw = a.start?.dateTime ?? a.start?.date ?? "";
          const bRaw = b.start?.dateTime ?? b.start?.date ?? "";
          return new Date(aRaw).getTime() - new Date(bRaw).getTime();
        })
        .slice(0, 5),
    [events, todayKey]
  );

  const pendingTasks = useMemo(
    () => tasks.filter((t) => t.status !== "completed").slice(0, 5),
    [tasks]
  );

  const completedTasksToday = useMemo(
    () =>
      tasks.filter(
        (t) => t.status === "completed" && t.completed && new Date(t.completed).toDateString() === todayKey
      ).length,
    [tasks, todayKey]
  );

  const activeChallenges = useMemo(
    () => skills.filter((s) => {
      const start = new Date(`${s.startDate}T00:00:00`);
      const end = new Date(start);
      end.setDate(end.getDate() + s.durationDays);
      return today <= end;
    }).slice(0, 4),
    [skills, today]
  );

  const activeDates = computeActiveDates(events, tasks, skills, focusSessions);
  const level = activeDates.size;
  const activeDaysThisWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() - (6 - i));
    return activeDates.has(d.toDateString());
  }).filter(Boolean).length;

  const todayActions =
    todaysEvents.length +
    completedTasksToday +
    skills.filter((s) => s.completedDates.includes(today.toISOString().slice(0, 10))).length +
    focusSessions.filter((f) => new Date(f.completedAt).toDateString() === todayKey).length;

  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto px-6 py-16 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-3">Front Page</p>
        <h1 className="font-serif text-4xl font-semibold leading-tight">Your day, in order.</h1>
        <p className="text-sm text-ink-soft mt-4 leading-relaxed">
          Sign in once, and this page keeps itself current — real events, real tasks, no fake placeholders, ever.
        </p>
        <button onClick={() => signIn("google")} className="mt-6 inline-flex items-center gap-2 bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-accent transition-colors rounded-full">
          Connect Google Account →
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 py-7 md:py-10 space-y-4 pb-24 md:pb-10">
      <section className={`rounded-[2rem] border border-rule bg-paper-raised p-6 md:p-7 transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] rounded-2xl bg-[#efe6cf] text-ink flex items-center justify-center shrink-0 border border-rule shadow-sm overflow-hidden">
              <IconProfile className="w-14 h-14 md:w-[4rem] md:h-[4rem]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Your profile</p>
              <h1 className="font-serif text-2xl md:text-3xl font-semibold truncate mt-1">
                {getGreeting()}, {session?.user?.name?.split(" ")[0] ?? "there"}
              </h1>
              <p className="text-sm text-ink-soft mt-1">{dateStr}</p>
            </div>
          </div>
          <Link href="/settings" aria-label="Settings" className="w-11 h-11 rounded-full border border-rule flex items-center justify-center hover:border-ink transition-colors shrink-0">
            <IconSettings className="w-5 h-5" />
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto] items-end gap-4 pt-5 border-t border-rule">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">Current level</p>
            <p className="font-serif text-5xl md:text-6xl font-bold leading-none mt-1">{level}</p>
            <p className="text-sm text-ink-soft mt-2">One level for each day you actually used the app.</p>
          </div>
          <div className="rounded-2xl bg-accent text-paper px-4 py-3 text-right min-w-[110px]">
            <p className="text-[10px] uppercase tracking-[0.16em] opacity-75">This week</p>
            <p className="font-serif text-2xl font-bold mt-1">{activeDaysThisWeek}/7</p>
            <p className="text-[10px] uppercase tracking-[0.14em] opacity-80 mt-0.5">active days</p>
          </div>
        </div>
      </section>

      {session?.error === "RefreshAccessTokenError" && (
        <div className="rounded-2xl border border-red-600/30 bg-red-600/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">Your Google session expired. Please reconnect.</p>
          <button onClick={() => signIn("google")} className="mt-3 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-red-700">Reconnect</button>
        </div>
      )}

      {(calError || taskError) && (
        <div className="rounded-2xl border border-red-600/30 bg-red-600/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{calError ?? taskError}</p>
          <button onClick={retry} className="mt-2 text-xs underline text-red-700 dark:text-red-400">Retry</button>
        </div>
      )}

      <section className="rounded-[1.75rem] border border-rule bg-paper-raised overflow-hidden">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3"><IconCalendar className="w-6 h-6 text-accent" /><div><h2 className="font-serif text-xl font-semibold">Today&apos;s events</h2><p className="text-xs text-ink-soft mt-0.5">{todaysEvents.length} shown from Google Calendar</p></div></div>
          <Link href="/calendar" className="w-10 h-10 rounded-full border border-rule flex items-center justify-center hover:border-ink transition-colors"><IconArrowRight className="w-5 h-5" /></Link>
        </div>
        {todaysEvents.length === 0 ? (
          <div className="px-5 md:px-6 py-8 text-sm text-ink-soft">Nothing scheduled today.</div>
        ) : (
          <div className="divide-y divide-rule">
            {todaysEvents.map((event) => {
              const raw = event.start?.dateTime ?? event.start?.date ?? "";
              const allDay = Boolean(event.start?.date && !event.start?.dateTime);
              return (
                <div key={event.id} className="px-5 md:px-6 py-4 flex items-center gap-4">
                  <div className="w-2 h-10 rounded-full bg-accent shrink-0" />
                  <div className="min-w-0 flex-1"><p className="font-medium text-[15px] truncate">{event.summary || "Untitled event"}</p><p className="text-xs text-ink-soft mt-1">{allDay ? "All day" : formatTime(raw)}</p></div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-rule bg-paper-raised overflow-hidden">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3"><IconTasks className="w-6 h-6 text-accent" /><div><h2 className="font-serif text-xl font-semibold">Tasks</h2><p className="text-xs text-ink-soft mt-0.5">{completedTasksToday} completed today</p></div></div>
          <Link href="/tasks" className="w-10 h-10 rounded-full border border-rule flex items-center justify-center hover:border-ink transition-colors"><IconArrowRight className="w-5 h-5" /></Link>
        </div>
        {pendingTasks.length === 0 ? (
          <div className="px-5 md:px-6 py-8 text-sm text-ink-soft">No pending tasks. Nice.</div>
        ) : (
          <div className="divide-y divide-rule">
            {pendingTasks.map((task) => (
              <div key={task.id} className="px-5 md:px-6 py-4 flex items-center gap-3"><span className="w-5 h-5 rounded-md border border-rule shrink-0" /><p className="text-[15px] truncate">{task.title}</p></div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-rule bg-paper-raised overflow-hidden">
        <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-rule">
          <div className="flex items-center gap-3"><IconTrophy className="w-6 h-6 text-accent" /><div><h2 className="font-serif text-xl font-semibold">Challenges</h2><p className="text-xs text-ink-soft mt-0.5">Your active ZenSpace goals</p></div></div>
          <Link href="/skills" className="w-10 h-10 rounded-full border border-rule flex items-center justify-center hover:border-ink transition-colors"><IconArrowRight className="w-5 h-5" /></Link>
        </div>
        {activeChallenges.length === 0 ? (
          <div className="px-5 md:px-6 py-8 text-sm text-ink-soft">No active challenge yet.</div>
        ) : (
          <div className="divide-y divide-rule">
            {activeChallenges.map((skill) => {
              const checked = skill.completedDates.includes(today.toISOString().slice(0, 10));
              const pct = Math.min(100, (skill.completedDates.length / skill.durationDays) * 100);
              return <div key={skill.id} className="px-5 md:px-6 py-4"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-medium text-[15px] truncate">{skill.name}</p><p className="text-xs text-ink-soft mt-1">{skill.completedDates.length} of {skill.durationDays} days</p></div>{checked && <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-semibold"><IconCheck className="w-4 h-4" /> Done today</span>}</div><div className="h-2 bg-rule rounded-full overflow-hidden mt-3"><div className="h-full bg-accent rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} /></div></div>;
            })}
          </div>
        )}
      </section>

      <Link href="/skills" className="rounded-[1.75rem] border border-rule bg-ink text-paper p-5 md:p-6 flex items-center justify-between gap-4 hover:bg-accent transition-colors">
        <div><p className="text-[11px] uppercase tracking-[0.18em] opacity-70">ZenSpace</p><p className="font-serif text-xl font-semibold mt-1">{todayActions === 0 ? "Start something today." : `${todayActions} activity${todayActions === 1 ? "" : "ies"} logged today.`}</p></div>
        <IconFocus className="w-7 h-7 shrink-0" />
      </Link>
    </div>
  );
}
