"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  notificationsSupported,
  notificationsEnabled,
  enableNotifications,
  disableNotifications,
} from "@/lib/notifications";

export default function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { data: session, status } = useSession();
  const [notifOn, setNotifOn] = useState(false);
  const [supported, setSupported] = useState(true);
  const [notifError, setNotifError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(notificationsSupported());
    setNotifOn(notificationsEnabled());
  }, []);

  const handleToggleNotifications = async () => {
    setNotifError(null);
    if (notifOn) {
      disableNotifications();
      setNotifOn(false);
      return;
    }
    const granted = await enableNotifications();
    if (granted) {
      setNotifOn(true);
    } else {
      setNotifError(
        "Permission denied. Enable notifications for this site in your browser settings, then try again."
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
      <header className="border-b border-rule pb-4">
        <p className="text-[11px] uppercase tracking-[0.2em] text-accent font-medium mb-1">
          Back Page
        </p>
        <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight">Settings</h1>
      </header>

      <div className="border border-rule p-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Appearance</p>
          <p className="text-xs text-ink-soft mt-0.5">Light / Dark mode</p>
        </div>
        <button
          onClick={toggle}
          className="text-xs uppercase tracking-widest border border-rule px-3 py-1.5 hover:border-ink transition-colors"
        >
          {theme === "light" ? "Switch to Dark" : "Switch to Light"}
        </button>
      </div>

      <div className="border border-rule p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Notifications</p>
            <p className="text-xs text-ink-soft mt-0.5 max-w-sm">
              Upcoming events, overdue tasks, and streak-break warnings — while
              the app is open in a tab or installed window.
            </p>
          </div>
          {supported ? (
            <button
              onClick={handleToggleNotifications}
              className={`text-xs uppercase tracking-widest px-3 py-1.5 whitespace-nowrap transition-colors ${
                notifOn
                  ? "border border-emerald-600/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-ink text-paper hover:bg-accent"
              }`}
            >
              {notifOn ? "✓ Enabled" : "Enable"}
            </button>
          ) : (
            <span className="text-xs text-ink-soft">Not supported</span>
          )}
        </div>
        {notifError && (
          <p className="text-xs text-red-700 dark:text-red-400 mt-3">{notifError}</p>
        )}
      </div>

      <div className="border border-rule p-5">
        <p className="text-sm font-medium">Google Account</p>
        {status === "authenticated" ? (
          <>
            <p className="text-xs text-ink-soft mt-0.5 mb-3">
              Connected as {session.user?.email}
            </p>
            <button
              onClick={() => signOut()}
              className="text-xs uppercase tracking-widest border border-red-600/40 text-red-700 dark:text-red-400 px-3 py-1.5 hover:bg-red-600/10 transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-ink-soft mt-0.5 mb-3">Not connected</p>
            <button
              onClick={() => signIn("google")}
              className="bg-ink text-paper text-sm font-medium px-4 py-2 hover:bg-accent transition-colors"
            >
              Connect Google Account
            </button>
          </>
        )}
      </div>
    </div>
  );
}
