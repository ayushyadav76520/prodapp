"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  IconPlay,
  IconPause,
  IconExpand,
  IconCollapse,
  IconDownload,
  IconShare,
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
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [breakBanner, setBreakBanner] = useState(false);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [lastSavedMinutes, setLastSavedMinutes] = useState(0);
  const [history, setHistory] = useState<FocusSessionRecord[]>([]);
  const [historySync, setHistorySync] = useState<"idle" | "syncing" | "error">("idle");
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

  // Focus countdown — only ticks while actively focusing (paused/break freeze it).
  useEffect(() => {
    if (phase !== "focusing") return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Break countdown — auto-resumes focus when it hits zero.
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
        // best-effort; history refresh will just show what's already saved
      }
    },
    [title, refreshHistory]
  );

  // Full completion (timer ran out naturally)
  useEffect(() => {
    if (phase !== "focusing" || remainingSeconds !== 0) return;
    const minutes = Math.round(totalSeconds / 60);
    setLastSavedMinutes(minutes);
    saveSession(minutes);
    setPhase("completed");
  }, [remainingSeconds, phase, totalSeconds, saveSession]);

  // Automatic break suggestion every 45 minutes of continuous focus
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
    lastBreakMarkRef.current = 0;
    setBreakBanner(false);
    setPhase("focusing");
  };

  const pauseResume = () => setPhase((p) => (p === "focusing" ? "paused" : "focusing"));

  const takeBreak = () => {
    setBreakRemaining(5 * 60);
    setBreakBanner(false);
    setPhase("break");
  };

  const extendBreak = () => setBreakRemaining((r) => r + 60);

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
    setBreakBanner(false);
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
      await shareOrDownload(
        blob,
        "focus-session.png",
        `I just completed a ${lastSavedMinutes}-minute focus session!`
      );
    }
  };

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const elapsedFraction = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const dashOffset = circumference * (1 - elapsedFraction);

  const totalHistoryMinutes = history.reduce((sum, s) => sum + s.durationMinutes, 0);

  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <div className="border border-rule p-6 space-y-5">
          <div>
            <label className="text-xs uppercase tracking-widest text-ink-soft">
              Session title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deep Work, Reading, Assignment"
              className="mt-1.5 w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-ink-soft">
              Duration (minutes) — set whatever you need
            </label>
            <input
              type="number"
              min={1}
              max={480}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 1)}
              className="mt-1.5 w-32 border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            onClick={start}
            className="bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-accent transition-colors"
          >
            Start Session
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-ink-soft">History</p>
            {historySync === "syncing" && (
              <span className="text-[10px] text-ink-soft">Syncing…</span>
            )}
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-ink-soft border border-dashed border-rule p-6 text-center">
              No sessions yet — your history syncs across devices via your Google account.
            </p>
          ) : (
            <>
              <p className="text-xs text-ink-soft mb-3">
                {history.length} session{history.length !== 1 ? "s" : ""} · {totalHistoryMinutes} minutes total
              </p>
              <ul className="divide-y divide-rule border border-rule">
                {history.map((rec) => (
                  <li key={rec.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{rec.title}</p>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {rec.durationMinutes} min · {new Date(rec.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => shareRecord(rec)}
                      className="w-11 h-11 rounded-full border border-rule text-ink-soft flex items-center justify-center hover:border-accent hover:text-accent transition-colors"
                      aria-label="Share this session"
                    >
                      <IconShare className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <div className="border border-rule p-6 space-y-5 text-center">
        <p className="text-[11px] uppercase tracking-widest text-accent font-medium">
          Session Complete
        </p>
        <p className="font-serif text-2xl font-semibold">
          {title.trim() || "Focus Session"}
        </p>
        <p className="text-sm text-ink-soft">
          You focused for {lastSavedMinutes} minute{lastSavedMinutes !== 1 ? "s" : ""}.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 border border-rule px-4 py-2 text-xs uppercase tracking-widest hover:border-ink transition-colors"
          >
            <IconDownload className="w-4 h-4" /> Download
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 bg-ink text-paper px-4 py-2 text-xs uppercase tracking-widest hover:bg-accent transition-colors"
          >
            <IconShare className="w-4 h-4" /> Share
          </button>
        </div>
        <button
          onClick={reset}
          className="text-xs uppercase tracking-widest text-ink-soft hover:text-accent underline"
        >
          Start another session
        </button>
      </div>
    );
  }

  // focusing, paused, or break
  return (
    <div
      ref={containerRef}
      className={`border border-rule p-8 flex flex-col items-center gap-6 ${
        isFullscreen ? "bg-paper justify-center h-screen" : "bg-paper-raised"
      }`}
    >
      {breakBanner && phase === "focusing" && (
        <div className="w-full border border-accent/40 bg-accent/10 p-3 text-sm flex items-center justify-between gap-3">
          <span>Time for a coffee break or a short walk?</span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={takeBreak}
              className="text-xs uppercase tracking-widest bg-ink text-paper px-3 py-1"
            >
              Take a break
            </button>
            <button
              onClick={() => setBreakBanner(false)}
              className="text-xs uppercase tracking-widest text-ink-soft hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <p className="text-xs uppercase tracking-widest text-accent font-medium">
        {title.trim() || "Focus Session"}
      </p>

      {phase === "break" ? (
        <>
          <div className="relative w-64 h-64 md:w-72 md:h-72 flex flex-col items-center justify-center">
            <p className="font-serif text-5xl font-semibold tabular-nums">
              {formatTime(breakRemaining)}
            </p>
            <p className="text-[10px] uppercase tracking-widest text-ink-soft mt-2">
              On a break
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={extendBreak}
              className="border border-rule px-4 py-2 text-xs uppercase tracking-widest hover:border-ink transition-colors"
            >
              +1 Minute Break
            </button>
            <button
              onClick={() => setPhase("focusing")}
              className="flex items-center gap-2 bg-ink text-paper px-4 py-2 text-xs uppercase tracking-widest hover:bg-accent transition-colors"
            >
              <IconPlay className="w-4 h-4" /> Resume Focus
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="relative w-64 h-64 md:w-72 md:h-72">
            <svg viewBox="0 0 260 260" className="w-full h-full -rotate-90">
              <circle cx="130" cy="130" r={radius} fill="none" stroke="var(--rule)" strokeWidth="10" />
              <circle
                cx="130"
                cy="130"
                r={radius}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-serif text-5xl font-semibold tabular-nums">
                {formatTime(remainingSeconds)}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-ink-soft mt-2">
                {phase === "paused" ? "Paused" : "Focusing"}
              </p>
            </div>
          </div>

          <p className="font-serif italic text-sm md:text-base text-ink-soft text-center max-w-sm">
            &ldquo;{quote}&rdquo;
          </p>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            <button
              onClick={pauseResume}
              className="flex items-center gap-2 bg-ink text-paper px-4 py-2 text-xs uppercase tracking-widest hover:bg-accent transition-colors"
            >
              {phase === "focusing" ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
              {phase === "focusing" ? "Pause" : "Resume"}
            </button>
            <button
              onClick={takeBreak}
              className="border border-rule px-4 py-2 text-xs uppercase tracking-widest hover:border-ink transition-colors"
            >
              Break (5 min)
            </button>
            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 border border-rule px-4 py-2 text-xs uppercase tracking-widest hover:border-ink transition-colors"
            >
              {isFullscreen ? <IconCollapse className="w-4 h-4" /> : <IconExpand className="w-4 h-4" />}
              {isFullscreen ? "Exit" : "Fullscreen"}
            </button>
          </div>
        </>
      )}

      <button
        onClick={endSessionEarly}
        className="text-xs uppercase tracking-widest text-red-700 dark:text-red-400 hover:underline"
      >
        End Session
      </button>
    </div>
  );
}
