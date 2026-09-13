"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  IconArrowRight,
  IconCollapse,
  IconDownload,
  IconProfile,
  IconExpand,
  IconPause,
  IconPlay,
  IconShare,
  IconTrash,
} from "@/components/icons";
import { generateShareCard, downloadBlob, shareOrDownload } from "@/lib/shareCard";
import { useLevel } from "@/lib/use-google-data";

const QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "Small steps, done daily, outrun bursts done rarely.",
  "The work you avoid is usually the work that matters most.",
  "Focus is a muscle — every session makes it stronger.",
  "Done is better than perfect. Start.",
];

interface FocusSessionRecord {
  id: string;
  title: string;
  durationMinutes: number;
  completedAt: string;
}

type Phase = "setup" | "focusing" | "paused" | "break" | "completed";

function formatTime(totalSeconds: number) {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function ProfilePanel({
  name,
  level,
  title,
  elapsedSeconds,
  remainingSeconds,
}: {
  name: string;
  level: number;
  title: string;
  elapsedSeconds: number;
  remainingSeconds: number;
}) {
  return (
    <aside className="focus-profile-panel order-2 lg:order-1 rounded-3xl border border-rule bg-paper-raised p-6 md:p-7">
      <div className="focus-profile-card rounded-2xl border border-rule bg-paper px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-rule bg-[#efe6cf] p-1.5 text-[#211d16]">
            <IconProfile className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Profile</p>
            <p className="mt-1 truncate text-lg font-semibold">{name || "User"}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Level {level}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Now focusing</p>
          <p className="mt-2 font-serif text-3xl font-semibold leading-tight">{title || "Focus Session"}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-rule p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Elapsed</p>
            <p className="mt-2 font-serif text-3xl font-semibold tabular-nums">{formatTime(elapsedSeconds)}</p>
          </div>
          <div className="rounded-2xl border border-rule p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Remaining</p>
            <p className="mt-2 font-serif text-3xl font-semibold tabular-nums">{formatTime(remainingSeconds)}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function FocusSession() {
  const { data: session } = useSession();
  const { level } = useLevel();
  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState(25);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [breakRemaining, setBreakRemaining] = useState(5 * 60);
  const [breakTotalSeconds, setBreakTotalSeconds] = useState(5 * 60);
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [breakBanner, setBreakBanner] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [lastSavedMinutes, setLastSavedMinutes] = useState(0);
  const [history, setHistory] = useState<FocusSessionRecord[]>([]);
  const [historySync, setHistorySync] = useState<"idle" | "syncing" | "error">("idle");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const lastBreakMarkRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshHistory = useCallback(async () => {
    setHistorySync("syncing");
    try {
      const res = await fetch("/api/focus-sessions");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load history");
      setHistory(data.sessions ?? []);
      setHistorySync("idle");
    } catch {
      setHistorySync("error");
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    if (phase !== "focusing") return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "break") return;
    const interval = setInterval(() => {
      setBreakRemaining((prev) => {
        if (prev <= 1) {
          setPhase("focusing");
          return 5 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const saveSession = useCallback(
    async (minutes: number) => {
      if (minutes <= 0) return;
      try {
        await fetch("/api/focus-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim() || "Focus Session",
            durationMinutes: minutes,
          }),
        });
        refreshHistory();
      } catch {
        // Best effort; the server history will remain intact if the request fails.
      }
    },
    [title, refreshHistory]
  );

  useEffect(() => {
    if (phase !== "focusing" || remainingSeconds !== 0) return;
    const minutes = Math.round(totalSeconds / 60);
    setLastSavedMinutes(minutes);
    saveSession(minutes);
    setPhase("completed");
  }, [remainingSeconds, phase, totalSeconds, saveSession]);

  useEffect(() => {
    if (phase !== "focusing") return;
    const elapsed = totalSeconds - remainingSeconds;
    const blocksPassed = Math.floor(elapsed / (45 * 60));
    if (blocksPassed > lastBreakMarkRef.current) {
      lastBreakMarkRef.current = blocksPassed;
      setBreakBanner(true);
    }
  }, [remainingSeconds, phase, totalSeconds]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const start = () => {
    const secs = Math.max(1, durationMin) * 60;
    setTotalSeconds(secs);
    setRemainingSeconds(secs);
    setSessionStartedAt(new Date());
    setBreakBanner(false);
    lastBreakMarkRef.current = 0;
    setPhase("focusing");
  };

  const pauseResume = () => setPhase((p) => (p === "focusing" ? "paused" : "focusing"));

  const takeBreak = () => {
    setBreakTotalSeconds(5 * 60);
    setBreakRemaining(5 * 60);
    setBreakBanner(false);
    setPhase("break");
  };

  const extendBreak = () => {
    setBreakRemaining((r) => r + 60);
    setBreakTotalSeconds((r) => r + 60);
  };

  const endSessionEarly = () => {
    const focusedSeconds = totalSeconds - remainingSeconds;
    const minutes = Math.round(focusedSeconds / 60);
    setLastSavedMinutes(minutes);
    if (minutes > 0) saveSession(minutes);
    setPhase("completed");
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen?.();
    } else {
      await document.exitFullscreen();
    }
  };

  const reset = () => {
    setPhase("setup");
    setTitle("");
    setDurationMin(25);
    setBreakRemaining(5 * 60);
    setBreakTotalSeconds(5 * 60);
    setSessionStartedAt(null);
    setBreakBanner(false);
  };

  const deleteRecord = async (id: string, recordTitle: string) => {
    if (deletingId) return;
    if (!window.confirm(`Delete session “${recordTitle}”? This will remove it from synced history.`)) return;
    setDeletingId(id);
    const previous = history;
    setHistory((items) => items.filter((item) => item.id !== id));
    try {
      const res = await fetch(`/api/focus-sessions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
    } catch {
      setHistory(previous);
      setHistorySync("error");
    } finally {
      setDeletingId(null);
    }
  };

  const shareRecord = async (rec: FocusSessionRecord) => {
    const blob = await generateShareCard({
      eyebrow: "Focus Session",
      title: rec.title,
      statLine: `${rec.durationMinutes} minutes focused · ${new Date(rec.completedAt).toLocaleDateString()}`,
      footer: "conflict-calendar",
      userName: session?.user?.name ?? undefined,
      level,
    });
    if (blob) {
      await shareOrDownload(
        blob,
        `${rec.title.replace(/\s+/g, "-").toLowerCase()}-session.png`,
        `I completed a ${rec.durationMinutes}-minute focus session: ${rec.title}`
      );
    }
  };

  const handleDownload = async () => {
    const blob = await generateShareCard({
      eyebrow: "Focus Session",
      title: title.trim() || "Focus Session",
      statLine: `${lastSavedMinutes} minutes focused`,
      footer: "conflict-calendar",
      userName: session?.user?.name ?? undefined,
      level,
    });
    if (blob) downloadBlob(blob, "focus-session.png");
  };

  const handleShare = async () => {
    const blob = await generateShareCard({
      eyebrow: "Focus Session",
      title: title.trim() || "Focus Session",
      statLine: `${lastSavedMinutes} minutes focused`,
      footer: "conflict-calendar",
      userName: session?.user?.name ?? undefined,
      level,
    });
    if (blob) {
      await shareOrDownload(blob, "focus-session.png", `I just completed a ${lastSavedMinutes}-minute focus session!`);
    }
  };

  const displayName = session?.user?.name ?? "Your profile";
  const elapsedSeconds = totalSeconds - remainingSeconds;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const breakProgress = breakTotalSeconds > 0 ? breakRemaining / breakTotalSeconds : 0;
  const sessionStartLabel = sessionStartedAt ? formatClock(sessionStartedAt) : "--:--";
  const sessionEndLabel = sessionStartedAt ? formatClock(new Date(sessionStartedAt.getTime() + totalSeconds * 1000)) : "--:--";
  const totalHistoryMinutes = history.reduce((sum, s) => sum + s.durationMinutes, 0);

  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-rule bg-paper-raised p-5 md:p-7">
          <div className="grid gap-6 md:grid-cols-[minmax(300px,0.92fr)_minmax(360px,1.08fr)] md:items-stretch">
            <div className="rounded-2xl border border-rule bg-paper p-5 md:p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">ZenSpace</p>
              <h2 className="mt-1 font-serif text-4xl font-semibold tracking-tight">Focus Session</h2>
              <p className="mt-2 text-sm text-ink-soft">Stay consistent, build a better you.</p>

              <div className="mt-8 space-y-5">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Session title</label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Study DSA"
                    className="mt-2 w-full rounded-xl border border-rule bg-transparent px-4 py-3 text-sm outline-none transition focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Session time</label>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={480}
                      value={durationMin}
                      onChange={(e) => setDurationMin(Number(e.target.value) || 1)}
                      className="w-28 rounded-xl border border-rule bg-transparent px-4 py-3 text-xl font-semibold outline-none transition focus:border-accent"
                    />
                    <span className="text-sm text-ink-soft">minutes</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-rule p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.15em]">Break</p>
                      <p className="mt-1 text-sm text-ink-soft">Starts at 5 min · extend by +1 min anytime.</p>
                    </div>
                    <span className="rounded-full border border-rule px-3 py-1 text-xs font-semibold">5:00</span>
                  </div>
                </div>
              </div>

              <button
                onClick={start}
                className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-semibold text-paper transition hover:bg-accent"
              >
                <IconPlay className="h-4 w-4" /> Start Session
              </button>
            </div>

            <div className="focus-visual-card rounded-2xl border border-rule bg-[#11100e] p-5 text-white md:p-7">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">
                <span>Preview</span>
                <span>Focus Session</span>
              </div>
              <div className="mt-6 flex flex-col items-center justify-center text-center">
                <div className="focus-art-frame rounded-full border border-white/15 bg-black/20 p-2">
                  <img src="/focus-study.jpg" alt="Focus session illustration" className="focus-art h-56 w-56 rounded-full object-cover md:h-72 md:w-72" />
                </div>
                <p className="mt-5 text-xs uppercase tracking-[0.42em] text-white/70">Elapsed</p>
                <p className="mt-2 font-sans text-6xl font-light tabular-nums md:text-7xl">05:00</p>
                <div className="mt-6 w-full max-w-md">
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full w-[48%] rounded-full bg-white" />
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-white/55">
                    <span>11:15 AM</span><span>10m</span><span>11:25 AM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-rule bg-paper-raised p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">History</p>
              <h3 className="mt-1 font-serif text-2xl font-semibold">Your Sessions</h3>
            </div>
            {historySync === "syncing" && <span className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">Syncing…</span>}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {history.length} session{history.length !== 1 ? "s" : ""} · {totalHistoryMinutes} minutes total · synced across devices
          </p>
          {history.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-rule p-6 text-center text-sm text-ink-soft">No sessions yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {history.map((rec) => (
                <li key={rec.id} className="flex items-center gap-3 rounded-2xl border border-rule bg-paper p-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{rec.title}</p>
                    <p className="mt-0.5 text-xs text-ink-soft">{rec.durationMinutes} min · {new Date(rec.completedAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => shareRecord(rec)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rule text-ink-soft transition hover:border-accent hover:text-accent"
                    aria-label="Share session"
                    title="Share session"
                  >
                    <IconShare className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => deleteRecord(rec.id, rec.title)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rule text-ink-soft transition hover:border-red-500 hover:text-red-500"
                    aria-label="Delete session"
                    title="Delete session"
                    disabled={deletingId === rec.id}
                  >
                    <IconTrash className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <section className="rounded-3xl border border-rule bg-paper-raised p-5 md:p-7">
        <div className="grid gap-6 md:grid-cols-[0.75fr_1.25fr] md:items-center">
          <div className="rounded-2xl border border-rule bg-[#11100e] p-5 text-center text-white">
            <img src="/focus-study.jpg" alt="Focus session" className="focus-art mx-auto h-56 w-56 rounded-full object-cover" />
            <p className="mt-4 text-[10px] uppercase tracking-[0.28em] text-white/60">Session Complete</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Well done</p>
            <h2 className="mt-1 font-serif text-4xl font-semibold">{title.trim() || "Focus Session"}</h2>
            <p className="mt-2 text-lg text-ink-soft">You focused for {lastSavedMinutes} minute{lastSavedMinutes !== 1 ? "s" : ""}.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={handleDownload} className="flex items-center gap-2 rounded-xl border border-rule px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition hover:border-ink">
                <IconDownload className="h-4 w-4" /> Download
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-paper transition hover:bg-accent">
                <IconShare className="h-4 w-4" /> Share
              </button>
            </div>
            <button onClick={reset} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-soft transition hover:text-accent">
              Start another session <IconArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const isBreak = phase === "break";
  const elapsedForPanel = isBreak ? elapsedSeconds : elapsedSeconds;

  return (
    <div ref={containerRef} className={`focus-active-shell ${isFullscreen ? "focus-fullscreen" : ""}`}>
      <div className="rounded-3xl border border-rule bg-paper-raised p-4 md:p-6">
        {breakBanner && phase === "focusing" && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm md:flex-row md:items-center md:justify-between">
            <span>Time for a coffee break or a short walk?</span>
            <div className="flex items-center gap-2">
              <button onClick={takeBreak} className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-widest text-paper">Take a break</button>
              <button onClick={() => setBreakBanner(false)} className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-ink-soft">Dismiss</button>
            </div>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-rule px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">{isBreak ? "Break time" : "Focus Session"}</p>
            <p className="mt-1 truncate text-sm font-semibold">{title.trim() || "Focus Session"}</p>
          </div>
          <button onClick={toggleFullscreen} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rule transition hover:border-accent" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <IconCollapse className="h-4 w-4" /> : <IconExpand className="h-4 w-4" />}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.74fr)_minmax(420px,1.26fr)]">
          {!isFullscreen && (
            <ProfilePanel
              name={displayName}
              level={level}
              title={title}
              elapsedSeconds={elapsedForPanel}
              remainingSeconds={remainingSeconds}
            />
          )}

          <section className={`focus-timer-panel order-1 lg:order-2 rounded-3xl border border-rule bg-[#11100e] px-5 py-7 text-white md:px-7 md:py-8 ${isFullscreen ? "lg:mx-auto lg:w-full lg:max-w-4xl" : ""}`}>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" }).toUpperCase()} · {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase()}
              </p>

              <div className="mt-6">
                <div className="focus-art-frame mx-auto rounded-full border border-white/15 bg-black/20 p-2">
                  <img src="/focus-study.jpg" alt="Person focusing at a desk" className="focus-art h-56 w-56 rounded-full object-cover sm:h-64 sm:w-64 md:h-72 md:w-72 lg:h-80 lg:w-80" />
                </div>
                <p className="mt-5 text-xs uppercase tracking-[0.5em] text-white/60">{isBreak ? "Break" : "Focus Session"}</p>
              </div>

              <p className="mt-7 text-[10px] uppercase tracking-[0.32em] text-white/55">{isBreak ? "Break Remaining" : "Elapsed"}</p>
              <p className="mt-2 font-sans text-6xl font-light tabular-nums sm:text-7xl">{isBreak ? formatTime(breakRemaining) : formatTime(elapsedSeconds)}</p>

              <div className="mx-auto mt-7 w-full max-w-2xl">
                <div className="h-2 overflow-hidden rounded-full bg-white/12">
                  <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, Math.max(0, (isBreak ? breakProgress : progress) * 100))}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/55">
                  <span>{isBreak ? "Break start" : sessionStartLabel}</span>
                  <span>{isBreak ? `${Math.round(breakTotalSeconds / 60)} min break` : `${Math.max(1, Math.round(totalSeconds / 60))} min`}</span>
                  <span>{isBreak ? "Resume" : sessionEndLabel}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {isBreak ? (
                  <>
                    <button onClick={extendBreak} className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition hover:border-white">+1 Minute</button>
                    <button onClick={() => setPhase("focusing")} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#11100e]"><IconPlay className="h-4 w-4" /> Resume Focus</button>
                  </>
                ) : (
                  <>
                    <button onClick={pauseResume} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#11100e]">
                      {phase === "focusing" ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}
                      {phase === "focusing" ? "Pause" : "Resume"}
                    </button>
                    <button onClick={takeBreak} className="rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition hover:border-white">Break (5 min)</button>
                    <button onClick={toggleFullscreen} className="flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition hover:border-white">
                      {isFullscreen ? <IconCollapse className="h-4 w-4" /> : <IconExpand className="h-4 w-4" />}
                      {isFullscreen ? "Exit" : "Fullscreen"}
                    </button>
                  </>
                )}
              </div>

              <p className="mx-auto mt-6 max-w-xl font-serif text-sm italic text-white/62">&ldquo;{quote}&rdquo;</p>

              <button onClick={endSessionEarly} className="mt-7 text-xs font-semibold uppercase tracking-widest text-red-300 underline-offset-4 hover:underline">End Session & Save Progress</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
