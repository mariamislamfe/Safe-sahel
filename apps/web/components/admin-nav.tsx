"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ groups }: { groups: { href: string; label: string }[][] }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-lg flex flex-col gap-xs overflow-x-auto border-b border-border px-lg pb-sm">
      {groups.map((group, i) => (
        <div key={i} className="flex gap-xs">
          {group.map((tab) => {
            const active =
              tab.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 rounded-full px-md py-xs text-sm font-medium ${
                  active
                    ? "bg-ink text-white"
                    : "text-ink-secondary hover:bg-surface-soft hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
