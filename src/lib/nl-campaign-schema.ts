import { z } from "zod";

const sourceTagSchema = z.enum([
  "Demand",
  "Competitor",
  "Capacity",
  "Service Value",
  "AEO",
]);

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
    whyNowBullets: z.array(z.string()).length(3),
    rationale: z.string(),
    whyThisMatters: z.string(),
  }),

  campaign: z.object({
    title: z.string(),
    description: z.string(),
    campaignType: z.enum([
      "DRAIN_SPECIAL",
      "WATER_HEATER",
      "MAINTENANCE_PUSH",
      "REVIEW_GENERATION",
      "EMERGENCY_SERVICE",
      "SEO_CONTENT",
      "AEO_FAQ",
      "CUSTOM",
    ]),
    objective: z.enum([
      "FILL_OPEN_SCHEDULE",
      "PUSH_HIGHER_TICKET_JOBS",
      "DEFEND_AGAINST_COMPETITOR",
      "IMPROVE_AI_SEARCH_VISIBILITY",
      "INCREASE_REVIEWS",
      "CAPTURE_SEASONAL_DEMAND",
    ]),
    targetService: z.string(),
    offer: z.string(),
    audience: z.string(),
    cta: z.string(),
    landingIntent: z.string(),
    creativeGuidance: z.object({
      recommendedImage: z.string(),
      avoidImagery: z.string(),
    }),
  }),

  assets: z.object({
    googleBusinessPost: z.string(),
    metaAdCopy: z.string(),
    googleAds: z.object({
      headlines: z.array(z.string()).min(3).max(8),
      descriptions: z.array(z.string()).min(2).max(4),
    }),
    emailCampaign: z.object({
      subjectLine: z.string(),
      body: z.string(),
    }),
    blogOutline: z.string(),
    aeoFaq: z.array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    ).min(3).max(5),
    answerSnippet: z.string(),
  }),
});

export type NlCampaignResult = z.infer<typeof nlCampaignSchema>;