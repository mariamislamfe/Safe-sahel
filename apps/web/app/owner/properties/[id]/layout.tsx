import Link from "next/link";

export default async function PropertyOwnerLayout(props: LayoutProps<"/owner/properties/[id]">) {
  const { id } = await props.params;

  const tabs = [
    { href: `/owner/properties/${id}/edit`, label: "Details" },
    { href: `/owner/properties/${id}/photos`, label: "Photos" },
    { href: `/owner/properties/${id}/inventory`, label: "Inventory" },
  ];

  return (
    <div className="flex flex-col gap-lg">
      <nav className="flex gap-md">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-md border border-border px-md py-xs text-sm font-medium text-ink-secondary hover:border-turquoise hover:text-turquoise-dark"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {props.children}
    </div>
  );
}
