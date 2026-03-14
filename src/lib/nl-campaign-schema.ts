import { z } from "zod";

const sourceTagSchema = z.enum([
  "Demand",
  "Competitor",
  "Capacity",
  "Service Value",
  "AEO",
]);

const campaignTypeSchema = z.enum([
  "DRAIN_SPECIAL",
  "WATER_HEATER",
  "MAINTENANCE_PUSH",
  "REVIEW_GENERATION",
  "EMERGENCY_SERVICE",
  "SEO_CONTENT",
  "AEO_FAQ",
  "CUSTOM",
]);

const campaignObjectiveSchema = z.enum([
  "FILL_OPEN_SCHEDULE",
  "PUSH_HIGHER_TICKET_JOBS",
  "DEFEND_AGAINST_COMPETITOR",
  "IMPROVE_AI_SEARCH_VISIBILITY",
  "INCREASE_REVIEWS",
  "CAPTURE_SEASONAL_DEMAND",
]);

const executionModeSchema = z.enum(["CAMPAIGN", "ACTION_PACK"]);

const actionTypeSchema = z.enum([
  "CAMPAIGN_LAUNCH",
  "AEO_CONTENT",
  "SEO_CONTENT",
  "GBP_OPTIMIZATION",
  "REVIEW_GENERATION",
  "CAPACITY_FILL",
  "HIGH_VALUE_SERVICE_PUSH",
  "CUSTOM",
]);

const imageModeSchema = z.enum(["SERVICE_IMAGE", "LOGO"]);

export const nlCampaignSchema = z.object({
  parsedIntent: z.object({
    serviceCategory: z.string(),
    intent: z.enum([
      "Demand generation",
      "Fill schedule",
      "High-ticket push",
      "Seasonal promotion",
      "Emergency response",
      "AEO support",
      "Custom",
    ]),
    urgency: z.enum(["Low", "Medium", "High"]),
    timeframe: z.string(),
    promotionType: z.string(),
  }),

  opportunityCheck: z.object({
    matchedOpportunityTitle: z.string().nullable(),
    matchedRecommendationTitle: z.string().nullable(),
    aligned: z.boolean(),
    confidenceScore: z.number().min(0).max(100),
    sourceTags: z.array(sourceTagSchema).min(1).max(5),
    whyNowBullets: z.array(z.string()).min(3).max(5),
    rationale: z.string(),
    whyThisMatters: z.string(),
  }),

  actionThesis: z.object({
    familyKey: z.string(),
    primaryService: z.string(),
    angle: z.string(),
    title: z.string(),
    summary: z.string(),
    audience: z.string(),
    offerHint: z.string(),
    ctaHint: z.string(),
    imageKey: z.string(),
    imageMode: imageModeSchema,
    whyThisActionBullets: z.array(z.string()).min(3).max(5),
  }),

  nextBestAction: z.object({
    executionMode: executionModeSchema,
    actionType: actionTypeSchema,
    title: z.string(),
    summary: z.string(),
    primaryGoal: z.string(),
    expectedOutcome: z.string(),
    whyThisIsTheBestMoveNow: z.string(),
  }),

  campaign: z
    .object({
      title: z.string(),
      description: z.string(),
      campaignType: campaignTypeSchema,
      objective: campaignObjectiveSchema,
      targetService: z.string(),
      offer: z.string(),
      audience: z.string(),
      cta: z.string(),
      landingIntent: z.string(),
      creativeGuidance: z.object({
        recommendedImage: z.string(),
        avoidImagery: z.string(),
      }),
    })
    .nullable(),

  actionPack: z.object({
    actionTitle: z.string(),
    implementationType: z.enum([
      "FAQ_BUILD",
      "ANSWER_SNIPPET_PACK",
      "SERVICE_PAGE_IMPROVEMENT",
      "GBP_IMPROVEMENT",
      "REVIEW_RECOVERY",
      "LOCAL_VISIBILITY_IMPROVEMENT",
      "CUSTOM",
    ]),
    priority: z.enum(["Low", "Medium", "High"]),
    implementationSteps: z.array(z.string()).min(3).max(7),
    ownerNotes: z.string(),
    successMetric: z.string(),
  }),

  assets: z.object({
    googleBusinessPost: z.string(),
    metaAdCopy: z.string(),
    googleAds: z.object({
      headlines: z.array(z.string()).min(3).max(8),
      descriptions: z.array(z.string()).min(2).max(4),
    }),
    yelpAd: z.object({
      headline: z.string(),
      body: z.string(),
      offer: z.string().nullable(),
      cta: z.string().nullable(),
    }),
    emailCampaign: z.object({
      subjectLine: z.string(),
      body: z.string(),
    }),
    blogOutline: z.string(),
    aeoFaq: z
      .array(
        z.object({
          question: z.string(),
          answer: z.string(),
        })
      )
      .min(3)
      .max(5),
    answerSnippet: z.string(),
  }),
});

export type NlCampaignResult = z.infer<typeof nlCampaignSchema>;