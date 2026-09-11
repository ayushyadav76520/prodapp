"use client";

import { useSession, signIn } from "next-auth/react";
import { useTasksData } from "@/lib/use-google-data";
import { SyncStatus } from "@/components/SyncStatus";

export default function TasksPage() {
  const { status: sessionStatus } = useSession();
  const { tasks, taskLists, syncState, error, refresh } = useTasksData();

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Tasks</h1>
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8 text-center">
          <p className="text-sm text-black/60 dark:text-white/60 mb-4">
            Connect Google Tasks to see your task lists here.
          </p>
          <button
            onClick={() => signIn("google")}
            className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700"
          >
            Connect Google Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <SyncStatus state={syncState} onRetry={refresh} />
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {syncState === "syncing" && tasks.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">Loading your tasks…</p>
      )}

      {!error && syncState !== "syncing" && tasks.length === 0 && (
        <div className="rounded-2xl border border-black/10 dark:border-white/10 p-8 text-center text-sm text-black/50 dark:text-white/50">
          No tasks found in your Google Tasks lists.
        </div>
      )}

      {taskLists.map((list) => {
        const listTasks = tasks.filter((t) => t.taskListId === list.id);
        if (listTasks.length === 0) return null;
        return (
          <div key={list.id} className="space-y-2">
            <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
              {list.title}
            </h2>
            <ul className="space-y-2">
              {listTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-2xl border border-black/10 dark:border-white/10 p-4 flex items-start gap-3"
                >
                  <span
                    className={`mt-1 w-4 h-4 rounded-full border shrink-0 ${
                      task.status === "completed"
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-black/30 dark:border-white/30"
                    }`}
                  />
                  <div>
                    <p
                      className={`font-medium ${
                        task.status === "completed" ? "line-through text-black/40 dark:text-white/40" : ""
                      }`}
                    >
                      {task.title || "(Untitled task)"}
                    </p>
                    {task.due && (
                      <p className="text-xs text-black/50 dark:text-white/50 mt-0.5">
                        Due {new Date(task.due).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
