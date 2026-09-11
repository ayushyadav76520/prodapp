"use client";

import { useEffect, useState } from "react";
import {
  SkillChallenge,
  loadSkills,
  saveSkills,
  daysElapsed,
  daysRemaining,
  progressPercent,
  currentStreak,
  isCheckedInToday,
  toggleTodayCheckIn,
} from "@/lib/skills";

const DURATIONS: (30 | 60 | 90)[] = [30, 60, 90];

export default function SkillsPage() {
  const [skills, setSkills] = useState<SkillChallenge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<30 | 60 | 90>(30);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSkills(loadSkills());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveSkills(skills);
  }, [skills, loaded]);

  const addSkill = () => {
    if (!name.trim()) return;
    const newSkill: SkillChallenge = {
      id: crypto.randomUUID(),
      name: name.trim(),
      durationDays: duration,
      startDate: new Date().toISOString(),
      completedDates: [],
    };
    setSkills((prev) => [newSkill, ...prev]);
    setName("");
    setDuration(30);
    setShowForm(false);
  };

  const removeSkill = (id: string) => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  };

  const checkIn = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? toggleTodayCheckIn(s) : s))
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Learn a Skill</h1>
          <p className="text-sm text-black/50 dark:text-white/50 mt-0.5">
            30, 60 or 90 day challenges, tracked with daily streaks.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ New Challenge"}
        </button>
      </header>

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
            disabled={!name.trim()}
            className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Start Challenge
          </button>
        </div>
      )}

      {loaded && skills.length === 0 && !showForm && (
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
                  onClick={() => checkIn(skill.id)}
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
