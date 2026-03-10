import { z } from "zod";

export const onboardingPrefillSchema = z.object({
  businessName: z.string(),
  website: z.string().url(),
  logoUrl: z.string().nullable(),
  phone: z.string().nullable(),
  serviceArea: z.string().nullable(),
  industry: z.enum(["PLUMBING", "HVAC", "SEPTIC", "TREE_SERVICE"]),
  preferredServices: z.array(z.string()).min(1).max(8),
  servicePageUrls: z.array(z.string()).max(10),
  hasFaqContent: z.boolean(),
  busySeason: z.string().nullable(),
  slowSeason: z.string().nullable(),
  averageJobValueHint: z.number().nullable(),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        websiteUrl: z.string().nullable(),
        logoUrl: z.string().nullable(),
        whyItMatters: z.string(),
        serviceFocus: z.array(z.string()).max(6),
      })
    )
    .min(1)
    .max(5),
});

export type OnboardingPrefillResult = z.infer<typeof onboardingPrefillSchema>;