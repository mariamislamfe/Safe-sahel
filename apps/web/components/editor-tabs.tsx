"use client";

import { usePathname } from "next/navigation";
import { FilterTabs } from "@/components/admin/ui";

/** Details / Photos / Inventory switcher for a single listing, with the current tab highlighted. */
export function EditorTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <FilterTabs
      items={tabs.map((t) => ({ ...t, active: pathname?.startsWith(t.href) ?? false }))}
    />
  );
}
