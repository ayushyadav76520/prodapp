"use client";

import { useTheme } from "@/components/ThemeProvider";
import { useSession, signIn, signOut } from "next-auth/react";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { data: session, status } = useSession();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4 flex items-center justify-between">
        <div>
          <p className="font-medium">Appearance</p>
          <p className="text-xs text-black/50 dark:text-white/50">Light / Dark mode</p>
        </div>
        <button
          onClick={toggle}
          className="rounded-full border border-black/10 dark:border-white/10 px-3 py-1.5 text-sm"
        >
          {theme === "light" ? "Switch to Dark" : "Switch to Light"}
        </button>
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
        <p className="font-medium">Google Account</p>
        {status === "authenticated" ? (
          <>
            <p className="text-xs text-black/50 dark:text-white/50 mb-3">
              Connected as {session.user?.email}
            </p>
            <button
              onClick={() => signOut()}
              className="rounded-full border border-red-500/40 text-red-600 dark:text-red-400 text-sm font-medium px-4 py-2 hover:bg-red-500/10"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-black/50 dark:text-white/50 mb-3">Not connected</p>
            <button
              onClick={() => signIn("google")}
              className="rounded-full bg-violet-600 text-white text-sm font-medium px-4 py-2 hover:bg-violet-700"
            >
              Connect Google Account
            </button>
          </>
        )}
      </div>
    </div>
  );
}
