"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  propertyFormSchema,
  propertyTypeOptions,
  viewTypeOptions,
  cancellationPolicyOptions,
  type PropertyFormInput,
} from "@safe-sahel/validation";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import type { OwnerPropertyFull } from "@/lib/queries/owner";
import { SubscriptionGate } from "@/components/subscription-gate";

type Props = {
  ownerId: string;
  compounds: { id: string; name: string }[];
  amenities: { id: string; name: string; category: string | null }[];
  existing?: OwnerPropertyFull;
  existingAmenityIds?: string[];
  subscriptionPriceEgp: number;
};

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "property"
  );
}

export function PropertyForm({
  ownerId,
  compounds,
  amenities,
  existing,
  existingAmenityIds = [],
  subscriptionPriceEgp,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsSubscription, setNeedsSubscription] = useState(false);
  const [pendingPropertyId, setPendingPropertyId] = useState<string | null>(null);
  const [compoundOptions, setCompoundOptions] = useState(compounds);
  const [addingCompound, setAddingCompound] = useState(false);
  const [newCompoundName, setNewCompoundName] = useState("");
  const [newCompoundArea, setNewCompoundArea] = useState("");
  const [newCompoundPhoto, setNewCompoundPhoto] = useState<File | null>(null);
  const [compoundError, setCompoundError] = useState<string | null>(null);
  const [addingCompoundBusy, setAddingCompoundBusy] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormInput>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          type: existing.type,
          compoundId: existing.compoundId,
          description: existing.description ?? "",
          bedrooms: existing.bedrooms,
          bathrooms: existing.bathrooms,
          maxGuests: existing.maxGuests,
          floor: existing.floor ?? undefined,
          parking: existing.parking,
          beachAccess: existing.beachAccess,
          poolAccess: existing.poolAccess,
          viewType: existing.viewType,
          pricePerNight: existing.pricePerNight,
          dayUseEnabled: existing.dayUseEnabled,
          dayUsePrice: existing.dayUsePrice ?? undefined,
          minStayNights: existing.minStayNights,
          status: existing.status === "published" ? "published" : "draft",
          amenityIds: existingAmenityIds,
          sizeSqm: existing.sizeSqm ?? undefined,
          beds: existing.beds ?? undefined,
          checkInInstructions: existing.checkInInstructions ?? "",
          villageEntryRequirements: existing.villageEntryRequirements ?? "",
          beachAccessDetails: existing.beachAccessDetails ?? "",
          petsAllowed: existing.petsAllowed,
          partiesAllowed: existing.partiesAllowed,
          smokingAllowed: existing.smokingAllowed,
          commercialPhotographyAllowed: existing.commercialPhotographyAllowed,
          cancellationPolicy: existing.cancellationPolicy,
        }
      : {
          type: "chalet",
          compoundId: null,
          bedrooms: 1,
          bathrooms: 1,
          maxGuests: 2,
          parking: false,
          beachAccess: false,
          poolAccess: false,
          viewType: null,
          dayUseEnabled: false,
          minStayNights: 1,
          status: "draft",
          amenityIds: [],
          petsAllowed: false,
          partiesAllowed: false,
          smokingAllowed: false,
          commercialPhotographyAllowed: false,
          cancellationPolicy: "moderate",
        },
  });

  const dayUseEnabled = watch("dayUseEnabled");
  const amenityIds = watch("amenityIds");
  const beachAccess = watch("beachAccess");
  const watchedType = watch("type");
  const watchedCompoundId = watch("compoundId");

  const [comparableStats, setComparableStats] = useState<{
    averagePricePerNight: number;
    sampleSize: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function loadComparableStats() {
      let query = supabase
        .from("properties")
        .select("price_per_night")
        .eq("type", watchedType)
        .eq("status", "published")
        .is("deleted_at", null);
      if (watchedCompoundId) query = query.eq("compound_id", watchedCompoundId);

      const { data } = await query.limit(200);
      if (cancelled) return;
      if (!data || data.length === 0) {
        setComparableStats(null);
        return;
      }
      const prices = data.map((p) => Number(p.price_per_night));
      setComparableStats({
        averagePricePerNight: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        sampleSize: prices.length,
      });
    }

    void loadComparableStats();
    return () => {
      cancelled = true;
    };
  }, [watchedType, watchedCompoundId]);

  async function createCompound() {
    if (!newCompoundName.trim()) return;
    setCompoundError(null);
    setAddingCompoundBusy(true);
    const supabase = createClient();

    let coverImageUrl: string | null = null;
    if (newCompoundPhoto) {
      const path = `${ownerId}/${Date.now()}-${newCompoundPhoto.name}`;
      const { error: uploadError } = await supabase.storage
        .from("compound-images")
        .upload(path, newCompoundPhoto);
      if (uploadError) {
        setCompoundError(uploadError.message);
        setAddingCompoundBusy(false);
        return;
      }
      coverImageUrl = supabase.storage.from("compound-images").getPublicUrl(path).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("compounds")
      .insert({
        name: newCompoundName.trim(),
        area: newCompoundArea.trim() || null,
        slug: slugify(newCompoundName),
        cover_image_url: coverImageUrl,
      })
      .select("id, name")
      .single();

    setAddingCompoundBusy(false);
    if (error || !data) {
      setCompoundError(error?.message ?? "Could not add compound");
      return;
    }

    setCompoundOptions((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setValue("compoundId", data.id);
    setAddingCompound(false);
    setNewCompoundName("");
    setNewCompoundArea("");
    setNewCompoundPhoto(null);
  }

  function toggleAmenity(id: string) {
    setValue(
      "amenityIds",
      amenityIds.includes(id) ? amenityIds.filter((a) => a !== id) : [...amenityIds, id],
    );
  }

  function isSubscriptionError(message: string) {
    return message.includes("published_requires_active_subscription");
  }

  async function onSubmit(values: PropertyFormInput) {
    setServerError(null);
    setNeedsSubscription(false);
    const supabase = createClient();

    const basePayload = {
      owner_id: ownerId,
      title: values.title,
      slug: existing?.slug ?? `${slugify(values.title)}-${Date.now().toString(36)}`,
      type: values.type,
      compound_id: values.compoundId,
      description: values.description || null,
      bedrooms: values.bedrooms,
      bathrooms: values.bathrooms,
      max_guests: values.maxGuests,
      floor: Number.isNaN(values.floor) ? null : (values.floor ?? null),
      parking: values.parking,
      beach_access: values.beachAccess,
      pool_access: values.poolAccess,
      view_type: values.viewType,
      price_per_night: values.pricePerNight,
      day_use_enabled: values.dayUseEnabled,
      day_use_price:
        values.dayUseEnabled && !Number.isNaN(values.dayUsePrice) ? values.dayUsePrice : null,
      min_stay_nights: values.minStayNights,
      size_sqm: Number.isNaN(values.sizeSqm) ? null : (values.sizeSqm ?? null),
      beds: Number.isNaN(values.beds) ? null : (values.beds ?? null),
      check_in_instructions: values.checkInInstructions || null,
      village_entry_requirements: values.villageEntryRequirements || null,
      beach_access_details: values.beachAccessDetails || null,
      pets_allowed: values.petsAllowed,
      parties_allowed: values.partiesAllowed,
      smoking_allowed: values.smokingAllowed,
      commercial_photography_allowed: values.commercialPhotographyAllowed,
      cancellation_policy: values.cancellationPolicy,
    };

    let propertyId = existing?.id;
    let blockedOnSubscription = false;

    if (propertyId) {
      const { error } = await supabase
        .from("properties")
        .update({ ...basePayload, status: values.status })
        .eq("id", propertyId);
      if (error) {
        if (isSubscriptionError(error.message)) {
          setPendingPropertyId(propertyId);
          setNeedsSubscription(true);
          blockedOnSubscription = true;
        } else {
          setServerError(error.message);
          return;
        }
      }
    } else {
      // New properties are always created as drafts first — publishing
      // needs a property id to attach a subscription to (see
      // SubscriptionGate below), which doesn't exist until after this insert.
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...basePayload, status: "draft" })
        .select("id")
        .single();
      if (error || !data) {
        setServerError(error?.message ?? "Could not create property");
        return;
      }
      propertyId = data.id;

      if (values.status === "published") {
        const { error: publishError } = await supabase
          .from("properties")
          .update({ status: "published" })
          .eq("id", propertyId);
        if (publishError && isSubscriptionError(publishError.message)) {
          setPendingPropertyId(propertyId);
          setNeedsSubscription(true);
          blockedOnSubscription = true;
        }
      }
    }

    // Replace the amenity set wholesale — simplest correct approach for a small list.
    await supabase.from("property_amenities").delete().eq("property_id", propertyId);
    if (values.amenityIds.length > 0) {
      await supabase
        .from("property_amenities")
        .insert(values.amenityIds.map((amenity_id) => ({ property_id: propertyId!, amenity_id })));
    }

    if (blockedOnSubscription) {
      // Stay put — the property was saved (as a draft), but the gate below
      // needs to be resolved before it can actually go live.
      return;
    }

    router.push(`/owner/properties/${propertyId}/edit`);
    router.refresh();
  }

  async function handleSubscriptionActivated() {
    if (!pendingPropertyId) return;
    const supabase = createClient();
    await supabase.from("properties").update({ status: "published" }).eq("id", pendingPropertyId);
    setNeedsSubscription(false);
    router.push(`/owner/properties/${pendingPropertyId}/edit`);
    router.refresh();
  }

  const amenitiesByCategory = amenities.reduce<Record<string, typeof amenities>>((acc, a) => {
    const key = a.category ?? "other";
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">Basics</h2>
        <Field label="Title" error={errors.title?.message}>
          <input {...register("title")} className={inputClass} placeholder="Chalet Zaha" />
        </Field>

        <div className="grid grid-cols-2 gap-md">
          <Field label="Type">
            <select {...register("type")} className={inputClass}>
              {propertyTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Compound">
            <select
              {...register("compoundId")}
              className={inputClass}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setAddingCompound(true);
                  return;
                }
                setValue("compoundId", e.target.value || null);
              }}
            >
              <option value="">None</option>
              {compoundOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value="__new__">+ Add a new compound…</option>
            </select>
          </Field>
        </div>

        {addingCompound && (
          <div className="flex flex-col gap-sm rounded-md border border-dashed border-turquoise bg-turquoise-light p-md">
            <p className="text-sm font-medium text-ink">New compound</p>
            <div className="grid grid-cols-2 gap-sm">
              <input
                value={newCompoundName}
                onChange={(e) => setNewCompoundName(e.target.value)}
                placeholder="Compound name"
                className={inputClass}
              />
              <input
                value={newCompoundArea}
                onChange={(e) => setNewCompoundArea(e.target.value)}
                placeholder="Area (optional)"
                className={inputClass}
              />
            </div>
            <label className="flex flex-col gap-xs">
              <span className="text-xs font-medium text-ink-secondary">
                Cover photo, optional (e.g. a photo of the compound entrance)
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setNewCompoundPhoto(e.target.files?.[0] ?? null)}
                className="text-sm text-ink-secondary"
              />
            </label>
            {compoundError && <p className="text-xs text-red-600">{compoundError}</p>}
            <div className="flex gap-sm">
              <button
                type="button"
                onClick={createCompound}
                disabled={addingCompoundBusy}
                className="rounded-md bg-turquoise px-md py-xs text-sm font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
              >
                {addingCompoundBusy ? "Adding…" : "Add compound"}
              </button>
              <button
                type="button"
                onClick={() => setAddingCompound(false)}
                className="text-sm text-ink-secondary hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <Field label="Description">
          <textarea {...register("description")} rows={4} className={inputClass} />
        </Field>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">Capacity</h2>
        <div className="grid grid-cols-3 gap-md">
          <Field label="Bedrooms" error={errors.bedrooms?.message}>
            <input type="number" min={0} {...register("bedrooms")} className={inputClass} />
          </Field>
          <Field label="Bathrooms" error={errors.bathrooms?.message}>
            <input type="number" min={0} {...register("bathrooms")} className={inputClass} />
          </Field>
          <Field label="Max guests" error={errors.maxGuests?.message}>
            <input type="number" min={1} {...register("maxGuests")} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Floor (optional)">
            <input type="number" {...register("floor")} className={inputClass} />
          </Field>
          <Field label="View">
            <select
              {...register("viewType")}
              className={inputClass}
              onChange={(e) => setValue("viewType", (e.target.value || null) as never)}
            >
              <option value="">Not specified</option>
              {viewTypeOptions.map((v) => (
                <option key={v} value={v}>
                  {v.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-lg">
          <Checkbox label="Parking" {...register("parking")} />
          <Checkbox label="Beach access" {...register("beachAccess")} />
          <Checkbox label="Pool access" {...register("poolAccess")} />
        </div>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">More details</h2>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Size (m²), optional">
            <input type="number" min={1} {...register("sizeSqm")} className={inputClass} />
          </Field>
          <Field label="Beds, optional">
            <input type="number" min={1} {...register("beds")} className={inputClass} />
          </Field>
        </div>
        <Field label="Check-in instructions, optional">
          <textarea
            {...register("checkInInstructions")}
            rows={2}
            placeholder="e.g. Keys with the compound gate security, show your booking confirmation."
            className={inputClass}
          />
        </Field>
        <Field label="Compound / village entry requirements, optional">
          <textarea
            {...register("villageEntryRequirements")}
            rows={2}
            placeholder="e.g. Guest name must be on the gate list a day in advance."
            className={inputClass}
          />
        </Field>
        {beachAccess && (
          <Field label="Beach access details, optional">
            <textarea
              {...register("beachAccessDetails")}
              rows={2}
              placeholder="e.g. 5-minute walk, private beach with sunbeds."
              className={inputClass}
            />
          </Field>
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">House rules</h2>
        <div className="flex flex-wrap gap-lg">
          <Checkbox label="Pets allowed" {...register("petsAllowed")} />
          <Checkbox label="Parties/events allowed" {...register("partiesAllowed")} />
          <Checkbox label="Smoking allowed" {...register("smokingAllowed")} />
          <Checkbox label="Commercial photography allowed" {...register("commercialPhotographyAllowed")} />
        </div>
        <Field label="Cancellation policy">
          <select {...register("cancellationPolicy")} className={inputClass}>
            {cancellationPolicyOptions.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">Pricing</h2>
        <div className="grid grid-cols-2 gap-md">
          <Field label="Price per night (EGP) — your budget" error={errors.pricePerNight?.message}>
            <input type="number" min={1} {...register("pricePerNight")} className={inputClass} />
          </Field>
          <Field label="Minimum stay (nights)" error={errors.minStayNights?.message}>
            <input type="number" min={1} {...register("minStayNights")} className={inputClass} />
          </Field>
        </div>

        <div className="flex flex-col gap-xs rounded-md border border-turquoise/30 bg-turquoise-light/50 px-md py-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-turquoise-dark">
            Price recommendation
          </p>
          {comparableStats ? (
            <>
              <p className="text-sm text-ink">
                Similar {watchedType.replace("_", " ")}s
                {watchedCompoundId ? " in this compound" : " on Safe Sahel"} average{" "}
                <strong>{formatEgp(comparableStats.averagePricePerNight)}</strong> / night, based on{" "}
                {comparableStats.sampleSize} published listing{comparableStats.sampleSize === 1 ? "" : "s"}.
              </p>
              <p className="text-xs text-ink-secondary">
                A competitive range would be roughly{" "}
                {formatEgp(Math.round(comparableStats.averagePricePerNight * 0.85))} –{" "}
                {formatEgp(Math.round(comparableStats.averagePricePerNight * 1.15))} / night.
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-secondary">
              Not enough published {watchedType.replace("_", " ")}s
              {watchedCompoundId ? " in this compound" : ""} yet to compare — set your own price for
              now, we&apos;ll show a recommendation here once more listings go live.
            </p>
          )}
        </div>

        <Checkbox label="Also available for day use" {...register("dayUseEnabled")} />
        {dayUseEnabled && (
          <Field label="Day-use price (EGP)" error={errors.dayUsePrice?.message}>
            <input type="number" min={1} {...register("dayUsePrice")} className={inputClass} />
          </Field>
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">Amenities</h2>
        {Object.entries(amenitiesByCategory).map(([category, list]) => (
          <div key={category} className="flex flex-col gap-xs">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
              {category}
            </p>
            <div className="flex flex-wrap gap-sm">
              {list.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => toggleAmenity(a.id)}
                  className={`rounded-full border px-md py-xs text-sm ${
                    amenityIds.includes(a.id)
                      ? "border-turquoise bg-turquoise-light text-turquoise-dark"
                      : "border-border text-ink-secondary"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">Visibility</h2>
        <Field label="Status">
          <select {...register("status")} className={inputClass}>
            <option value="draft">Draft (only you can see it)</option>
            <option value="published">Published (visible in search)</option>
          </select>
        </Field>
        {existing && (
          <p className="text-xs text-ink-secondary">
            Subscription:{" "}
            {existing.subscriptionStatus === "active" ? (
              <span className="text-turquoise-dark">
                Active
                {existing.subscriptionCurrentPeriodEnd &&
                  ` until ${new Date(existing.subscriptionCurrentPeriodEnd).toLocaleDateString()}`}
              </span>
            ) : (
              "Not active yet — you'll be asked to activate when you publish."
            )}
          </p>
        )}
      </section>

      {needsSubscription && pendingPropertyId && (
        <SubscriptionGate
          propertyId={pendingPropertyId}
          priceEgp={subscriptionPriceEgp}
          onActivated={handleSubscriptionActivated}
        />
      )}

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-md bg-turquoise px-xl py-md font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : existing ? "Save changes" : "Create property"}
      </button>
    </form>
  );
}

const inputClass =
  "rounded-sm border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-sm text-sm text-ink">
      <input type="checkbox" {...props} className="size-4 accent-turquoise" />
      {label}
    </label>
  );
}
