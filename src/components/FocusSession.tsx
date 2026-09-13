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


function FocusIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`focus-illustration ${compact ? "focus-illustration-compact" : ""}`}
      aria-label="Animated focus study illustration"
      role="img"
    >
      <svg viewBox="0 0 620 500" className="h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id="focusHalo" cx="50%" cy="44%" r="54%">
            <stop offset="0%" stopColor="#f1eee5" stopOpacity=".18" />
            <stop offset="48%" stopColor="#d8d2c7" stopOpacity=".12" />
            <stop offset="100%" stopColor="#8d877c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="deskSurface" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#8d8579" />
            <stop offset="50%" stopColor="#d9d2c6" />
            <stop offset="100%" stopColor="#7b746b" />
          </linearGradient>
          <linearGradient id="lampShade" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#f0ece2" stopOpacity=".28" />
            <stop offset="100%" stopColor="#7f796f" stopOpacity=".06" />
          </linearGradient>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        <circle cx="310" cy="235" r="203" fill="url(#focusHalo)" className="focus-halo" />
        <g className="focus-orbit-group">
          <circle cx="310" cy="235" r="188" className="focus-ring focus-ring-1" />
          <circle cx="310" cy="235" r="162" className="focus-ring focus-ring-2" />
          <circle cx="310" cy="235" r="136" className="focus-ring focus-ring-3" />
          <circle cx="310" cy="235" r="110" className="focus-ring focus-ring-4" />
        </g>

        <g className="focus-particles" opacity=".65">
          <circle cx="140" cy="126" r="3" />
          <circle cx="468" cy="142" r="2.5" />
          <circle cx="500" cy="292" r="3" />
          <circle cx="176" cy="350" r="2.5" />
          <circle cx="454" cy="356" r="2" />
        </g>

        <g className="focus-lamp">
          <path d="M140 370V175L194 123" fill="none" stroke="#201e1b" strokeWidth="10" strokeLinecap="round" />
          <path d="M190 121L241 142L207 192L157 169Z" fill="#3a3732" stroke="#171614" strokeWidth="6" />
          <path d="M198 167L174 212" stroke="#eee9de" strokeWidth="15" strokeLinecap="round" opacity=".78" />
          <path d="M191 185L236 250" stroke="url(#lampShade)" strokeWidth="26" strokeLinecap="round" opacity=".26" filter="url(#softGlow)" />
        </g>

        <g className="focus-desk-shadow">
          <ellipse cx="314" cy="397" rx="211" ry="25" fill="#000" opacity=".22" />
        </g>

        <g className="focus-desk">
          <path d="M102 342H480" stroke="url(#deskSurface)" strokeWidth="18" strokeLinecap="round" />
          <path d="M136 357L118 432M442 357L460 432" stroke="#4b4740" strokeWidth="10" strokeLinecap="round" />
          <rect x="234" y="305" width="118" height="13" rx="6.5" fill="#302d28" />
          <path d="M257 305L275 276H324L339 305Z" fill="#25231f" />
          <rect x="282" y="263" width="42" height="12" rx="6" fill="#d5cdbf" opacity=".18" />
          <path d="M305 275V303" stroke="#201e1a" strokeWidth="5" strokeLinecap="round" />
          <rect x="218" y="329" width="205" height="6" rx="3" fill="#f1ece1" opacity=".12" />
        </g>

        <g className="focus-person">
          <g className="focus-head">
            <circle cx="384" cy="162" r="39" fill="#e1dbcf" />
            <path d="M350 158C354 122 414 115 430 151C415 143 394 144 381 157C373 151 361 153 350 158Z" fill="#11100f" />
            <path d="M361 170C378 184 401 184 417 171" fill="none" stroke="#a8a196" strokeWidth="4" strokeLinecap="round" opacity=".85" />
          </g>
          <path d="M358 193C378 205 409 205 428 191L422 225H364Z" fill="#d7d1c6" />
          <path d="M413 220C463 216 489 246 483 297L466 337H357L366 276C369 247 385 229 413 220Z" fill="#7a756d" />
          <path d="M462 244C497 254 513 285 499 317L476 310L483 282L452 265Z" fill="#858078" className="focus-arm-back" />
          <path d="M374 275L323 316L344 334L398 292Z" fill="#99938a" className="focus-arm-front" />
          <path d="M323 316L290 347" stroke="#1b1917" strokeWidth="9" strokeLinecap="round" />
          <path d="M289 347L314 352" stroke="#1b1917" strokeWidth="8" strokeLinecap="round" />
        </g>

        <g className="focus-paper">
          <path d="M270 320L387 315L402 341L282 347Z" fill="#eee9df" opacity=".9" />
          <path d="M291 327L370 323" stroke="#9a9286" strokeWidth="2" opacity=".55" />
          <path d="M294 334L360 331" stroke="#9a9286" strokeWidth="2" opacity=".45" />
        </g>

        <g className="focus-pencil">
          <path d="M297 338L335 304" stroke="#dfae67" strokeWidth="7" strokeLinecap="round" />
          <path d="M335 304L341 299" stroke="#26231f" strokeWidth="5" strokeLinecap="round" />
        </g>

        <g className="focus-breath-dot">
          <circle cx="438" cy="120" r="4" />
        </g>
      </svg>
    </div>
  );
}

