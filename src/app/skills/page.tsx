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

const DURATIONS: (30 | 60 | 90)[] = [30, 60, 90];

export default function SkillsPage() {
  const { status: sessionStatus } = useSession();
  const [skills, setSkills] = useState<SkillChallenge[]>([]);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<30 | 60 | 90>(30);
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
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), durationDays: duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create skill");
      setSkills((prev) => [data.skill, ...prev]);
      setName("");
      setDuration(30);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create skill");
      setSyncState("error");
    } finally {
      setSaving(false);
    }
  };

  const removeSkill = async (id: string) => {
    const prev = skills;
    setSkills((cur) => cur.filter((s) => s.id !== id));
    try {
      const res = await fetch(`/api/skills/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    } catch {
      setSkills(prev); // revert on failure
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
      setSkills((cur) => cur.map((s) => (s.id === skill.id ? skill : s))); // revert
      setError("Couldn't save check-in. Try again.");
      setSyncState("error");
    }
  };

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Learn a Skill</h1>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8 text-center">
          <p className="text-sm text-black/60 dark:text-white/60 mb-4">
            Sign in to track skill challenges that sync across all your devices.
          </p>
          <button
            onClick={() => signIn("google")}
            className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700 transition-colors"
          >
            Connect Google Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learn a Skill</h1>
          <p className="text-sm text-black/50 dark:text-white/50 mt-0.5">
            30, 60 or 90 day challenges — synced to your Google account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SyncStatus state={syncState} onRetry={refresh} />
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700 transition-colors"
          >
            {showForm ? "Cancel" : "+ New Challenge"}
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-black/60 dark:text-white/60">
              What skill are you learning?
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Guitar, Spanish, Cooking"
              className="mt-1 w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-black/60 dark:text-white/60">
              Challenge length
            </label>
            <div className="flex gap-2 mt-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    duration === d
                      ? "bg-violet-600 text-white"
                      : "border border-black/10 dark:border-white/10 text-black/60 dark:text-white/60"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={addSkill}
            disabled={!name.trim() || saving}
            className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Starting…" : "Start Challenge"}
          </button>
        </div>
      )}

      {syncState === "syncing" && skills.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">Loading your skills…</p>
      )}

      {syncState !== "syncing" && skills.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center text-sm text-black/50 dark:text-white/50">
          No active skill challenges yet. Start one above.
        </div>
      )}

      <div className="space-y-3">
        {skills.map((skill) => {
          const streak = currentStreak(skill);
          const checkedToday = isCheckedInToday(skill);
          const pct = progressPercent(skill);
          return (
            <div
              key={skill.id}
              className="rounded-2xl border border-black/10 dark:border-white/10 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{skill.name}</p>
                  <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                    Day {daysElapsed(skill) + 1} of {skill.durationDays} ·{" "}
                    {daysRemaining(skill)} days left
                  </p>
                </div>
                <button
                  onClick={() => removeSkill(skill.id)}
                  className="text-xs text-black/30 dark:text-white/30 hover:text-red-500"
                >
                  Remove
                </button>
              </div>

              <div className="mt-3 h-2 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-lg">🔥</span>
                  <span className="font-semibold">{streak}</span>
                  <span className="text-black/50 dark:text-white/50">
                    day streak
                  </span>
                </div>
                <button
                  onClick={() => checkIn(skill)}
                  className={`rounded-full text-sm font-medium px-4 py-1.5 transition-colors ${
                    checkedToday
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                  }`}
                >
                  {checkedToday ? "✓ Done today" : "Check in today"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
