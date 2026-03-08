import { z } from "zod";

export const competitorInputSchema = z.object({
  name: z.string().trim().min(1, "Competitor name is required"),
  websiteUrl: z.string().trim(),
  googleBusinessUrl: z.string().trim(),
});

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required"),
  website: z.string().trim(),
  phone: z.string().trim(),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().min(1, "State is required"),
  serviceAreaRadiusMiles: z.union([z.number().int().nonnegative(), z.literal("")]),
  industry: z.enum(["PLUMBING", "HVAC", "SEPTIC", "TREE_SERVICE", ""]),

  primaryServices: z.array(z.string().trim().min(1)).min(1, "Add at least one service"),
  averageJobValue: z.union([z.number().nonnegative(), z.literal("")]),
  highestMarginService: z.string().trim(),
  lowestPriorityService: z.string().trim(),

  technicians: z.union([z.number().int().nonnegative(), z.literal("")]),
  jobsPerTechnicianPerDay: z.union([z.number().int().nonnegative(), z.literal("")]),
  weeklyCapacity: z.union([z.number().int().nonnegative(), z.literal("")]),
  targetWeeklyRevenue: z.union([z.number().nonnegative(), z.literal("")]),

  competitors: z.array(competitorInputSchema),

  hasServicePages: z.boolean(),
  hasFaqContent: z.boolean(),
  hasBlog: z.boolean(),
  hasGoogleBusinessPage: z.boolean(),
  googleBusinessProfileUrl: z.string().trim(),

  busyMonths: z.array(z.string()),
  slowMonths: z.array(z.string()),
  seasonalityNotes: z.string().trim(),
});

export type OnboardingSchemaInput = z.infer<typeof onboardingSchema>;