"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import {
  IconHome,
  IconCalendar,
  IconTasks,
  IconSkills,
} from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: IconHome },
  { href: "/calendar", label: "Calendar", Icon: IconCalendar },
  { href: "/tasks", label: "Tasks", Icon: IconTasks },
  { href: "/skills", label: "ZenSpace", Icon: IconSkills },
];

export function NavBar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Desktop masthead sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-[16.5rem] md:shrink-0 md:border-r md:border-rule md:py-8 md:px-6">
        <div className="mb-10">
          <p className="font-serif text-3xl font-semibold tracking-tight text-ink lowercase">
            conflict<span className="text-accent">-calendar</span>
          </p>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="mt-3 text-xs uppercase tracking-widest text-ink-soft hover:text-accent transition-colors"
          >
            {theme === "light" ? "☾ Dark mode" : "☀ Light mode"}
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 text-sm uppercase tracking-widest py-2 border-l-2 pl-3 transition-colors ${
                  active
                    ? "border-accent text-ink font-medium"
                    : "border-transparent text-ink-soft hover:text-ink hover:border-rule"
                }`}
              >
                <item.Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav — full-width, square edges, always dark regardless of theme */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20">
        <ul className="flex items-stretch justify-between bg-nav-bg text-nav-fg px-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-1 py-3.5 transition-colors ${
                    active ? "text-accent" : "text-nav-fg/60"
                  }`}
                >
                  <item.Icon className="w-6 h-6" />
                  <span className="text-[9px] uppercase tracking-wide font-medium whitespace-nowrap">
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
