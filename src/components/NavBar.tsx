"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tasks", label: "Tasks" },
  { href: "/skills", label: "Skills" },
  { href: "/widgets", label: "Widgets" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <>
      {/* Desktop masthead sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-60 md:shrink-0 md:border-r md:border-rule md:py-8 md:px-6">
        <div className="mb-10">
          <p className="font-serif text-3xl font-semibold tracking-tight text-ink lowercase">
            conflict
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
                className={`text-sm uppercase tracking-widest py-2 border-l-2 pl-3 transition-colors ${
                  active
                    ? "border-accent text-ink font-medium"
                    : "border-transparent text-ink-soft hover:text-ink hover:border-rule"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 border-t border-rule bg-paper-raised/95 backdrop-blur">
        <ul className="flex justify-between px-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] uppercase tracking-wide font-medium ${
                    active ? "text-accent" : "text-ink-soft"
                  }`}
                >
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
