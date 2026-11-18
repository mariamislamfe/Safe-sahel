import { z } from "zod";

/**
 * Safe Sahel lists chalets, villas and studios only — no apartments or hotels.
 * (The DB enum still has the old values for history; migration 0021 remaps
 * them and a check constraint blocks new ones.)
 */
export type PropertyTypeOption = "chalet" | "villa" | "studio";

export const propertyTypeOptions = ["chalet", "villa", "studio"] as const;
export const viewTypeOptions = [
  "sea_view",
  "lagoon_view",
  "garden_view",
  "street_view",
  "no_view",
] as const;
export const cancellationPolicyOptions = ["flexible", "moderate", "strict"] as const;

/**
 * Empty number inputs arrive as "" (or NaN). Optional numbers must treat that
 * as "not filled" — coercing "" gives 0, which then fails `.positive()` and
 * blocks the form on a field the owner was allowed to skip.
 */
const blank = (v: unknown) =>
  v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v))
    ? undefined
    : v;
const optionalNumber = (schema: z.ZodNumber) => z.preprocess(blank, schema.optional());

export const propertyFormSchema = z
  .object({
    title: z.string().trim().min(3, "At least 3 characters"),
    type: z.enum(propertyTypeOptions),
    compoundId: z.string().uuid().nullable(),
    description: z.string().trim().max(2000).optional(),
    bedrooms: z.coerce.number().int().min(0),
    bathrooms: z.coerce.number().int().min(0),
    maxGuests: z.coerce.number().int().min(1),
    floor: optionalNumber(z.coerce.number().int()),
    parking: z.boolean(),
    beachAccess: z.boolean(),
    poolAccess: z.boolean(),
    viewType: z.enum(viewTypeOptions).nullable(),
    pricePerNight: z.coerce.number().positive("Enter a price"),
    dayUseEnabled: z.boolean(),
    dayUsePrice: optionalNumber(z.coerce.number().positive()),
    minStayNights: z.coerce.number().int().min(1),
    status: z.enum(["draft", "published"]),
    amenityIds: z.array(z.string().uuid()),
    sizeSqm: optionalNumber(z.coerce.number().int().positive()),
    beds: optionalNumber(z.coerce.number().int().positive()),
    checkInInstructions: z.string().trim().max(1000).optional(),
    villageEntryRequirements: z.string().trim().max(1000).optional(),
    beachAccessDetails: z.string().trim().max(1000).optional(),
    petsAllowed: z.boolean(),
    partiesAllowed: z.boolean(),
    smokingAllowed: z.boolean(),
    commercialPhotographyAllowed: z.boolean(),
    cancellationPolicy: z.enum(cancellationPolicyOptions),
    unitAddress: z.string().trim().max(120).optional(),
    monthlyRentalEnabled: z.boolean(),
    monthlyPrice: optionalNumber(z.coerce.number().positive()),
  })
  .refine((data) => !data.dayUseEnabled || !!data.dayUsePrice, {
    message: "Set a day-use price",
    path: ["dayUsePrice"],
  })
  .refine((data) => !data.monthlyRentalEnabled || !!data.monthlyPrice, {
    message: "Set a monthly price",
    path: ["monthlyPrice"],
  });

export type PropertyFormInput = z.infer<typeof propertyFormSchema>;
