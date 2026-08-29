function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  return digits;
}

export function ContactCard({
  label,
  name,
  phone,
}: {
  label: string;
  name: string | null;
  phone: string | null;
}) {
  return (
    <div className="flex flex-col items-center gap-xs rounded-xl border border-border p-lg text-center">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{label}</p>
      <p className="font-display text-lg font-semibold text-ink">{name ?? "Safe Sahel user"}</p>
      {phone ? (
        <div className="mt-xs flex flex-wrap justify-center gap-sm">
          <a
            href={`tel:${phone}`}
            className="rounded-full border border-border px-lg py-sm text-sm font-medium text-ink hover:border-turquoise"
          >
            Call · {phone}
          </a>
          <a
            href={`https://wa.me/${toWhatsAppNumber(phone)}`}
            className="rounded-full bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark"
          >
            WhatsApp
          </a>
        </div>
      ) : (
        <p className="text-sm text-ink-secondary">Hasn&apos;t added a phone number yet.</p>
      )}
    </div>
  );
}
