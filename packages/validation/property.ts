import { z } from "zod";

export type PropertyTypeOption = "chalet" | "villa" | "apartment" | "twin_house" | "town_house";

export const propertyTypeOptions = [
  "chalet",
  "villa",
  "apartment",
  "twin_house",
  "town_house",
] as const;
export const viewTypeOptions = [
  "sea_view",
  "lagoon_view",
  "garden_view",
  "street_view",
  "no_view",
] as const;
export const cancellationPolicyOptions = ["flexible", "moderate", "strict"] as const;

export const propertyFormSchema = z
  .object({
    title: z.string().trim().min(3, "At least 3 characters"),
    type: z.enum(propertyTypeOptions),
    compoundId: z.string().uuid().nullable(),
    description: z.string().trim().max(2000).optional(),
    bedrooms: z.coerce.number().int().min(0),
    bathrooms: z.coerce.number().int().min(0),
    maxGuests: z.coerce.number().int().min(1),
    floor: z.union([z.coerce.number().int(), z.nan()]).optional(),
    parking: z.boolean(),
    beachAccess: z.boolean(),
    poolAccess: z.boolean(),
    viewType: z.enum(viewTypeOptions).nullable(),
    pricePerNight: z.coerce.number().positive("Enter a price"),
    dayUseEnabled: z.boolean(),
    dayUsePrice: z.union([z.coerce.number().positive(), z.nan()]).optional(),
    minStayNights: z.coerce.number().int().min(1),
    status: z.enum(["draft", "published"]),
    amenityIds: z.array(z.string().uuid()),
    sizeSqm: z.union([z.coerce.number().int().positive(), z.nan()]).optional(),
    beds: z.union([z.coerce.number().int().positive(), z.nan()]).optional(),
    checkInInstructions: z.string().trim().max(1000).optional(),
    villageEntryRequirements: z.string().trim().max(1000).optional(),
    beachAccessDetails: z.string().trim().max(1000).optional(),
    petsAllowed: z.boolean(),
    partiesAllowed: z.boolean(),
    smokingAllowed: z.boolean(),
    commercialPhotographyAllowed: z.boolean(),
    cancellationPolicy: z.enum(cancellationPolicyOptions),
  })
  .refine((data) => !data.dayUseEnabled || (data.dayUsePrice && !Number.isNaN(data.dayUsePrice)), {
    message: "Set a day-use price",
    path: ["dayUsePrice"],
  });

export type PropertyFormInput = z.infer<typeof propertyFormSchema>;
