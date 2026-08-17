"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Board", icon: "M4 5h16M4 12h10M4 19h6" },
  { href: "/today", label: "Today", icon: "M5 12l4 4L19 7" },
  { href: "/evidence", label: "Evidence", icon: "M4 19V9m5 10V5m5 14v-7m5 7V8" },
  { href: "/programs", label: "Programs", icon: "M4 5.5A1.5 1.5 0 015.5 4H19v16H5.5A1.5 1.5 0 014 18.5zM8 8h7M8 12h7" },
  { href: "/parked", label: "Parked", icon: "M7 19V5h5a4 4 0 010 8H7" },
  { href: "/compass", label: "Compass", icon: "M12 3a9 9 0 100 18 9 9 0 000-18zm3.5 5.5l-2 5-5 2 2-5 5-2z" },
];

export function TabBar() {
  const pathname = usePathname();

  // Nothing to navigate to until the board is unlocked.
  if (pathname === "/unlock") return null;

  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-surface/85 backdrop-blur-xl pad-safe-bottom pad-safe-x">
      <ul className="mx-auto flex max-w-2xl">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                // 44pt is Apple's minimum comfortable touch target.
                // Six tabs on a 390pt screen leaves little room, so the label
                // shrinks and is allowed to clip rather than wrap to two lines.
                className={`flex min-h-11 flex-col items-center gap-1 px-0.5 py-2 text-[10px] ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path d={tab.icon} />
                </svg>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
