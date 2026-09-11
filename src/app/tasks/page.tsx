"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useTasksData } from "@/lib/use-google-data";
import { SyncStatus } from "@/components/SyncStatus";

export default function TasksPage() {
  const { status: sessionStatus } = useSession();
  const { tasks, taskLists, syncState, error, refresh } = useTasksData();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const addTask = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          due: due ? `${due}T00:00:00.000Z` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create task");
      setTitle("");
      setDue("");
      setShowForm(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (taskId: string, taskListId: string, currentStatus: string) => {
    setPendingIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskListId,
          status: currentStatus === "completed" ? "needsAction" : "completed",
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      refresh();
    } catch {
      setFormError("Couldn't update that task. Try again.");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-serif text-3xl font-semibold mb-4">Tasks</h1>
        <div className="border border-rule p-10 text-center">
          <p className="text-sm text-ink-soft mb-4">
            Connect Google Tasks to see your task lists here.
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
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-start justify-between border-b border-rule pb-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-1">
            Section Three
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">Tasks</h1>
        </div>
        <SyncStatus state={syncState} onRetry={refresh} />
      </header>

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs uppercase tracking-widest border border-rule px-3 py-1.5 hover:border-ink transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Task"}
        </button>
      </div>

      {showForm && (
        <div className="border border-rule p-5 space-y-3 bg-paper-raised">
          {formError && <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="w-full border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={addTask}
            disabled={!title.trim() || saving}
            className="bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Adding…" : "Add to Google Tasks"}
          </button>
        </div>
      )}

      {error && (
        <div className="border border-red-600/30 bg-red-600/5 p-4 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {syncState === "syncing" && tasks.length === 0 && (
        <p className="text-sm text-ink-soft">Loading your tasks…</p>
      )}

      {!error && syncState !== "syncing" && tasks.length === 0 && (
        <div className="border border-dashed border-rule p-10 text-center text-sm text-ink-soft">
          No tasks found in your Google Tasks lists.
        </div>
      )}

      {taskLists.map((list) => {
        const listTasks = tasks.filter((t) => t.taskListId === list.id);
        if (listTasks.length === 0) return null;
        return (
          <div key={list.id}>
            <h2 className="text-xs uppercase tracking-widest text-ink-soft mb-2 border-b border-rule pb-1">
              {list.title}
            </h2>
            <ul className="divide-y divide-rule">
              {listTasks.map((task) => {
                const pending = pendingIds.has(task.id);
                return (
                  <li key={task.id} className="py-3 flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task.id, list.id, task.status)}
                      disabled={pending}
                      className={`mt-0.5 w-4 h-4 border shrink-0 transition-colors ${
                        task.status === "completed"
                          ? "bg-ink border-ink"
                          : "border-ink-soft hover:border-ink"
                      } ${pending ? "opacity-40" : ""}`}
                    />
                    <div>
                      <p
                        className={`text-sm ${
                          task.status === "completed" ? "line-through text-ink-soft" : ""
                        }`}
                      >
                        {task.title || "(Untitled task)"}
                      </p>
                      {task.due && (
                        <p className="text-xs text-ink-soft mt-0.5">
                          Due {new Date(task.due).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
