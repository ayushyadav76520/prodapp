"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import {
  IconArrowRight,
  IconCalendar,
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

const HOME_QUOTE =
  "One day, you'll realize that every dream you had died because you chose comfort over effort, and there will be no one to blame but yourself. That regret will haunt you forever.";

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 5 ? "Night" : hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : hour < 21 ? "Evening" : "Night";
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

  const today = new Date();
  const todayKey = today.toDateString();
  const todayIso = today.toISOString().slice(0, 10);
  const dateStr = today.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const todaysEventCount = useMemo(
    () =>
      events.filter((e) => {
        const raw = e.start?.dateTime ?? e.start?.date;
        if (!raw) return false;
        return new Date(e.start?.date ? `${e.start.date}T00:00:00` : raw).toDateString() === todayKey;
      }).length,
    [events, todayKey]
  );

  const pendingTaskCount = useMemo(
    () => tasks.filter((t) => t.status !== "completed").length,
    [tasks]
  );

  const activeChallengeCount = useMemo(
    () =>
      skills.filter((s) => {
        const start = new Date(`${s.startDate}T00:00:00`);
        const end = new Date(start);
        end.setDate(end.getDate() + s.durationDays - 1);
        return today >= start && today <= end;
      }).length,
    [skills, todayKey]
  );

  const completedTasksToday = tasks.filter(
    (t) => t.status === "completed" && t.completed && new Date(t.completed).toDateString() === todayKey
  ).length;
  const completedChallengesToday = skills.filter((s) => s.completedDates.includes(todayIso)).length;
  const focusSessionsToday = focusSessions.filter((f) => new Date(f.completedAt).toDateString() === todayKey).length;

  const activeDates = computeActiveDates(events, tasks, skills, focusSessions);
  const level = activeDates.size;

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-9 pb-24 md:pb-10">
      <div className={`grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        <section className="rounded-[1.9rem] border border-rule bg-paper-raised p-5 sm:p-6 md:p-8 min-h-[300px] md:min-h-[360px] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-[1.35rem] bg-[#efe6cf] text-ink flex items-center justify-center shrink-0 border border-rule shadow-sm overflow-hidden">
                <IconProfile className="w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 md:w-24 md:h-24" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-accent font-semibold">Profile</p>
                <h1 className="font-serif text-[1.65rem] sm:text-3xl md:text-4xl font-semibold truncate mt-1">
                  {getGreeting()}, {session?.user?.name?.split(" ")[0] ?? "there"}
                </h1>
                <p className="text-sm sm:text-base text-ink-soft mt-1.5">{dateStr}</p>
              </div>
            </div>
            <Link href="/settings" aria-label="Settings" className="w-11 h-11 md:w-12 md:h-12 rounded-full border border-rule flex items-center justify-center hover:border-ink transition-colors shrink-0">
              <IconSettings className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-rule flex items-end justify-between gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft font-semibold">Current level</p>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="font-serif text-6xl sm:text-7xl md:text-8xl font-bold leading-none tabular-nums">{level}</p>
                <span className="text-sm sm:text-base text-ink-soft">one level per active day</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-1 gap-4">
          <HomeCountCard
            href="/calendar"
            icon={<IconCalendar className="w-6 h-6 sm:w-7 sm:h-7" />}
            label="Today events"
            count={todaysEventCount}
            noun={todaysEventCount === 1 ? "event" : "events"}
          />
          <HomeCountCard
            href="/tasks"
            icon={<IconTasks className="w-6 h-6 sm:w-7 sm:h-7" />}
            label="Tasks"
            count={pendingTaskCount}
            noun={pendingTaskCount === 1 ? "task" : "tasks"}
          />
          <HomeCountCard
            href="/skills"
            icon={<IconTrophy className="w-6 h-6 sm:w-7 sm:h-7" />}
            label="Challenges"
            count={activeChallengeCount}
            noun={activeChallengeCount === 1 ? "challenge" : "challenges"}
          />
        </div>
      </div>

      {session?.error === "RefreshAccessTokenError" && (
        <div className="mt-4 rounded-2xl border border-red-600/30 bg-red-600/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">Your Google session expired. Please reconnect.</p>
          <button onClick={() => signIn("google")} className="mt-3 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-red-700">Reconnect</button>
        </div>
      )}

      {(calError || taskError) && (
        <div className="mt-4 rounded-2xl border border-red-600/30 bg-red-600/5 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{calError ?? taskError}</p>
          <button onClick={() => { refreshEvents(); refreshTasks(); }} className="mt-2 text-xs underline text-red-700 dark:text-red-400">Retry</button>
        </div>
      )}

      <section className="mt-4 rounded-[1.9rem] border border-rule bg-paper-raised overflow-hidden">
        <div className="px-5 sm:px-6 md:px-8 py-5 sm:py-6 flex items-center gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-rule flex items-center justify-center shrink-0">
            <span className="text-accent text-xl">“</span>
          </div>
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-ink-soft font-semibold">Today&apos;s reminder</p>
            <blockquote className="font-serif text-base sm:text-xl md:text-2xl leading-relaxed mt-1">
              “{HOME_QUOTE}”
            </blockquote>
          </div>
        </div>
        <div className="px-5 sm:px-6 md:px-8 pb-5 sm:pb-6 text-xs text-ink-soft flex flex-wrap gap-x-5 gap-y-2">
          <span>{completedTasksToday} task{completedTasksToday === 1 ? "" : "s"} completed today</span>
          <span>{completedChallengesToday} challenge check-in{completedChallengesToday === 1 ? "" : "s"}</span>
          <span>{focusSessionsToday} focus session{focusSessionsToday === 1 ? "" : "s"}</span>
        </div>
      </section>
    </div>
  );
}

function HomeCountCard({
  href,
  icon,
  label,
  count,
  noun,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  count: number;
  noun: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.65rem] border border-rule bg-paper-raised p-5 sm:p-5 md:p-6 flex items-center justify-between gap-4 min-h-[112px] md:min-h-[calc((360px-32px)/3)] hover:border-ink transition-colors"
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="text-accent shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-ink-soft font-semibold">{label}</p>
          <p className="font-serif text-4xl sm:text-5xl font-bold leading-none mt-1 tabular-nums">{count}</p>
          <p className="text-xs sm:text-sm text-ink-soft mt-1">{noun}</p>
        </div>
      </div>
      <IconArrowRight className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-ink-soft group-hover:text-ink transition-colors" />
    </Link>
  );
}
