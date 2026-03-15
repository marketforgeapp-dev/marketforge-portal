import { z } from "zod";

export const onboardingPrefillSchema = z.object({
  businessName: z.string(),
  website: z.string(),
  logoUrl: z.string().nullable(),
  phone: z.string().nullable(),
  googleBusinessUrl: z.string().nullable(),
  googleBusinessProfileUrl: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  serviceArea: z.string().nullable(),

  industry: z.enum(["PLUMBING", "HVAC", "SEPTIC", "TREE_SERVICE"]),
  preferredServices: z.array(z.string()).max(20).default([]),
  servicePageUrls: z.array(z.string()).max(20).default([]),
  hasFaqContent: z.boolean(),
  hasBlog: z.boolean().optional().default(false),
  hasGoogleBusinessPage: z.boolean().optional().default(false),
  hasServicePages: z.boolean().optional().default(false),
  busySeason: z.string().nullable(),
  slowSeason: z.string().nullable(),
  averageJobValueHint: z.number().nullable(),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        websiteUrl: z.string().nullable(),
        googleBusinessUrl: z.string().nullable(),
        logoUrl: z.string().nullable(),
        whyItMatters: z.string(),
        serviceFocus: z.array(z.string()).max(6).default([]),
      })
    )
    .max(5)
    .default([]),
});

export type OnboardingPrefillResult = z.infer<typeof onboardingPrefillSchema>;