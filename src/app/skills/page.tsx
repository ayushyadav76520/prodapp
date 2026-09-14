"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  SkillChallenge,
  daysElapsed,
  daysRemaining,
  progressPercent,
  currentStreak,
  isCheckedInToday,
  toggleTodayCheckIn,
} from "@/lib/skills";
import { SyncStatus } from "@/components/SyncStatus";
import { IconTrash, IconShare, IconFocus, IconTrophy, IconPlus } from "@/components/icons";
import { FocusSession } from "@/components/FocusSession";
import { generateShareCard, shareOrDownload } from "@/lib/shareCard";
import { useLevel } from "@/lib/use-google-data";

const DURATIONS = [30, 60, 90] as const;

function IconChat({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M4 5.5h16v10.5H9.5L5 20v-4H4Z" strokeLinejoin="round" />
      <circle cx="9" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCode({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path d="M9 6.5 4 12l5 5.5M15 6.5 20 12l-5 5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconDumbbell({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M4 10v4M2.5 9.5v5M20 10v4M21.5 9.5v5M7 8v8M17 8v8M7 12h10" strokeLinecap="round" />
    </svg>
  );
}

function IconBook({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M12 6.2c-1.8-1.3-4.3-1.7-7-1.4v13c2.7-.3 5.2.1 7 1.4 1.8-1.3 4.3-1.7 7-1.4v-13c-2.7-.3-5.2.1-7 1.4Z" strokeLinejoin="round" />
      <path d="M12 6.2v13" />
    </svg>
  );
}

const SKILL_STYLES = [
  { bg: "bg-orange-900/40", text: "text-orange-400", Icon: IconChat },
  { bg: "bg-indigo-900/40", text: "text-indigo-400", Icon: IconCode },
  { bg: "bg-emerald-900/40", text: "text-emerald-400", Icon: IconDumbbell },
  { bg: "bg-rose-900/40", text: "text-rose-400", Icon: IconBook },
] as const;

function skillStyle(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return SKILL_STYLES[hash % SKILL_STYLES.length];
}

export default function SkillsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const { level } = useLevel();
  const [tab, setTab] = useState<"session" | "challenge">("challenge");
  const [skills, setSkills] = useState<SkillChallenge[]>([]);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<number>(30);
  const [customDays, setCustomDays] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const addSkill = async () => {
    const finalDuration = useCustom ? Number(customDays) : duration;
    if (!name.trim() || saving || !finalDuration || finalDuration < 1) return;
    setSaving(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), durationDays: finalDuration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create skill");
      setSkills((prev) => [data.skill, ...prev]);
      setName("");
      setDuration(30);
      setCustomDays("");
      setUseCustom(false);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
      setSyncState("error");
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (id: string, name: string) => {
    if (!confirm(`Delete skill "${name}"? This cannot be undone.`)) return;
    const prev = skills;
    setSkills((cur) => cur.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch {
      setSkills(prev);
      setError("Couldn't delete that skill. Try again.");
      setSyncState("error");
    }
  };

  const checkIn = async (skill: SkillChallenge) => {
    const updated = toggleTodayCheckIn(skill);
    setSkills((cur) => cur.map((s) => (s.id === skill.id ? updated : s)));
    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationDays: updated.durationDays,
          startDate: updated.startDate,
          completedDates: updated.completedDates,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      setSkills((cur) => cur.map((s) => (s.id === skill.id ? skill : s)));
      setError("Couldn't save check-in. Try again.");
      setSyncState("error");
    }
  };

  const shareSkill = async (skill: SkillChallenge) => {
    const pct = progressPercent(skill);
    const blob = await generateShareCard({
      eyebrow: "ZenSpace Challenge",
      title: skill.name,
      statLine: `Day ${daysElapsed(skill) + 1} of ${skill.durationDays} · ${currentStreak(skill)} day streak`,
      progressPercent: pct,
      footer: "conflict-calendar",
      userName: session?.user?.name ?? undefined,
      level,
    });
    if (blob) {
      await shareOrDownload(
        blob,
        `${skill.name.replace(/\s+/g, "-").toLowerCase()}-progress.png`,
        `${skill.name}: ${pct.toFixed(2)}% complete on my ZenSpace challenge!`
      );
    }
  };

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-serif text-3xl font-semibold mb-4">ZenSpace</h1>
        <div className="border border-rule p-10 text-center">
          <p className="text-sm text-ink-soft mb-4">
            Sign in to track challenges and focus sessions that sync across your devices.
          </p>
          <button
            onClick={() => signIn("google")}
            className="bg-ink text-paper text-sm font-medium px-5 py-2.5 hover:bg-accent transition-colors"
          >
            Connect Google Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="focus-skills-shell mx-auto w-full max-w-[1400px] px-3 sm:px-5 lg:px-8 py-4 sm:py-5">
      <header className="flex items-start justify-between gap-4 border-b border-rule pb-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-1">
            Section Four
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">
            ZenSpace
          </h1>
          {tab === "challenge" && (
            <p className="mt-1.5 text-sm text-ink-soft max-w-sm">
              Complete challenges, build streaks, and become a better you.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          {tab === "challenge" && <SyncStatus state={syncState} onRetry={refresh} />}
          {tab === "challenge" && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl bg-accent text-ink px-4 py-2.5 text-sm font-semibold hover:brightness-110 transition whitespace-nowrap"
            >
              <IconPlus className="w-4 h-4" /> {showForm ? "Cancel" : "New Challenge"}
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-5 text-sm border-b border-rule mt-4 mb-4">
        {(["session", "challenge"] as const).map((t) => {
          const Icon = t === "session" ? IconFocus : IconTrophy;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 pb-3 border-b-2 font-bold transition-colors ${
                tab === t ? "border-accent text-ink" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              <Icon className="w-5 h-5" />
              {t === "session" ? "Session" : "Challenge"}
            </button>
          );
        })}
      </div>

      {tab === "session" && <FocusSession />}

      {tab === "challenge" && (
        <div className="space-y-4">
          {error && (
            <div className="rounded-xl border border-red-600/30 bg-red-600/5 p-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {showForm && (
            <div className="max-w-2xl rounded-xl border border-rule p-5 space-y-4 bg-paper-raised">
              <div>
                <label className="text-xs uppercase tracking-widest text-ink-soft">
                  What skill are you learning?
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Guitar, Spanish, Cooking"
                  className="mt-1.5 w-full rounded-lg border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-ink-soft">
                  Challenge length
                </label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DURATIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDuration(d);
                        setUseCustom(false);
                      }}
                      className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                        !useCustom && duration === d
                          ? "bg-ink text-paper border-ink"
                          : "border-rule text-ink-soft hover:border-ink"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                  <button
                    onClick={() => setUseCustom(true)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                      useCustom
                        ? "bg-ink text-paper border-ink"
                        : "border-rule text-ink-soft hover:border-ink"
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {useCustom && (
                  <input
                    type="number"
                    min={1}
                    max={3650}
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="Number of days"
                    className="mt-2 w-40 rounded-lg border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                )}
              </div>
              <button
                onClick={addSkill}
                disabled={!name.trim() || saving || (useCustom && !customDays)}
                className="rounded-lg bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Starting…" : "Start Challenge"}
              </button>
            </div>
          )}

          {syncState === "syncing" && skills.length === 0 && (
            <p className="text-sm text-ink-soft">Loading your skills…</p>
          )}

          {syncState !== "syncing" && skills.length === 0 && !showForm && (
            <div className="rounded-xl border border-dashed border-rule p-10 text-center text-sm text-ink-soft">
              No active skill challenges yet. Start one above.
            </div>
          )}

          <div className="space-y-4">
            {skills.map((skill) => {
              const streak = currentStreak(skill);
              const checkedToday = isCheckedInToday(skill);
              const pct = progressPercent(skill);
              const { bg, text, Icon } = skillStyle(skill.id);
              return (
                <div key={skill.id} className="rounded-2xl border border-rule bg-paper-raised p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className={`grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-full ${bg} ${text}`}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-serif text-lg font-semibold truncate">{skill.name}</p>
                        <p className="text-xs sm:text-sm text-ink-soft mt-0.5">
                          Day {daysElapsed(skill) + 1} of {skill.durationDays} ·{" "}
                          {daysRemaining(skill)} days left
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => shareSkill(skill)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-rule text-ink-soft hover:border-accent hover:text-accent transition-colors"
                        aria-label="Share progress"
                      >
                        <IconShare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeSkill(skill.id, skill.name)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-rule text-ink-soft hover:border-red-500 hover:text-red-500 transition-colors"
                        aria-label="Delete skill"
                      >
                        <IconTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-ink-soft mb-1.5">
                      <span>Progress</span>
                      <span className="tabular-nums">{pct.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-rule rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          boxShadow: "0 0 8px var(--accent)",
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span>🔥</span>
                      <span className="font-serif font-semibold text-lg">{streak}</span>
                      <span className="text-ink-soft text-xs uppercase tracking-widest">
                        day streak
                      </span>
                    </div>
                    <button
                      onClick={() => checkIn(skill)}
                      className={`rounded-lg text-xs font-semibold uppercase tracking-widest px-4 py-2 transition-colors ${
                        checkedToday
                          ? "border border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
                          : "bg-paper text-ink hover:brightness-95"
                      }`}
                    >
                      {checkedToday ? "✓ Done today" : "Check in"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
