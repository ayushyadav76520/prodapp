"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconPlay,
  IconPause,
  IconExpand,
  IconCollapse,
  IconDownload,
  IconShare,
} from "@/components/icons";
import { addFocusSessionRecord, focusSessionStats } from "@/lib/focusSessions";
import { generateShareCard, downloadBlob, shareOrDownload } from "@/lib/shareCard";

const QUOTES = [
  "Discipline is choosing between what you want now and what you want most.",
  "Small steps, done daily, outrun bursts done rarely.",
  "The work you avoid is usually the work that matters most.",
  "Focus is a muscle — every session makes it stronger.",
  "Done is better than perfect. Start.",
];

type Phase = "setup" | "running" | "paused" | "completed";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusSession() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState("");
  const [durationMin, setDurationMin] = useState(25);
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [breakBanner, setBreakBanner] = useState(false);
  const [stats, setStats] = useState({ totalSessions: 0, totalMinutes: 0 });
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const lastBreakMarkRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStats(focusSessionStats());
  }, [phase]);

  // Countdown tick
  useEffect(() => {
    if (phase !== "running") return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Completion + break-suggestion checks
  useEffect(() => {
    if (phase !== "running") return;
    if (remainingSeconds === 0) {
      const record = {
        id: crypto.randomUUID(),
        title: title.trim() || "Focus Session",
        durationMinutes: Math.round(totalSeconds / 60),
        completedAt: new Date().toISOString(),
      };
      addFocusSessionRecord(record);
      setPhase("completed");
      return;
    }
    const elapsed = totalSeconds - remainingSeconds;
    const blocksPassed = Math.floor(elapsed / (45 * 60));
    if (blocksPassed > lastBreakMarkRef.current) {
      lastBreakMarkRef.current = blocksPassed;
      setBreakBanner(true);
    }
  }, [remainingSeconds, phase, totalSeconds, title]);

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
    setPhase("running");
  };

  const pauseResume = () => setPhase((p) => (p === "running" ? "paused" : "running"));

  const addMinute = () => {
    setRemainingSeconds((r) => r + 60);
    setTotalSeconds((t) => t + 60);
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

  const handleDownload = async () => {
    const blob = await generateShareCard({
      eyebrow: "Focus Session",
      title: title.trim() || "Focus Session",
      statLine: `${Math.round(totalSeconds / 60)} minutes focused`,
      footer: "conflict-calendar",
    });
    if (blob) downloadBlob(blob, "focus-session.png");
  };

  const handleShare = async () => {
    const blob = await generateShareCard({
      eyebrow: "Focus Session",
      title: title.trim() || "Focus Session",
      statLine: `${Math.round(totalSeconds / 60)} minutes focused`,
      footer: "conflict-calendar",
    });
    if (blob) {
      await shareOrDownload(
        blob,
        "focus-session.png",
        `I just completed a ${Math.round(totalSeconds / 60)}-minute focus session!`
      );
    }
  };

  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const elapsedFraction = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const dashOffset = circumference * (1 - elapsedFraction);

  if (phase === "setup") {
    return (
      <div className="border border-rule p-6 space-y-5">
        <div>
          <label className="text-xs uppercase tracking-widest text-ink-soft">
            Session title (optional)
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
            Duration (minutes)
          </label>
          <div className="flex gap-2 mt-2 flex-wrap items-center">
            {[25, 45, 60].map((d) => (
              <button
                key={d}
                onClick={() => setDurationMin(d)}
                className={`px-4 py-1.5 text-sm font-medium border transition-colors ${
                  durationMin === d
                    ? "bg-ink text-paper border-ink"
                    : "border-rule text-ink-soft hover:border-ink"
                }`}
              >
                {d} min
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={480}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value) || 1)}
              className="w-24 border border-rule bg-transparent px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>
        <button
          onClick={start}
          className="bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-accent transition-colors"
        >
          Start Session
        </button>

        {stats.totalSessions > 0 && (
          <p className="text-xs text-ink-soft pt-2 border-t border-rule">
            {stats.totalSessions} session{stats.totalSessions !== 1 ? "s" : ""} completed ·{" "}
            {stats.totalMinutes} minutes total focus time
          </p>
        )}
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
          You focused for {Math.round(totalSeconds / 60)} minutes.
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

  // running or paused
  return (
    <div
      ref={containerRef}
      className={`border border-rule p-8 flex flex-col items-center gap-6 ${
        isFullscreen ? "bg-paper justify-center h-screen" : "bg-paper-raised"
      }`}
    >
      {breakBanner && (
        <div className="w-full border border-accent/40 bg-accent/10 p-3 text-sm text-center flex items-center justify-between gap-3">
          <span>Time for a short coffee break or a walk?</span>
          <button
            onClick={() => setBreakBanner(false)}
            className="text-xs uppercase tracking-widest text-ink-soft hover:text-ink shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <p className="text-xs uppercase tracking-widest text-accent font-medium">
        {title.trim() || "Focus Session"}
      </p>

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
          {phase === "running" ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
          {phase === "running" ? "Pause" : "Resume"}
        </button>
        <button
          onClick={addMinute}
          className="border border-rule px-4 py-2 text-xs uppercase tracking-widest hover:border-ink transition-colors"
        >
          +1 Minute
        </button>
        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 border border-rule px-4 py-2 text-xs uppercase tracking-widest hover:border-ink transition-colors"
        >
          {isFullscreen ? <IconCollapse className="w-4 h-4" /> : <IconExpand className="w-4 h-4" />}
          {isFullscreen ? "Exit" : "Fullscreen"}
        </button>
      </div>
    </div>
  );
}
