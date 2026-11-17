import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { createClient } from "@/lib/supabase/server";
import { EditorTabs } from "@/components/editor-tabs";

export default async function PropertyOwnerLayout(props: LayoutProps<"/owner/properties/[id]">) {
  const { id } = await props.params;
  const t = ownerDict[await getLocale()].editor;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("host_type").eq("id", user.id).maybeSingle()
    : { data: null };

  const tabs = [
    { href: `/owner/properties/${id}/edit`, label: t.details },
    { href: `/owner/properties/${id}/photos`, label: t.photos },
    { href: `/owner/properties/${id}/inventory`, label: t.inventory },
    ...(profile?.host_type === "broker"
      ? [{ href: `/owner/properties/${id}/authorization`, label: t.authorization }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-lg">
      <EditorTabs tabs={tabs} />
      {props.children}
    </div>
  );
}
