"use client";

import { useEffect, useRef, useState } from "react";
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
import { dashboardDict } from "@/lib/i18n/dashboard";
import { useFeedback } from "@/components/feedback";
import { Icon } from "@/components/admin/icons";

/** Fields validated before leaving each step (the rest are optional). */
const STEP_FIELDS: (keyof PropertyFormInput)[][] = [
  ["title", "type", "compoundId", "unitAddress", "description"],
  [
    "bedrooms",
    "bathrooms",
    "maxGuests",
    "floor",
    "viewType",
    "sizeSqm",
    "beds",
    "checkInInstructions",
    "villageEntryRequirements",
    "beachAccessDetails",
  ],
  ["pricePerNight", "minStayNights", "dayUsePrice", "monthlyPrice", "cancellationPolicy"],
  ["amenityIds", "status"],
];

const stepOf = (field: string) =>
  Math.max(
    0,
    STEP_FIELDS.findIndex((fields) => (fields as string[]).includes(field)),
  );

type Props = {
  ownerId: string;
  compounds: { id: string; name: string }[];
  amenities: { id: string; name: string; category: string | null }[];
  existing?: OwnerPropertyFull;
  existingAmenityIds?: string[];
};

/** Legacy types (pre-0021) map to the closest allowed one, same as the migration. */
function allowedType(type: string): PropertyFormInput["type"] {
  if (type === "villa" || type === "twin_house" || type === "town_house") return "villa";
  if (type === "studio") return "studio";
  return "chalet";
}

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
  const f = dashboardDict[locale].form;
  const fb = useFeedback();
  const [step, setStep] = useState(0);
  const [restored, setRestored] = useState(false);
  const draftKey = `ss:listing-draft:${ownerId}`;
  const topRef = useRef<HTMLDivElement>(null);

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
    trigger,
    reset,
    getValues,
    getFieldState,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormInput>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: existing
      ? {
          title: existing.title,
          type: allowedType(existing.type),
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

  // New listings: restore an unsaved draft once, then autosave on every change.
  useEffect(() => {
    if (existing) return;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(draftKey);
    } catch {}
    if (raw) {
      try {
        const draft = JSON.parse(raw) as Partial<PropertyFormInput>;
        reset({ ...getValues(), ...draft });
        setTimeout(() => setRestored(true), 0);
      } catch {}
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = watch((values) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(draftKey, JSON.stringify(values));
        } catch {}
      }, 600);
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [existing, draftKey, reset, getValues, watch]);

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    window.location.reload();
  }

  function goTo(next: number) {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function nextStep() {
    const fields = STEP_FIELDS[step]!;
    const ok = await trigger(fields, { shouldFocus: true });
    if (!ok) {
      const bad = fields.filter((name) => getFieldState(name).invalid);
      return fb.toast(f.fixFields(bad.map((n) => fieldLabel(n)).join("، ")), "error");
    }
    goTo(Math.min(step + 1, STEP_FIELDS.length - 1));
  }

  /** Final submit failed: jump to the step with the first bad field and focus it. */
  function onInvalid(errs: Partial<Record<keyof PropertyFormInput, unknown>>) {
    const bad = Object.keys(errs) as (keyof PropertyFormInput)[];
    if (bad.length === 0) return;
    const target = bad.sort((a, b) => stepOf(a) - stepOf(b))[0]!;
    setStep(stepOf(target));
    setTimeout(() => setFocus(target), 60);
    fb.toast(f.fixFields(bad.map((n) => fieldLabel(n)).join("، ")), "error");
  }

  // Human label + message for any field's validation error (not just a few).
  function fieldLabel(name: keyof PropertyFormInput): string {
    const labels: Partial<Record<keyof PropertyFormInput, string>> = {
      title: t.title,
      type: t.type,
      compoundId: t.compound,
      unitAddress: t.unitAddress,
      description: t.description,
      bedrooms: t.bedrooms,
      bathrooms: t.bathrooms,
      maxGuests: t.maxGuests,
      floor: t.floor,
      viewType: t.view,
      sizeSqm: t.size,
      beds: t.beds,
      checkInInstructions: t.checkIn,
      villageEntryRequirements: t.village,
      beachAccessDetails: t.beachDetails,
      pricePerNight: t.pricePerNight,
      minStayNights: t.minStay,
      dayUsePrice: t.dayUsePrice,
      monthlyPrice: t.monthlyPrice,
      cancellationPolicy: t.cancellation,
      status: t.status,
    };
    return labels[name] ?? String(name);
  }
  const specific: Partial<Record<keyof PropertyFormInput, string>> = {
    title: t.errTitle,
    pricePerNight: t.errPrice,
    dayUsePrice: t.errDayUse,
    monthlyPrice: t.errMonthly,
  };
  const err = (name: keyof PropertyFormInput) =>
    errors[name] ? (specific[name] ?? f.invalid) : undefined;

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
          if (!existing) {
            try {
              localStorage.removeItem(draftKey);
            } catch {}
            router.replace(`/owner/properties/${propertyId}/edit`);
          }
          return;
        }
        return setServerError(errorText(locale, rpcErrorCode(error.message)));
      }
    }

    try {
      localStorage.removeItem(draftKey);
    } catch {}
    fb.toast(dashboardDict[locale].toasts.saved);
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
  const stepLabels = [t.basics, t.capacity, t.pricing, t.amenities];
  const lastStep = stepLabels.length - 1;

  return (
    <form
      onSubmit={(e) => {
        // Enter on an early step moves forward instead of submitting half a listing.
        if (!existing && step < lastStep) {
          e.preventDefault();
          void nextStep();
          return;
        }
        void handleSubmit(onSubmit, onInvalid)(e);
      }}
      className="flex flex-col gap-xl"
    >
      <div ref={topRef} className="flex scroll-mt-24 flex-col gap-md">
        {restored && (
          <div className="flex flex-wrap items-center justify-between gap-sm rounded-xl border border-turquoise/30 bg-turquoise-light/60 px-md py-sm text-sm">
            <span>{f.draftRestored}</span>
            <button
              type="button"
              onClick={discardDraft}
              className="font-semibold text-turquoise-dark hover:underline"
            >
              {f.discard}
            </button>
          </div>
        )}
        <ol className="grid grid-cols-4 gap-xs">
          {stepLabels.map((label, i) => {
            const reachable = !!existing || i <= step;
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(i)}
                  className="flex w-full flex-col gap-1.5 text-start disabled:cursor-default"
                >
                  <span
                    className={`h-1.5 rounded-full transition ${i <= step ? "bg-turquoise" : "bg-border"}`}
                  />
                  <span
                    className={`hidden text-xs font-medium sm:block ${i === step ? "text-ink" : "text-ink-secondary"}`}
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="text-xs font-medium text-ink-secondary sm:hidden">
          {f.step(step + 1, stepLabels.length)} · {stepLabels[step]}
        </p>
        <p className="text-xs text-ink-secondary">
          <span className="font-bold text-red-600">*</span> {f.requiredLegend}
        </p>
      </div>

      <div className={step === 0 ? "flex flex-col gap-xl" : "hidden"}>
        <section className="flex flex-col gap-md">
          <h2 className="font-display text-lg font-semibold">{t.basics}</h2>
          <Field label={t.title} required error={err("title")}>
            <input {...register("title")} className={inputClass} placeholder={t.titlePlaceholder} />
          </Field>

          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <Field label={t.type} required error={err("type")}>
              <select {...register("type")} className={inputClass}>
                {propertyTypeOptions.map((o) => (
                  <option key={o} value={o}>
                    {c.propertyTypes[o] ?? o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t.compound} error={err("compoundId")}>
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

          <Field label={t.unitAddress} hint={t.unitAddressHint} error={err("unitAddress")}>
            <input {...register("unitAddress")} className={inputClass} placeholder="B12 – 3" />
          </Field>

          <Field label={t.description} error={err("description")}>
            <textarea {...register("description")} rows={4} className={inputClass} />
          </Field>
        </section>
      </div>

      <div className={step === 1 ? "flex flex-col gap-xl" : "hidden"}>
        <section className="flex flex-col gap-md">
          <h2 className="font-display text-lg font-semibold">{t.capacity}</h2>
          <div className="grid grid-cols-3 gap-md">
            <Field label={t.bedrooms} required error={err("bedrooms")}>
              <input type="number" min={0} {...register("bedrooms")} className={inputClass} />
            </Field>
            <Field label={t.bathrooms} required error={err("bathrooms")}>
              <input type="number" min={0} {...register("bathrooms")} className={inputClass} />
            </Field>
            <Field label={t.maxGuests} required error={err("maxGuests")}>
              <input type="number" min={1} {...register("maxGuests")} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-md">
            <Field label={t.floor} error={err("floor")}>
              <input type="number" {...register("floor")} className={inputClass} />
            </Field>
            <Field label={t.view} error={err("viewType")}>
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
            <Field label={t.size} error={err("sizeSqm")}>
              <input type="number" min={1} {...register("sizeSqm")} className={inputClass} />
            </Field>
            <Field label={t.beds} error={err("beds")}>
              <input type="number" min={1} {...register("beds")} className={inputClass} />
            </Field>
          </div>
          <Field label={t.checkIn} error={err("checkInInstructions")}>
            <textarea
              {...register("checkInInstructions")}
              rows={2}
              placeholder={t.checkInPlaceholder}
              className={inputClass}
            />
          </Field>
          <Field label={t.village} error={err("villageEntryRequirements")}>
            <textarea
              {...register("villageEntryRequirements")}
              rows={2}
              placeholder={t.villagePlaceholder}
              className={inputClass}
            />
          </Field>
          {beachAccess && (
            <Field label={t.beachDetails} error={err("beachAccessDetails")}>
              <textarea
                {...register("beachAccessDetails")}
                rows={2}
                placeholder={t.beachPlaceholder}
                className={inputClass}
              />
            </Field>
          )}
        </section>
      </div>

      <div className={step === 2 ? "flex flex-col gap-xl" : "hidden"}>
        <section className="flex flex-col gap-md">
          <h2 className="font-display text-lg font-semibold">{t.pricing}</h2>
          <div className="grid grid-cols-2 gap-md">
            <Field label={t.pricePerNight} required error={err("pricePerNight")}>
              <input type="number" min={1} {...register("pricePerNight")} className={inputClass} />
            </Field>
            <Field label={t.minStay} required error={err("minStayNights")}>
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
            <Field label={t.dayUsePrice} required error={err("dayUsePrice")}>
              <input type="number" min={1} {...register("dayUsePrice")} className={inputClass} />
            </Field>
          )}
          <Checkbox label={`🎓 ${t.monthly}`} {...register("monthlyRentalEnabled")} />
          {monthlyRentalEnabled && (
            <Field label={t.monthlyPrice} required error={err("monthlyPrice")}>
              <input type="number" min={1} {...register("monthlyPrice")} className={inputClass} />
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
          <Field label={t.cancellation} required error={err("cancellationPolicy")}>
            <select {...register("cancellationPolicy")} className={inputClass}>
              {cancellationPolicyOptions.map((p) => (
                <option key={p} value={p}>
                  {policies[p].label} — {policies[p].description}
                </option>
              ))}
            </select>
          </Field>
        </section>
      </div>

      <div className={step === 3 ? "flex flex-col gap-xl" : "hidden"}>
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
          <Field label={t.status} hint={t.publishRules} error={err("status")}>
            <select {...register("status")} className={inputClass}>
              <option value="draft">{t.draft}</option>
              <option value="published">{t.published}</option>
            </select>
          </Field>
        </section>
      </div>

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

      <div className="sticky bottom-0 -mx-lg flex items-center justify-between gap-sm border-t border-border bg-[#F7F8FA]/95 px-lg py-md backdrop-blur">
        <button
          type="button"
          onClick={() => goTo(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-xs rounded-xl px-md py-2.5 text-sm font-medium text-ink-secondary hover:text-ink disabled:invisible"
        >
          <Icon name="arrow" className="size-4 -scale-x-100 rtl:scale-x-100" />
          {f.back}
        </button>
        <div className="flex items-center gap-sm">
          {existing && (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-xl px-lg py-2.5 text-sm font-semibold disabled:opacity-60 ${
                step === lastStep
                  ? "bg-turquoise text-white hover:bg-turquoise-dark"
                  : "border border-border bg-surface text-ink hover:border-turquoise"
              }`}
            >
              {isSubmitting ? t.saving : t.save}
            </button>
          )}
          {step < lastStep ? (
            <button
              type="button"
              onClick={() => void nextStep()}
              className="flex items-center gap-xs rounded-xl bg-turquoise px-lg py-2.5 text-sm font-semibold text-white hover:bg-turquoise-dark"
            >
              {f.next}
              <Icon name="arrow" className="size-4 rtl:-scale-x-100" />
            </button>
          ) : (
            !existing && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-turquoise px-xl py-2.5 text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
              >
                {isSubmitting ? t.saving : t.create}
              </button>
            )
          )}
        </div>
      </div>
    </form>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-md py-2.5 text-ink outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20";

function Field({
  label,
  error,
  hint,
  required = false,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex flex-col gap-xs ${
        error
          ? "[&_input]:border-red-400 [&_input]:bg-red-50/40 [&_select]:border-red-400 [&_select]:bg-red-50/40 [&_textarea]:border-red-400 [&_textarea]:bg-red-50/40"
          : ""
      }`}
    >
      <span className={`text-sm font-medium ${error ? "text-red-700" : "text-ink"}`}>
        {label}
        {required && (
          <span className="ms-0.5 font-bold text-red-600" aria-hidden>
            *
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span role="alert" className="flex items-center gap-1 text-xs font-medium text-red-600">
          <Icon name="alert" className="size-3.5 shrink-0" />
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-ink-secondary">{hint}</span>
      )}
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
