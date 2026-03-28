import { z } from "zod";

const emptyStringToNull = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const nullableString = z.preprocess(
  emptyStringToNull,
  z.string().nullable()
).optional();

const nullableNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}, z.number().nullable()).optional();

const stringArray = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string()));

export const onboardingSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  website: nullableString,
  logoUrl: nullableString,
  phone: nullableString,

  city: nullableString,
  state: nullableString,
  serviceArea: nullableString,
  serviceAreaRadiusMiles: nullableNumber,

  industry: z.enum(["PLUMBING", "HVAC", "SEPTIC", "TREE_SERVICE"]),
  industryLabel: nullableString,
  brandTone: z
    .enum(["PROFESSIONAL", "FRIENDLY", "URGENT", "LOCAL"])
    .nullable()
    .optional(),

  averageJobValue: nullableNumber,
  targetWeeklyRevenue: nullableNumber,
  technicians: nullableNumber,
  jobsPerTechnicianPerDay: nullableNumber,
  weeklyCapacity: nullableNumber,
  
  preferredServices: stringArray,
  primaryServices: stringArray,
  deprioritizedServices: stringArray,

  highestMarginService: nullableString,
  lowestPriorityService: nullableString,

  busySeason: nullableString,
  slowSeason: nullableString,
  busyMonths: stringArray,
  slowMonths: stringArray,
  seasonalityNotes: nullableString,

  googleBusinessProfileUrl: nullableString,
  googlePlaceId: nullableString,
  googleRating: nullableNumber,
  googleReviewCount: nullableNumber,
  hasFaqContent: z.boolean().optional().default(false),
  hasFaqPage: z.boolean().optional().default(false),
  hasBlog: z.boolean().optional().default(false),
  hasGoogleBusinessPage: z.boolean().optional().default(false),
  hasServicePages: z.boolean().optional().default(false),
  servicePageUrls: stringArray,

  competitors: z
    .array(
      z.object({
        name: z.string().min(1, "Competitor name is required"),
        websiteUrl: nullableString,
        googleBusinessUrl: nullableString,
        placeId: nullableString,
        rating: nullableNumber,
        reviewCount: nullableNumber,
        logoUrl: nullableString,
        isPrimaryCompetitor: z.boolean().optional().default(false),
      })
    )
    .default([]),
});

export type OnboardingSchemaInput = z.input<typeof onboardingSchema>;
export type OnboardingSchemaParsed = z.infer<typeof onboardingSchema>;