function ProfilePanel({
  name,
  level,
  title,
}: {
  name: string;
  level: number;
  title: string;
}) {
  return (
    <aside className="focus-profile-panel rounded-3xl border border-rule bg-paper-raised p-4 md:p-5">
      <div className="focus-profile-card rounded-2xl border border-rule bg-paper px-3.5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-rule bg-[#efe6cf] p-1 text-[#211d16] shrink-0">
            <IconProfile className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent">Profile</p>
            <p className="truncate text-sm font-semibold">{name || "User"}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-soft">Level {level}</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-accent">Now focusing</p>
        <p className="mt-1 font-serif text-lg font-semibold leading-tight truncate">{title || "Focus Session"}</p>
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
      <div className="focus-setup-shell rounded-3xl border-2 border-rule bg-paper-raised p-2.5 md:p-3">
        <div className="grid gap-2.5 lg:h-[min(470px,calc(100vh-250px))] lg:grid-cols-[minmax(0,1.02fr)_minmax(300px,0.78fr)]">
          <section className="min-h-0 rounded-2xl border-2 border-rule bg-paper p-3 md:p-3.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">ZenSpace</p>
                <h2 className="mt-1 font-serif text-2xl font-semibold tracking-tight md:text-[2rem]">Focus Session</h2>
                <p className="mt-0.5 text-xs text-ink-soft">Stay consistent, build a better you.</p>
              </div>
              <span className="rounded-full border border-rule px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Ready</span>
            </div>

            <div className="mt-3.5 grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Session title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Study DSA"
                  className="mt-1.5 w-full rounded-xl border-2 border-rule bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-soft">Minutes</label>
                <input
                  type="number"
                  min={1}
                  max={480}
                  value={durationMin}
                  onChange={(e) => setDurationMin(Number(e.target.value) || 1)}
                  className="mt-1.5 w-full rounded-xl border-2 border-rule bg-transparent px-3.5 py-2.5 text-lg font-semibold outline-none transition focus:border-accent"
                />
              </div>
            </div>

            <div className="mt-3 rounded-2xl border-2 border-rule p-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em]">Break</p>
                  <p className="mt-1 text-xs text-ink-soft">Starts at 5 min · +1 min whenever you need.</p>
                </div>
                <span className="rounded-xl border-2 border-rule px-3 py-1.5 text-sm font-semibold tabular-nums">5:00</span>
              </div>
            </div>

            <button
              onClick={start}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-accent"
            >
              <IconPlay className="h-4 w-4" /> Start Session
            </button>
          </section>

          <section className="flex min-h-0 flex-col rounded-2xl border-2 border-rule bg-paper p-3 md:p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">History</p>
                <h3 className="mt-1 font-serif text-xl font-semibold md:text-2xl">Your Sessions</h3>
              </div>
              <span className="rounded-full border border-rule px-2.5 py-1 text-[10px] uppercase tracking-widest text-ink-soft">{history.length}</span>
            </div>
            <p className="mt-1.5 text-xs text-ink-soft">{totalHistoryMinutes} minutes total · synced across devices</p>
            {historySync === "syncing" && <p className="mt-2 text-[10px] uppercase tracking-widest text-ink-soft">Syncing…</p>}

            <div className="history-list-scroll mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-rule p-6 text-center text-sm text-ink-soft">No sessions yet.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((rec) => (
                    <li key={rec.id} className="flex items-center gap-2 rounded-xl border-2 border-rule bg-paper-raised p-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{rec.title}</p>
                        <p className="mt-0.5 text-[11px] text-ink-soft">{rec.durationMinutes} min · {new Date(rec.completedAt).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => shareRecord(rec)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-rule text-ink-soft transition hover:border-accent hover:text-accent" aria-label="Share session" title="Share session"><IconShare className="h-5 w-5" /></button>
                      <button onClick={() => deleteRecord(rec.id, rec.title)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-rule text-ink-soft transition hover:border-red-500 hover:text-red-500" aria-label="Delete session" title="Delete session" disabled={deletingId === rec.id}><IconTrash className="h-5 w-5" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (phase === "completed") {
    return (
      <section className="rounded-3xl border border-rule bg-paper-raised p-5 md:p-7">
        <div className="grid gap-6 md:grid-cols-[0.75fr_1.25fr] md:items-center">
          <div className="rounded-2xl border border-rule bg-[#11100e] p-5 text-center text-white">
            <FocusIllustration compact />
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

  return (
    <div ref={containerRef} className={`focus-active-shell ${isFullscreen ? "focus-fullscreen" : ""}`}>
      <div className={`rounded-3xl border-2 border-rule p-2 md:p-2.5 ${isFullscreen ? "focus-fullscreen-inner" : "bg-paper-raised"}`}>
        {breakBanner && phase === "focusing" && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm md:flex-row md:items-center md:justify-between">
            <span>Time for a coffee break or a short walk?</span>
            <div className="flex items-center gap-2">
              <button onClick={takeBreak} className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold uppercase tracking-widest text-paper">Take a break</button>
              <button onClick={() => setBreakBanner(false)} className="px-3 py-2 text-xs font-semibold uppercase tracking-widest text-ink-soft">Dismiss</button>
            </div>
          </div>
        )}

        <div className={`mb-2 flex items-center justify-between gap-3 rounded-2xl border px-2.5 py-2 md:px-3.5 ${isFullscreen ? "focus-fullscreen-header" : "border-rule"}`}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">{isBreak ? "Break time" : "Focus Session"}</p>
            <p className="mt-1 truncate text-sm font-semibold">{title.trim() || "Focus Session"}</p>
          </div>
          <button onClick={toggleFullscreen} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${isFullscreen ? "focus-fullscreen-button" : "border-rule hover:border-accent"}`} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <IconCollapse className="h-4 w-4" /> : <IconExpand className="h-4 w-4" />}
          </button>
        </div>

        <div
          className={`grid gap-2 lg:min-h-[min(500px,calc(100vh-190px))] ${
            isFullscreen
              ? "lg:grid-cols-1 lg:min-h-[calc(100vh-92px)]"
              : "lg:grid-cols-[minmax(210px,0.46fr)_minmax(430px,1.54fr)]"
          }`}
        >
          {!isFullscreen && (
            <div className="flex min-h-0 flex-col gap-2.5">
              <ProfilePanel name={displayName} level={level} title={title} />
              {!isBreak && (
                <div className="flex flex-col gap-2 rounded-3xl border border-rule bg-paper-raised p-2.5">
                  <button onClick={pauseResume} className="rounded-2xl border-2 border-rule px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition hover:border-accent">{phase === "focusing" ? "Pause" : "Resume"}</button>
                  <button onClick={takeBreak} className="rounded-2xl border-2 border-rule px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition hover:border-accent">Break 5m</button>
                  <button onClick={toggleFullscreen} className="rounded-2xl border-2 border-rule px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition hover:border-accent">Full screen</button>
                </div>
              )}
            </div>
          )}

          <section className={`focus-timer-panel order-1 lg:order-2 min-h-0 rounded-3xl border border-white/12 bg-[#11100e] px-3 py-3 text-white md:px-4 md:py-3.5 ${isFullscreen ? "lg:mx-auto lg:w-full lg:max-w-4xl" : ""}`}>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" }).toUpperCase()} · {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toUpperCase()}
              </p>

              <div className="mt-3">
                <div className="focus-art-frame mx-auto max-w-[min(80%,340px)] rounded-full border border-white/15 bg-black/20 p-1">
                  <FocusIllustration />
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.45em] text-white/60">{isBreak ? "Break" : "Focus Session"}</p>
              </div>

              <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-white/55">{isBreak ? "Break Remaining" : "Elapsed"}</p>
              <p className="mt-0.5 font-sans text-3xl font-light tabular-nums sm:text-4xl lg:text-5xl">{isBreak ? formatTime(breakRemaining) : formatTime(elapsedSeconds)}</p>

              <div className="mx-auto mt-2.5 w-full max-w-lg">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/12">
                  <div className="h-full rounded-full bg-white transition-[width] duration-1000 ease-linear" style={{ width: `${Math.min(100, Math.max(0, (isBreak ? breakProgress : progress) * 100))}%` }} />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[9px] text-white/55">
                  <span>{isBreak ? "Break start" : sessionStartLabel}</span>
                  <span>{isBreak ? `${Math.round(breakTotalSeconds / 60)} min break` : `${Math.max(1, Math.round(totalSeconds / 60))} min`}</span>
                  <span>{isBreak ? "Resume" : sessionEndLabel}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {isBreak ? (
                  <>
                    <button onClick={extendBreak} className="rounded-xl border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition hover:border-white">+1 Minute</button>
                    <button onClick={() => setPhase("focusing")} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#11100e]"><IconPlay className="h-4 w-4" /> Resume Focus</button>
                  </>
                ) : (
                  <>
                    <button onClick={pauseResume} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#11100e]">
                      {phase === "focusing" ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}
                      {phase === "focusing" ? "Pause" : "Resume"}
                    </button>
                    <button onClick={takeBreak} className="rounded-xl border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition hover:border-white">Break (5 min)</button>
                    <button onClick={toggleFullscreen} className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest transition hover:border-white">
                      {isFullscreen ? <IconCollapse className="h-4 w-4" /> : <IconExpand className="h-4 w-4" />}
                      {isFullscreen ? "Exit" : "Fullscreen"}
                    </button>
                  </>
                )}
              </div>

              <p className="mx-auto mt-2.5 max-w-md font-serif text-[11px] italic text-white/62">&ldquo;{quote}&rdquo;</p>

              <button onClick={endSessionEarly} className="mt-2.5 text-[10px] font-semibold uppercase tracking-widest text-red-300 underline-offset-4 hover:underline">End Session & Save Progress</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
