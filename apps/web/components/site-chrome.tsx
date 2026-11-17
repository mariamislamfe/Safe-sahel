"use client";

import { usePathname } from "next/navigation";
import { MobileTabBar, hidesTabBar } from "@/components/mobile-tab-bar";

/**
 * Public header/footer around every page — except the admin and host
 * dashboards, which are full-screen apps with their own navigation.
 * On phones, guest pages also get a bottom tab bar.
 */
export function SiteChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/owner"))
    return <div className="flex-1">{children}</div>;
  const tabBar = !hidesTabBar(pathname);
  return (
    <>
      {header}
      <div className="flex-1 pt-16">{children}</div>
      <div className={tabBar ? "pb-16 md:pb-0" : ""}>{footer}</div>
      <MobileTabBar />
    </>
  );
}
