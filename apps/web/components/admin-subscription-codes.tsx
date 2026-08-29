"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Code = {
  id: string;
  code: string;
  used_by_property_id: string | null;
  used_at: string | null;
  created_at: string;
};

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function AdminSubscriptionCodes({
  adminId,
  initialCodes,
}: {
  adminId: string;
  initialCodes: Code[];
}) {
  const router = useRouter();
  const [codes, setCodes] = useState(initialCodes);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("subscription_codes")
      .insert({ code: generateCode(), created_by: adminId })
      .select("id, code, used_by_property_id, used_at, created_at")
      .single();

    setGenerating(false);
    if (insertError || !data) {
      setError(insertError?.message ?? "Could not generate a code");
      return;
    }
    setCodes((prev) => [data, ...prev]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-secondary">
          Hand a code to an owner after they pay the 500 EGP/month subscription over WhatsApp. Each
          code works once.
        </p>
        <button
          onClick={generate}
          disabled={generating}
          className="shrink-0 rounded-md bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {generating ? "Generating…" : "Generate code"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-start text-xs uppercase text-ink-secondary">
            <tr>
              <th className="px-md py-sm text-start">Code</th>
              <th className="px-md py-sm text-start">Status</th>
              <th className="px-md py-sm text-start">Created</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-md py-sm font-mono">{c.code}</td>
                <td className="px-md py-sm">
                  {c.used_at ? (
                    <span className="text-ink-secondary">
                      Used {new Date(c.used_at).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-turquoise-dark">Available</span>
                  )}
                </td>
                <td className="px-md py-sm text-ink-secondary">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={3} className="px-md py-lg text-center text-ink-secondary">
                  No codes generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
