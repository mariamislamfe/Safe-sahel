import Image from "next/image";
import Link from "next/link";
import { Icon, type IconName } from "@/components/admin/icons";

/**
 * Building blocks shared by every dashboard page, so each screen has the same
 * rhythm: header → (filters) → cards/tables, same spacing, same empty states.
 */

export function PageHeader({
  title,
  description,
  count,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  count?: number;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-xs">
        <h1 className="flex items-center gap-sm font-display text-2xl font-bold tracking-tight sm:text-[28px]">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-surface-soft px-sm py-0.5 text-sm font-semibold tabular-nums text-ink-secondary">
              {count}
            </span>
          )}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-ink-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-sm">{actions}</div>}
    </header>
  );
}

export function Section({
  title,
  description,
  count,
  action,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  count?: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex flex-wrap items-end justify-between gap-sm">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-sm font-display text-lg font-semibold">
            {title}
            {count !== undefined && (
              <span className="text-sm font-medium tabular-nums text-ink-secondary">{count}</span>
            )}
          </h2>
          {description && <p className="text-sm text-ink-secondary">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({
  children,
  className = "",
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "warn" | "danger" | "muted";
}) {
  const tones = {
    default: "border-border bg-surface",
    warn: "border-amber-200 bg-amber-50/60",
    danger: "border-red-200 bg-red-50/60",
    muted: "border-transparent bg-surface-soft",
  };
  return (
    <div
      className={`rounded-2xl border p-lg shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${tones[tone]} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  href,
  hint,
  icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  href?: string;
  hint?: React.ReactNode;
  icon?: IconName;
  tone?: "default" | "accent";
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-sm text-ink-secondary">
        <span className="text-sm">{label}</span>
        {icon && <Icon name={icon} className="size-4" />}
      </div>
      <span
        className={`font-display text-3xl font-bold tabular-nums ${tone === "accent" ? "text-turquoise-dark" : ""}`}
      >
        {value}
      </span>
      {hint && <span className="text-xs text-ink-secondary">{hint}</span>}
    </>
  );
  const cls =
    "flex flex-col gap-xs rounded-2xl border border-border bg-surface p-lg shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
  return href ? (
    <Link href={href} className={`${cls} transition hover:border-turquoise hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({
  icon = "check",
  title,
  body,
}: {
  icon?: IconName;
  title: string;
  body?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-sm rounded-2xl border border-dashed border-border px-lg py-2xl text-center">
      <span className="grid size-11 place-items-center rounded-full bg-turquoise-light text-turquoise-dark">
        <Icon name={icon} />
      </span>
      <p className="font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-secondary">{body}</p>}
    </div>
  );
}

export type PillTone = "neutral" | "success" | "warn" | "danger" | "info";

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: PillTone;
  children: React.ReactNode;
}) {
  const tones: Record<PillTone, string> = {
    neutral: "bg-surface-soft text-ink-secondary",
    success: "bg-turquoise-light text-turquoise-dark",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-800",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-sm py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Segmented filter (URL-driven). Scrolls sideways on phones. */
export function FilterTabs({
  items,
}: {
  items: { href: string; label: string; active: boolean; count?: number }[];
}) {
  return (
    <nav className="-mx-lg overflow-x-auto px-lg [scrollbar-width:none]">
      <div className="inline-flex gap-1 rounded-xl bg-surface-soft p-1">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex shrink-0 items-center gap-xs whitespace-nowrap rounded-lg px-md py-1.5 text-sm font-medium transition ${
              i.active ? "bg-surface text-ink shadow-sm" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {i.label}
            {i.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11px] tabular-nums ${i.active ? "bg-ink text-white" : "bg-border/70"}`}
              >
                {i.count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** Chip row for picking a compound (or any secondary filter). */
export function ChipRow({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="-mx-lg flex gap-xs overflow-x-auto px-lg [scrollbar-width:none]">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`shrink-0 rounded-full border px-md py-1 text-xs font-medium transition ${
            i.active
              ? "border-turquoise bg-turquoise-light text-turquoise-dark"
              : "border-border text-ink-secondary hover:border-ink-secondary"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export function Table({
  children,
  minWidth = 640,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <table className="w-full text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, end }: { children?: React.ReactNode; end?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-border bg-surface-soft/60 px-md py-sm text-xs font-semibold uppercase tracking-wide text-ink-secondary ${end ? "text-end" : "text-start"}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  end,
  className = "",
}: {
  children?: React.ReactNode;
  end?: boolean;
  className?: string;
}) {
  return (
    <td className={`px-md py-sm align-middle ${end ? "text-end" : ""} ${className}`}>{children}</td>
  );
}

export function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-t border-border first:border-t-0 hover:bg-surface-soft/40">{children}</tr>
  );
}

export function Avatar({ name }: { name: string | null | undefined }) {
  const initials =
    (name ?? "?")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-turquoise-light text-xs font-bold text-turquoise-dark">
      {initials}
    </span>
  );
}

/** "12h ago" style age chip that turns amber at 12h and red past 24h. */
export function AgeChip({
  hours,
  label,
  overdue,
}: {
  hours: number;
  label: string;
  overdue?: string;
}) {
  const tone: PillTone = hours >= 24 ? "danger" : hours >= 12 ? "warn" : "success";
  return (
    <Pill tone={tone}>
      {label}
      {hours >= 24 && overdue && ` · ${overdue}`}
    </Pill>
  );
}

/** Label/value line used inside cards. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex flex-wrap gap-x-xs text-sm">
      <span className="text-ink-secondary">{label}:</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Tappable "needs your attention" row: icon · label/note · optional count · arrow. */
export function ActionRow({
  href,
  icon,
  label,
  note,
  count,
  cta,
  tone = "default",
}: {
  href: string;
  icon: IconName;
  label: React.ReactNode;
  note?: React.ReactNode;
  count?: number;
  cta?: string;
  tone?: "default" | "warn" | "urgent";
}) {
  const border = {
    default: "border-border hover:border-turquoise",
    warn: "border-amber-200 hover:border-amber-300",
    urgent: "border-red-200 hover:border-red-300",
  }[tone];
  const chip = {
    default: "bg-turquoise-light text-turquoise-dark",
    warn: "bg-amber-50 text-amber-700",
    urgent: "bg-red-50 text-red-600",
  }[tone];
  return (
    <Link
      href={href}
      className={`group flex items-center gap-md rounded-2xl border bg-surface p-md shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-md ${border}`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${chip}`}>
        <Icon name={icon} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{label}</span>
        {note && <span className="text-xs text-ink-secondary">{note}</span>}
      </span>
      {count !== undefined && (
        <span className="font-display text-2xl font-bold tabular-nums">{count}</span>
      )}
      {cta && (
        <span className="hidden shrink-0 text-sm font-semibold text-turquoise-dark sm:inline">
          {cta}
        </span>
      )}
      <Icon
        name="arrow"
        className="size-4 shrink-0 text-ink-secondary transition group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
      />
    </Link>
  );
}

/** Numbered setup checklist — done steps get a check, the first open step is highlighted. */
export function StepList({
  steps,
}: {
  steps: { label: string; body?: string; done: boolean; href: string; cta: string }[];
}) {
  const firstOpen = steps.findIndex((s) => !s.done);
  return (
    <ol className="flex flex-col gap-xs">
      {steps.map((s, i) => {
        const current = i === firstOpen;
        return (
          <li
            key={s.label}
            className={`flex items-center gap-md rounded-xl px-md py-sm ${current ? "bg-turquoise-light/60" : ""}`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                s.done
                  ? "bg-turquoise text-white"
                  : current
                    ? "border-2 border-turquoise text-turquoise-dark"
                    : "border border-border text-ink-secondary"
              }`}
            >
              {s.done ? <Icon name="check" className="size-4" strokeWidth={2.6} /> : i + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span
                className={`text-sm font-medium ${s.done ? "text-ink-secondary line-through" : ""}`}
              >
                {s.label}
              </span>
              {s.body && !s.done && <span className="text-xs text-ink-secondary">{s.body}</span>}
            </span>
            {!s.done && (
              <Link
                href={s.href}
                className={`shrink-0 rounded-lg px-md py-1.5 text-sm font-semibold ${
                  current
                    ? "bg-turquoise text-white hover:bg-turquoise-dark"
                    : "text-turquoise-dark hover:bg-surface-soft"
                }`}
              >
                {s.cta}
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Thin progress bar. */
export function Progress({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-soft">
      <div
        className="h-full rounded-full bg-turquoise transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/** Square listing photo with a house-icon fallback. */
export function Thumb({
  src,
  alt = "",
  className = "size-14",
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-turquoise-light text-turquoise-dark ${className}`}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes="96px" className="object-cover" />
      ) : (
        <Icon name="home" className="size-1/2" />
      )}
    </span>
  );
}
