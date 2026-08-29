const egp = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

/** Format a price in EGP, e.g. `formatEgp(4500)` → "EGP 4,500". */
export function formatEgp(amount: number): string {
  return egp.format(amount);
}
