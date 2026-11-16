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
import { parsePublishBlockers, rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import type { OwnerPropertyFull } from "@/lib/queries/owner";
import { useLocale } from "@/lib/i18n/locale-provider";
import { listingFormDict } from "@/lib/i18n/listing-form";
import { blockerTexts, common, errorText } from "@/lib/i18n/common";
import { getDictionary } from "@/lib/i18n/dictionary";
import { guestDict } from "@/lib/i18n/guest";
import { money } from "@/lib/i18n/format";

type Props = {
  ownerId: string;
  compounds: { id: string; name: string }[];
  amenities: { id: string; name: string; category: string | null }[];
  existing?: OwnerPropertyFull;
  existingAmenityIds?: string[];
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
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const t = listingFormDict[locale];
  const c = common[locale];
  const policies = getDictionary(locale).propertyDetail.cancellationPolicies;
  const viewLabels = guestDict[locale].listing.viewTypes;

  const [serverError, setServerError] = useState<string | null>(null);
  const [publishBlockers, setPublishBlockers] = useState<string[]>([]);
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
          unitAddress: existing.unitAddress ?? "",
          monthlyRentalEnabled: existing.monthlyRentalEnabled,
          monthlyPrice: existing.monthlyPrice ?? undefined,
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
          unitAddress: "",
          monthlyRentalEnabled: false,
        },
  });

  const dayUseEnabled = watch("dayUseEnabled");
  const monthlyRentalEnabled = watch("monthlyRentalEnabled");
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
      const ext = newCompoundPhoto.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;
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
        slug: `${slugify(newCompoundName)}-${Date.now().toString(36)}`,
        cover_image_url: coverImageUrl,
      })
      .select("id, name")
      .single();

    setAddingCompoundBusy(false);
    if (error || !data) {
      setCompoundError(error?.message ?? c.errors.generic!);
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

  const num = (v: number | undefined) => (v === undefined || Number.isNaN(v) ? null : v);

  async function onSubmit(values: PropertyFormInput) {
    setServerError(null);
    setPublishBlockers([]);
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
      floor: num(values.floor),
      parking: values.parking,
      beach_access: values.beachAccess,
      pool_access: values.poolAccess,
      view_type: values.viewType,
      price_per_night: values.pricePerNight,
      day_use_enabled: values.dayUseEnabled,
      day_use_price: values.dayUseEnabled ? num(values.dayUsePrice) : null,
      min_stay_nights: values.minStayNights,
      size_sqm: num(values.sizeSqm),
      beds: num(values.beds),
      check_in_instructions: values.checkInInstructions || null,
      village_entry_requirements: values.villageEntryRequirements || null,
      beach_access_details: values.beachAccessDetails || null,
      pets_allowed: values.petsAllowed,
      parties_allowed: values.partiesAllowed,
      smoking_allowed: values.smokingAllowed,
      commercial_photography_allowed: values.commercialPhotographyAllowed,
      cancellation_policy: values.cancellationPolicy,
      unit_address: values.unitAddress?.trim() || null,
      monthly_rental_enabled: values.monthlyRentalEnabled,
      monthly_price: values.monthlyRentalEnabled ? num(values.monthlyPrice) : null,
    };

    let propertyId = existing?.id;

    // Always save the details as a draft-or-current status first, then try to
    // publish separately — so a publish blocker never loses the owner's edits.
    if (propertyId) {
      const { error } = await supabase
        .from("properties")
        .update({
          ...basePayload,
          status: existing?.status === "published" ? "published" : "draft",
        })
        .eq("id", propertyId);
      if (error) {
        const blockers = parsePublishBlockers(error.message);
        if (blockers.length) setPublishBlockers(blockers);
        else return setServerError(errorText(locale, rpcErrorCode(error.message)));
      }
    } else {
      const { data, error } = await supabase
        .from("properties")
        .insert({ ...basePayload, status: "draft" })
        .select("id")
        .single();
      if (error || !data) return setServerError(errorText(locale, rpcErrorCode(error?.message)));
      propertyId = data.id;
    }

    await supabase.from("property_amenities").delete().eq("property_id", propertyId);
    if (values.amenityIds.length > 0) {
      await supabase
        .from("property_amenities")
        .insert(values.amenityIds.map((amenity_id) => ({ property_id: propertyId!, amenity_id })));
    }

    const wantsPublished = values.status === "published";
    const isPublished = existing?.status === "published";
    if (wantsPublished !== isPublished) {
      const { error } = await supabase
        .from("properties")
        .update({ status: wantsPublished ? "published" : "draft" })
        .eq("id", propertyId);
      if (error) {
        const blockers = parsePublishBlockers(error.message);
        if (blockers.length) {
          setPublishBlockers(blockers);
          if (!existing) router.replace(`/owner/properties/${propertyId}/edit`);
          return;
        }
        return setServerError(errorText(locale, rpcErrorCode(error.message)));
      }
    }

    router.push(
      existing ? `/owner/properties/${propertyId}/edit` : `/owner/properties/${propertyId}/photos`,
    );
    router.refresh();
  }

  const amenitiesByCategory = amenities.reduce<Record<string, typeof amenities>>((acc, a) => {
    (acc[a.category ?? "other"] ??= []).push(a);
    return acc;
  }, {});
  const typeLabel = c.propertyTypes[watchedType] ?? watchedType;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-xl">
      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.basics}</h2>
        <Field label={t.title} error={errors.title && t.errTitle}>
          <input {...register("title")} className={inputClass} placeholder={t.titlePlaceholder} />
        </Field>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <Field label={t.type}>
            <select {...register("type")} className={inputClass}>
              {propertyTypeOptions.map((o) => (
                <option key={o} value={o}>
                  {c.propertyTypes[o] ?? o}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.compound}>
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
              <option value="">{t.none}</option>
              {compoundOptions.map((co) => (
                <option key={co.id} value={co.id}>
                  {co.name}
                </option>
              ))}
              <option value="__new__">{t.addCompound}</option>
            </select>
          </Field>
        </div>

        {addingCompound && (
          <div className="flex flex-col gap-sm rounded-md border border-dashed border-turquoise bg-turquoise-light p-md">
            <p className="text-sm font-medium text-ink">{t.newCompound}</p>
            <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
              <input
                value={newCompoundName}
                onChange={(e) => setNewCompoundName(e.target.value)}
                placeholder={t.compoundName}
                className={inputClass}
              />
              <input
                value={newCompoundArea}
                onChange={(e) => setNewCompoundArea(e.target.value)}
                placeholder={t.area}
                className={inputClass}
              />
            </div>
            <label className="flex flex-col gap-xs">
              <span className="text-xs font-medium text-ink-secondary">{t.compoundPhoto}</span>
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
                {addingCompoundBusy ? t.adding : t.addCompoundBtn}
              </button>
              <button
                type="button"
                onClick={() => setAddingCompound(false)}
                className="text-sm text-ink-secondary hover:text-ink"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        )}

        <Field label={t.unitAddress} hint={t.unitAddressHint}>
          <input {...register("unitAddress")} className={inputClass} placeholder="B12 – 3" />
        </Field>

        <Field label={t.description}>
          <textarea {...register("description")} rows={4} className={inputClass} />
        </Field>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.capacity}</h2>
        <div className="grid grid-cols-3 gap-md">
          <Field label={t.bedrooms}>
            <input type="number" min={0} {...register("bedrooms")} className={inputClass} />
          </Field>
          <Field label={t.bathrooms}>
            <input type="number" min={0} {...register("bathrooms")} className={inputClass} />
          </Field>
          <Field label={t.maxGuests}>
            <input type="number" min={1} {...register("maxGuests")} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-md">
          <Field label={t.floor}>
            <input type="number" {...register("floor")} className={inputClass} />
          </Field>
          <Field label={t.view}>
            <select
              {...register("viewType")}
              className={inputClass}
              onChange={(e) => setValue("viewType", (e.target.value || null) as never)}
            >
              <option value="">{t.notSpecified}</option>
              {viewTypeOptions.map((v) => (
                <option key={v} value={v}>
                  {viewLabels[v] ?? v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap gap-lg">
          <Checkbox label={t.parking} {...register("parking")} />
          <Checkbox label={t.beachAccess} {...register("beachAccess")} />
          <Checkbox label={t.poolAccess} {...register("poolAccess")} />
        </div>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.moreDetails}</h2>
        <div className="grid grid-cols-2 gap-md">
          <Field label={t.size}>
            <input type="number" min={1} {...register("sizeSqm")} className={inputClass} />
          </Field>
          <Field label={t.beds}>
            <input type="number" min={1} {...register("beds")} className={inputClass} />
          </Field>
        </div>
        <Field label={t.checkIn}>
          <textarea
            {...register("checkInInstructions")}
            rows={2}
            placeholder={t.checkInPlaceholder}
            className={inputClass}
          />
        </Field>
        <Field label={t.village}>
          <textarea
            {...register("villageEntryRequirements")}
            rows={2}
            placeholder={t.villagePlaceholder}
            className={inputClass}
          />
        </Field>
        {beachAccess && (
          <Field label={t.beachDetails}>
            <textarea
              {...register("beachAccessDetails")}
              rows={2}
              placeholder={t.beachPlaceholder}
              className={inputClass}
            />
          </Field>
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.houseRules}</h2>
        <div className="flex flex-wrap gap-lg">
          <Checkbox label={t.pets} {...register("petsAllowed")} />
          <Checkbox label={t.parties} {...register("partiesAllowed")} />
          <Checkbox label={t.smoking} {...register("smokingAllowed")} />
          <Checkbox label={t.photography} {...register("commercialPhotographyAllowed")} />
        </div>
        <Field label={t.cancellation}>
          <select {...register("cancellationPolicy")} className={inputClass}>
            {cancellationPolicyOptions.map((p) => (
              <option key={p} value={p}>
                {policies[p].label} — {policies[p].description}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.pricing}</h2>
        <div className="grid grid-cols-2 gap-md">
          <Field label={t.pricePerNight} error={errors.pricePerNight && t.errPrice}>
            <input type="number" min={1} {...register("pricePerNight")} className={inputClass} />
          </Field>
          <Field label={t.minStay}>
            <input type="number" min={1} {...register("minStayNights")} className={inputClass} />
          </Field>
        </div>

        <div className="flex flex-col gap-xs rounded-md border border-turquoise/30 bg-turquoise-light/50 px-md py-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-turquoise-dark">
            {t.recTitle}
          </p>
          {comparableStats ? (
            <>
              <p className="text-sm text-ink">
                {t.recBody(
                  typeLabel,
                  watchedCompoundId ? t.recScopeCompound : t.recScopeAll,
                  money(locale, comparableStats.averagePricePerNight),
                  comparableStats.sampleSize,
                )}
              </p>
              <p className="text-xs text-ink-secondary">
                {t.recRange(
                  money(locale, Math.round(comparableStats.averagePricePerNight * 0.85)),
                  money(locale, Math.round(comparableStats.averagePricePerNight * 1.15)),
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-secondary">{t.recNone}</p>
          )}
        </div>

        <Checkbox label={t.dayUse} {...register("dayUseEnabled")} />
        {dayUseEnabled && (
          <Field label={t.dayUsePrice} error={errors.dayUsePrice && t.errDayUse}>
            <input type="number" min={1} {...register("dayUsePrice")} className={inputClass} />
          </Field>
        )}
        <Checkbox label={`🎓 ${t.monthly}`} {...register("monthlyRentalEnabled")} />
        {monthlyRentalEnabled && (
          <Field label={t.monthlyPrice} error={errors.monthlyPrice && t.errMonthly}>
            <input type="number" min={1} {...register("monthlyPrice")} className={inputClass} />
          </Field>
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.amenities}</h2>
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
        <h2 className="font-display text-lg font-semibold">{t.visibility}</h2>
        <Field label={t.status} hint={t.publishRules}>
          <select {...register("status")} className={inputClass}>
            <option value="draft">{t.draft}</option>
            <option value="published">{t.published}</option>
          </select>
        </Field>
      </section>

      {publishBlockers.length > 0 && (
        <div className="rounded-lg bg-butter-soft px-md py-sm text-sm">
          <p className="font-medium text-ink">{t.notPublishedYet}</p>
          <ul className="mt-xs text-ink-secondary">
            {blockerTexts(locale, publishBlockers).map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>
        </div>
      )}
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-fit rounded-md bg-turquoise px-xl py-md font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {isSubmitting ? t.saving : existing ? t.save : t.create}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-sm border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string | false;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xs">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-secondary">{hint}</span>}
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
