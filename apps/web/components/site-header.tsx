"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Locale } from "@safe-sahel/types";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import { createClient } from "@/lib/supabase/client";
import { LocaleToggle } from "@/app/locale-toggle";
import { getDictionary } from "@/lib/i18n/dictionary";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      {open ? (
        <path d="M5 5l12 12M17 5L5 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      ) : (
        <>
          <path d="M3 6h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 11h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3 16h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function SiteHeader({ locale }: { locale: Locale }) {
  const { profile, loading } = useCurrentProfile();
  const router = useRouter();
  const pathname = usePathname();
  const t = getDictionary(locale).nav;
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    // Deferred to a microtask — calling onScroll() (which setStates) directly
    // and synchronously in the effect body trips react-hooks/set-state-in-effect.
    Promise.resolve().then(onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Only the homepage has a hero image behind the header at scroll-top, so
  // only there does the header go fully transparent with light text — every
  // other route sits on a plain surface background from y=0, where a
  // transparent-with-dark-text header already reads fine.
  const onHero = pathname === "/" && !scrolled;

  const navLinks = [
    { href: "/#discover", label: t.explore },
    { href: "/search", label: t.stays },
    { href: "/locations", label: t.locations },
  ];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-30 transition-colors duration-300 ${
        onHero
          ? "border-b border-transparent bg-transparent"
          : "border-b border-border/70 bg-surface/90 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-md px-lg">
        <Link href="/" className="flex items-center gap-sm">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-turquoise to-turquoise-dark font-display text-xs font-extrabold text-white">
            SS
          </div>
          <span
            className={`hidden font-display text-[15px] font-bold tracking-tight sm:inline ${
              onHero ? "text-white" : "text-ink"
            }`}
          >
            Safe Sahel
          </span>
        </Link>

        <nav
          className={`mx-auto hidden items-center gap-1 rounded-full border p-1 text-sm font-medium md:flex ${
            onHero
              ? "border-white/30 bg-white/10 text-white/90"
              : "border-border/70 bg-surface-soft/70 text-ink-secondary"
          }`}
        >
          {navLinks.map((link) => {
            const active = link.href !== "/#discover" && pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-lg py-xs transition-colors ${
                  active
                    ? onHero
                      ? "bg-white/25 text-white"
                      : "bg-surface text-ink shadow-sm"
                    : onHero
                      ? "hover:text-white"
                      : "hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-sm">
          <div
            className={`hidden items-center gap-lg pe-sm text-sm font-medium lg:flex ${
              onHero ? "text-white/90" : "text-ink-secondary"
            }`}
          >
            {profile && (
              <>
                <Link
                  href="/account/favorites"
                  className={`transition-colors ${onHero ? "hover:text-white" : "hover:text-ink"}`}
                >
                  {t.favorites}
                </Link>
                <Link
                  href="/account/bookings"
                  className={`transition-colors ${onHero ? "hover:text-white" : "hover:text-ink"}`}
                >
                  {t.bookings}
                </Link>
                {(profile.role === "owner" || profile.role === "admin") && (
                  <Link
                    href="/owner"
                    className={`transition-colors ${onHero ? "hover:text-white" : "hover:text-ink"}`}
                  >
                    {t.hosting}
                  </Link>
                )}
                {profile.role === "admin" && (
                  <Link
                    href="/admin"
                    className={`transition-colors ${onHero ? "hover:text-white" : "hover:text-ink"}`}
                  >
                    {t.admin}
                  </Link>
                )}
                <button
                  onClick={signOut}
                  className={`transition-colors ${onHero ? "hover:text-white" : "hover:text-ink"}`}
                >
                  {t.signOut}
                </button>
              </>
            )}
          </div>

          <Link
            href="/owner"
            className="hidden rounded-full bg-turquoise px-lg py-sm text-sm font-semibold text-white shadow-sm transition-colors hover:bg-turquoise-dark sm:block"
          >
            {t.listProperty}
          </Link>

          <div className="hidden sm:block">
            <LocaleToggle locale={locale} transparent={onHero} />
          </div>

          {loading ? null : profile ? (
            <Link href="/profile" className="hidden items-center md:flex" title={t.profile}>
              <span className="flex size-8 items-center justify-center rounded-full bg-turquoise-light font-display text-xs font-bold text-turquoise-dark">
                {(profile.fullName ?? profile.email ?? "?").charAt(0).toUpperCase()}
              </span>
            </Link>
          ) : (
            <div className="hidden items-center gap-sm md:flex">
              <Link
                href="/login"
                className={`rounded-full px-md py-sm text-sm font-medium transition-colors ${
                  onHero ? "text-white/90 hover:text-white" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {t.logIn}
              </Link>
              <Link
                href="/signup"
                className={`rounded-full px-md py-sm text-sm font-medium ${
                  onHero ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-ink/90"
                }`}
              >
                {t.signUp}
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex size-9 items-center justify-center rounded-full md:hidden ${
              onHero ? "text-white" : "text-ink"
            }`}
            aria-label="Menu"
            aria-expanded={menuOpen}
          >
            <MenuIcon open={menuOpen} />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-lg border-t border-border/70 bg-surface px-lg py-lg md:hidden">
          <nav className="flex flex-col gap-xs text-sm font-medium text-ink">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-md py-sm hover:bg-surface-soft"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {profile ? (
            <nav className="flex flex-col gap-xs border-t border-border pt-lg text-sm font-medium text-ink">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-md py-sm hover:bg-surface-soft"
              >
                {t.profile}
              </Link>
              <Link
                href="/account/favorites"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-md py-sm hover:bg-surface-soft"
              >
                {t.favorites}
              </Link>
              <Link
                href="/account/bookings"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-md py-sm hover:bg-surface-soft"
              >
                {t.bookings}
              </Link>
              {(profile.role === "owner" || profile.role === "admin") && (
                <Link
                  href="/owner"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-md py-sm hover:bg-surface-soft"
                >
                  {t.hosting}
                </Link>
              )}
              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-md py-sm hover:bg-surface-soft"
                >
                  {t.admin}
                </Link>
              )}
              <button onClick={signOut} className="rounded-lg px-md py-sm text-start hover:bg-surface-soft">
                {t.signOut}
              </button>
            </nav>
          ) : (
            <div className="flex flex-col gap-sm border-t border-border pt-lg">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-full border border-border px-md py-sm text-center text-sm font-medium text-ink"
              >
                {t.logIn}
              </Link>
              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="rounded-full bg-ink px-md py-sm text-center text-sm font-medium text-white"
              >
                {t.signUp}
              </Link>
            </div>
          )}

          <div className="flex items-center justify-between gap-sm border-t border-border pt-lg">
            <LocaleToggle locale={locale} />
            <Link
              href="/owner"
              onClick={() => setMenuOpen(false)}
              className="rounded-full bg-turquoise px-lg py-sm text-sm font-semibold text-white"
            >
              {t.listProperty}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
