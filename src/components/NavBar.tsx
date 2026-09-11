"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/calendar", label: "Calendar", icon: "📅" },
  { href: "/tasks", label: "Tasks", icon: "✅" },
  { href: "/skills", label: "Skills", icon: "🎯" },
  { href: "/widgets", label: "Widgets", icon: "🧩" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function NavBar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Desktop side rail */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:border-r md:border-black/10 dark:md:border-white/10 md:py-6 md:px-3 md:gap-1">
        <div className="px-3 pb-4 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Productivity</span>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="text-sm rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-violet-100 text-violet-900 dark:bg-violet-500/20 dark:text-violet-200"
                  : "text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-black/10 dark:border-white/10 bg-white/90 dark:bg-neutral-950/90 backdrop-blur">
        <ul className="flex justify-between px-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                    active
                      ? "text-violet-600 dark:text-violet-300"
                      : "text-black/50 dark:text-white/50"
                  }`}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
