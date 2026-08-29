"use client";

import { useState } from "react";

export function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl border border-border">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center justify-between gap-md px-lg py-md text-start"
              aria-expanded={open}
            >
              <span className="font-medium text-ink">{item.question}</span>
              <span
                className={`shrink-0 text-lg text-ink-secondary transition-transform ${open ? "rotate-45" : ""}`}
              >
                +
              </span>
            </button>
            {open && <p className="px-lg pb-md text-sm leading-relaxed text-ink-secondary">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
