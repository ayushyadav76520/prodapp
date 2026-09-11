"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useTasksData } from "@/lib/use-google-data";
import { SyncStatus } from "@/components/SyncStatus";

export default function TasksPage() {
  const { status: sessionStatus } = useSession();
  const { tasks, taskLists, syncState, error, refresh } = useTasksData();
  const [addingToList, setAddingToList] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const addTask = async (taskListId: string) => {
    if (!newTaskTitle.trim() || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTaskTitle.trim(), taskListId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create task");
      setNewTaskTitle("");
      setAddingToList(null);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    if (!categoryName.trim() || savingCategory) return;
    setSavingCategory(true);
    setFormError(null);
    try {
      const res = await fetch("/api/tasklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: categoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create category");
      setCategoryName("");
      setShowCategoryForm(false);
      refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSavingCategory(false);
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

  const deleteCategory = async (listId: string, listTitle: string) => {
    if (!confirm(`Delete category "${listTitle}" and all its tasks? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/tasklists/${listId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      refresh();
    } catch {
      setFormError("Couldn't delete that category. Try again.");
    }
  };

  const deleteTaskItem = async (taskId: string, taskListId: string) => {
    setPendingIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}?taskListId=${taskListId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      refresh();
    } catch {
      setFormError("Couldn't delete that task. Try again.");
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
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
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
          onClick={() => setShowCategoryForm((v) => !v)}
          className="text-xs uppercase tracking-widest border border-rule px-3 py-1.5 hover:border-ink transition-colors"
        >
          {showCategoryForm ? "Cancel" : "+ New Category"}
        </button>
      </div>

      {showCategoryForm && (
        <div className="border border-rule p-4 bg-paper-raised flex gap-3 items-center">
          <input
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Category name, e.g. Work, Personal"
            className="flex-1 border border-rule bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={addCategory}
            disabled={!categoryName.trim() || savingCategory}
            className="bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-accent disabled:opacity-40 whitespace-nowrap"
          >
            {savingCategory ? "Creating…" : "Create"}
          </button>
        </div>
      )}

      {(error || formError) && (
        <div className="border border-red-600/30 bg-red-600/5 p-4 text-sm text-red-700 dark:text-red-400">
          {error ?? formError}
        </div>
      )}

      {syncState === "syncing" && taskLists.length === 0 && (
        <p className="text-sm text-ink-soft">Loading your tasks…</p>
      )}

      {syncState !== "syncing" && taskLists.length === 0 && (
        <div className="border border-dashed border-rule p-10 text-center text-sm text-ink-soft">
          No task categories found.
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {taskLists.map((list) => {
          const listTasks = tasks.filter((t) => t.taskListId === list.id);
          const isAdding = addingToList === list.id;
          return (
            <div key={list.id} className="border border-rule">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-rule bg-paper-raised">
                <h2 className="text-xs uppercase tracking-widest">{list.title}</h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setAddingToList(isAdding ? null : list.id);
                      setNewTaskTitle("");
                    }}
                    className="text-ink-soft hover:text-accent text-sm leading-none"
                    aria-label="Add task"
                  >
                    +
                  </button>
                  <button
                    onClick={() => deleteCategory(list.id, list.title)}
                    className="text-ink-soft/50 hover:text-red-600 text-xs leading-none"
                    aria-label="Delete category"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {isAdding && (
                <div className="p-3 border-b border-rule flex gap-2">
                  <input
                    autoFocus
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTask(list.id)}
                    placeholder="Task title"
                    className="flex-1 border border-rule bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => addTask(list.id)}
                    disabled={!newTaskTitle.trim() || saving}
                    className="text-xs uppercase tracking-widest bg-ink text-paper px-3 disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}

              {listTasks.length === 0 ? (
                <p className="text-xs text-ink-soft px-4 py-6 text-center">No tasks yet.</p>
              ) : (
                <ul className="divide-y divide-rule px-4">
                  {listTasks.map((task) => {
                    const pending = pendingIds.has(task.id);
                    return (
                      <li key={task.id} className="py-3 flex items-start gap-3 group">
                        <button
                          onClick={() => toggleTask(task.id, list.id, task.status)}
                          disabled={pending}
                          className={`mt-0.5 w-4 h-4 border shrink-0 transition-colors ${
                            task.status === "completed"
                              ? "bg-ink border-ink"
                              : "border-ink-soft hover:border-ink"
                          } ${pending ? "opacity-40" : ""}`}
                        />
                        <div className="flex-1">
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
                        <button
                          onClick={() => deleteTaskItem(task.id, list.id)}
                          disabled={pending}
                          className="text-ink-soft/40 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Delete task"
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
