"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M11.5 11.5L14.5 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SearchBar() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto flex w-full max-w-4xl flex-col gap-2 rounded-2xl border border-border bg-surface p-2 shadow-xl shadow-ink/5 sm:flex-row sm:items-center sm:rounded-full"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-0.5 px-md py-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
          Where
        </span>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Search Sahel, compound, or property"
          className="w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-secondary"
        />
      </label>

      <div className="hidden h-8 w-px shrink-0 bg-border sm:block" />

      <label className="flex shrink-0 flex-col gap-0.5 border-t border-border px-md py-sm sm:border-s sm:border-t-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
          Check-in
        </span>
        <input
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="bg-transparent text-sm text-ink outline-none"
        />
      </label>

      <div className="hidden h-8 w-px shrink-0 bg-border sm:block" />

      <label className="flex shrink-0 flex-col gap-0.5 border-t border-border px-md py-sm sm:border-s sm:border-t-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
          Check-out
        </span>
        <input
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="bg-transparent text-sm text-ink outline-none"
        />
      </label>

      <div className="hidden h-8 w-px shrink-0 bg-border sm:block" />

      <label className="flex shrink-0 flex-col gap-0.5 border-t border-border px-md py-sm sm:border-s sm:border-t-0">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
          Guests
        </span>
        <input
          type="number"
          min={1}
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
          placeholder="Add"
          className="w-16 bg-transparent text-sm text-ink outline-none placeholder:text-ink-secondary"
        />
      </label>

      <button
        type="submit"
        className="m-1 flex shrink-0 items-center justify-center gap-xs rounded-full bg-turquoise px-lg py-sm text-sm font-semibold text-white shadow-sm transition-colors hover:bg-turquoise-dark"
      >
        <SearchIcon /> Search
      </button>
    </form>
  );
}
