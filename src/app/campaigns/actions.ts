"use server";

import { auth } from "@clerk/nextjs/server";
import { zodResponseFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { nlCampaignSchema } from "@/lib/nl-campaign-schema";
import {
  ActionThesis,
  buildRevenueOpportunityEngine,
} from "@/lib/revenue-opportunity-engine";
import { buildActionSpec } from "@/lib/action-spec";
import { getCampaignPerformanceSignals } from "@/lib/campaign-performance-signals";
import { invalidateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";
import type { BusinessProfile } from "@/generated/prisma";
import { resolveServiceJobValue } from "@/lib/service-pricing";
import type {
  AssetType,
  CampaignObjective,
  CampaignType,
  OpportunityType,
} from "@/generated/prisma";
import {
  generateAndStoreCampaignImage,
  shouldGenerateAiImage,
} from "@/lib/ai-images";
import { refineTargetingWithAI } from "@/lib/targeting-ai";

type CreateCampaignResult =
  | { success: true; campaignId: string; campaignName: string }
  | { success: false; error: string };

type CreateCampaignFromPromptOptions = {
  linkedOpportunity?: ResolvedOpportunity | null;
  campaignOrigin?: "recommendation" | "nl_custom";
  consumesRecommendationSlot?: boolean;
};

type EngineOpportunity = Awaited<
  ReturnType<typeof buildRevenueOpportunityEngine>
>["rankedOpportunities"][number];

type PromptLane =
  | "SERVICE"
  | "CAPACITY_FILL"
  | "AEO_SEO"
  | "REVIEWS"
  | "GENERAL";

type RoutedIntent = {
  lane: PromptLane;
  mode: "CAMPAIGN" | "ACTION_PACK" | "AUTO";
  preferredCampaignType?: CampaignType;
  preferredActionType?:
    | "CAMPAIGN_LAUNCH"
    | "AEO_CONTENT"
    | "SEO_CONTENT"
    | "GBP_OPTIMIZATION"
    | "REVIEW_GENERATION"
    | "CAPACITY_FILL"
    | "HIGH_VALUE_SERVICE_PUSH"
    | "CUSTOM";
  label: string;
};

type ResolvedOpportunity = {
  opportunityKey: string;
  familyKey: string;
  title: string;
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
  displayMoveLabel: string;
  displaySummary: string;
  imageKey: string;
  imageMode: "SERVICE_IMAGE" | "LOGO";
  actionThesis: ActionThesis;
  recommendedCampaignType: CampaignType;
  jobsLow: number;
  jobsHigh: number;
  revenueLow: number;
  revenueHigh: number;
  rawOpportunityScore: number;
  confidenceLabel: string;
  confidenceScore: number;
  whyNowBullets: string[];
  whyThisMatters: string;
  sourceTags: string[];
  source: "existing" | "generated";
  fitScore: number;
};

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .map((part) =>
      part.length > 0
        ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        : part
    )
    .join(" ");
}

async function generateBlogWithAI(params: {
  businessName: string;
  serviceName: string;
  serviceArea: string;
  offer?: string | null;
}) {
  try {
    const prompt = `
You are writing a helpful, local-service blog post for homeowners.

Business: ${params.businessName}
Service: ${params.serviceName}
Location: ${params.serviceArea}

Write a clear, natural, homeowner-friendly blog post.

Requirements:
- No marketing jargon
- No phrases like "high-intent", "capture demand", "generate leads"
- No internal or strategic language
- Write like a helpful expert, not an advertiser
- Keep it practical and trustworthy

Return JSON ONLY in this exact format:

{
  "title": "...",
  "excerpt": "...",
  "introduction": "...",
  "sections": [
    { "heading": "...", "body": "..." },
    { "heading": "...", "body": "..." },
    { "heading": "...", "body": "..." }
  ],
  "cta": "..."
}

Guidelines:
- Title should sound like a real blog post
- Excerpt = 1 sentence summary
- Introduction = 2–3 sentences
- Each section body = 2–4 sentences
- CTA = simple homeowner action (call, schedule, etc.)
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) return null;

    return JSON.parse(content);
  } catch (err) {
    console.error("[blog-generation] failed, falling back", err);
    return null;
  }
}

async function generateAdCopyWithAI(params: {
  businessName: string;
  serviceArea: string;
  targetService: string;
  actionTitle: string;
  actionSummary: string;
  targetAudience: string;
  offer?: string | null;
  cta?: string | null;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
  isOfferAction: boolean;
}) {
  try {
    const prompt = `
You are writing high-converting, homeowner-facing local service ad copy.

Business: ${params.businessName}
Service Area: ${params.serviceArea}
Target Service: ${params.targetService}
Action Title: ${params.actionTitle}
Action Summary: ${params.actionSummary}
Audience: ${params.targetAudience}
Offer: ${params.offer ?? "None"}
CTA: ${params.cta ?? "Book now"}

Context:
- This is for local home service businesses.
- The audience is homeowners, not marketers.
- The copy must feel credible, clear, and local.
- No marketing jargon.
- No phrases like "high-intent", "capture demand", "trust and conversion", "generate leads", "premium positioning", or "commercial offer".
- Do not overstuff the service area.
- Keep the language natural and believable.
- Write better than a typical agency ad.

Special rules:
- If this is a review action, do NOT write ad copy. Write simple homeowner-facing review-request messaging.
- If this is a visibility action, write copy that explains the business is improving how homeowners find the service online. Do not sound like an SEO consultant.
- If there is no real offer, do not invent one.

Return JSON only in this shape:
{
  "meta": {
    "headline": "...",
    "primaryText": "...",
    "cta": "..."
  },
  "googleBusiness": {
    "title": "...",
    "description": "...",
    "cta": "..."
  },
  "googleAds": {
    "headlines": ["...", "...", "...", "...", "..."],
    "descriptions": ["...", "...", "..."]
  },
  "yelp": {
    "headline": "...",
    "body": "...",
    "offer": null,
    "cta": "..."
  }
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as {
      meta: {
        headline: string;
        primaryText: string;
        cta: string;
      };
      googleBusiness: {
        title: string;
        description: string;
        cta: string;
      };
      googleAds: {
        headlines: string[];
        descriptions: string[];
      };
      yelp: {
        headline: string;
        body: string;
        offer: string | null;
        cta: string;
      };
    };
  } catch (error) {
    console.error("[ad-copy-generation] failed, falling back", error);
    return null;
  }
}

function buildSyntheticOpportunityKey(params: {
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
}) {
  return [
    slugify(params.serviceName),
    params.opportunityType,
    slugify(params.bestMove),
  ].join("::");
}

function extractRequestedServiceLabel(prompt: string): string | null {
  const normalizedPrompt = normalize(prompt);

  const patterns = [
    /get more (.+?) (jobs|leads|calls|bookings)/,
    /i want to get more (.+?) (jobs|leads|calls|bookings)/,
    /need more (.+?) (jobs|leads|calls|bookings)/,
    /promote (.+?)( service| services| jobs| leads| calls| bookings|$)/,
    /campaign for (.+?)( service| services| jobs| leads| calls| bookings|$)/,
    /action for (.+?)( service| services| jobs| leads| calls| bookings|$)/,
    /more (.+?) in /,
    /more (.+?) near me/,
  ];

  for (const pattern of patterns) {
    const match = normalizedPrompt.match(pattern);
    const raw = match?.[1]?.trim();

    if (!raw) continue;

    const cleaned = raw
      .replace(/\bmore\b/g, "")
      .replace(/\blocal\b/g, "")
      .replace(/\bnew\b/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (cleaned.length >= 3) {
      return toTitleCase(cleaned);
    }
  }

  return null;
}

function getBroadServiceLabelsForIndustry(industry: string): string[] {
  switch (industry) {
    case "septic":
      return ["septic", "septic service", "septic services"];
    case "tree-service":
      return ["tree service", "tree services", "tree work"];
    case "hvac":
      return [
        "hvac",
        "hvac service",
        "hvac services",
        "heating and cooling",
        "air conditioning and heating",
      ];
    default:
      return ["plumbing", "general plumbing", "plumbing service", "plumbing services"];
  }
}

function isBroadServiceIntent(params: {
  prompt: string;
  industry: string;
  requestedService: string | null;
}): boolean {
  const lower = normalize(params.prompt);
  const requested = normalize(params.requestedService ?? "");
  const broadLabels = getBroadServiceLabelsForIndustry(params.industry);

  if (broadLabels.some((label) => lower.includes(label))) {
    return true;
  }

  return broadLabels.some((label) => requested === label);
}

function isSpecificSubserviceFamily(params: {
  familyKey: string;
  industry: string;
}): boolean {
  const plumbingSpecific = new Set([
    "water-heater-service",
    "water-heater-repair-replacement",
    "tankless-water-heater",
    "repiping",
    "slab-leak-repair",
    "burst-pipe-repair",
    "water-softener",
    "gas-line-service",
    "sewer-line-service",
  ]);

  const septicSpecific = new Set([
    "septic-tank-pumping",
    "drain-field-repair",
    "lift-pump-service",
    "septic-system-installation",
    "grease-trap-cleaning",
  ]);

  const treeSpecific = new Set([
    "tree-removal",
    "stump-grinding",
    "pruning-and-trimming",
    "emergency-storm-service",
    "lot-clearing",
  ]);

  const hvacSpecific = new Set([
    "ac-repair",
    "heating-repair",
    "system-replacement",
    "heat-pump-service",
    "hvac-maintenance",
  ]);

  const familyMap: Record<string, Set<string>> = {
    plumbing: plumbingSpecific,
    septic: septicSpecific,
    "tree-service": treeSpecific,
    hvac: hvacSpecific,
  };

  return familyMap[params.industry]?.has(params.familyKey) ?? false;
}

function getBroadServiceDescriptor(industry: string): {
  serviceName: string;
  familyKey: string;
  displayMoveLabel: string;
  summary: string;
  audienceLabel: string;
  ctaHint: string;
  imageKey: string;
} {
  switch (industry) {
    case "septic":
      return {
        serviceName: "General Septic Service",
        familyKey: "general-septic-service",
        displayMoveLabel: "Promote General Septic Services",
        summary:
          "Create a broad septic action that captures everyday service demand without collapsing into one specific repair type.",
        audienceLabel: "septic service",
        ctaHint: "Book septic service",
        imageKey: "septic-pumping",
      };
    case "tree-service":
      return {
        serviceName: "General Tree Service",
        familyKey: "general-tree-service",
        displayMoveLabel: "Promote General Tree Services",
        summary:
          "Create a broad tree-service action that captures everyday demand without collapsing into one specific tree job.",
        audienceLabel: "tree service",
        ctaHint: "Book tree service",
        imageKey: "tree-removal",
      };
    case "hvac":
      return {
        serviceName: "General HVAC Service",
        familyKey: "general-hvac-service",
        displayMoveLabel: "Promote General HVAC Services",
        summary:
          "Create a broad HVAC action that captures everyday heating and cooling demand without collapsing into one specific repair type.",
        audienceLabel: "HVAC service",
        ctaHint: "Book HVAC service",
        imageKey: "ac-repair",
      };
    default:
      return {
        serviceName: "General Plumbing",
        familyKey: "general-plumbing",
        displayMoveLabel: "Promote General Plumbing Services",
        summary:
          "Create a broad plumbing action that captures everyday service demand without collapsing into one premium plumbing category.",
        audienceLabel: "plumbing help",
        ctaHint: "Book plumbing service",
        imageKey: "general-plumbing",
      };
  }
}

function inferIndustryFromContext(params: {
  prompt: string;
  familyKey?: string | null;
  serviceName?: string | null;
}): string {
  const source = normalize(
    `${params.prompt} ${params.familyKey ?? ""} ${params.serviceName ?? ""}`
  );

  if (
    source.includes("septic") ||
    source.includes("drain field") ||
    source.includes("grease trap") ||
    source.includes("lift pump")
  ) {
    return "septic";
  }

  if (
    source.includes("tree") ||
    source.includes("stump") ||
    source.includes("pruning") ||
    source.includes("trimming") ||
    source.includes("lot clearing") ||
    source.includes("storm cleanup")
  ) {
    return "tree-service";
  }

  if (
    source.includes("hvac") ||
    source.includes("air conditioning") ||
    source.includes("furnace") ||
    source.includes("heating") ||
    source.includes("cooling") ||
    source.includes("ac repair")
  ) {
    return "hvac";
  }

  return "plumbing";
}

function getFallbackImageKeyForIndustry(industry: string): string {
  const lower = normalize(industry);

  if (lower.includes("septic")) return "septic-pumping";
  if (lower.includes("tree")) return "tree-removal";
  if (lower.includes("hvac")) return "ac-repair";

  return "general-plumbing";
}

function normalizeStructuredAssetImageKey(params: {
  imageKey?: string | null;
  industry?: string | null;
}) {
  const normalized = slugify(params.imageKey ?? "");
  const industry = params.industry ?? "plumbing";

  const aliasMap: Record<string, string> = {
    plumbing: "general-plumbing",
    septic: "septic-pumping",
    "tree-service": "tree-removal",
    hvac: "ac-repair",
    service: getFallbackImageKeyForIndustry(industry),
    "local-service": getFallbackImageKeyForIndustry(industry),
    "home-service": getFallbackImageKeyForIndustry(industry),
    "hot-water-heater": "water-heater",
    "water-heater-install": "water-heater",
    "tankless-hot-water-heater": "tankless-water-heater",
  };

  if (!normalized) {
    return getFallbackImageKeyForIndustry(industry);
  }

  return aliasMap[normalized] ?? normalized;
}

function formatFaq(faq: Array<{ question: string; answer: string }>): string {
  return faq.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n");
}

function formatGoogleAds(googleAds: {
  headlines: string[];
  descriptions: string[];
}) {
  const headlines = googleAds.headlines.map((h) => `- ${h}`).join("\n");
  const descriptions = googleAds.descriptions.map((d) => `- ${d}`).join("\n");

  return `Headlines:\n${headlines}\n\nDescriptions:\n${descriptions}`;
}

function formatYelp(yelp: {
  headline: string;
  body: string;
  offer: string | null;
  cta: string | null;
}) {
  return [
    `Headline: ${yelp.headline}`,
    "",
    "Body:",
    yelp.body,
    "",
    `Offer: ${yelp.offer ?? "Not provided"}`,
    `CTA: ${yelp.cta ?? "Call now or book online"}`,
  ].join("\n");
}

function midpoint(low?: number | null, high?: number | null) {
  if (low == null && high == null) return null;
  if (low != null && high == null) return low;
  if (low == null && high != null) return high;
  return Math.round(((low ?? 0) + (high ?? 0)) / 2);
}

function toCampaignTypeFromAction(actionType: string): CampaignType {
  switch (actionType) {
    case "AEO_CONTENT":
      return "AEO_FAQ";
    case "SEO_CONTENT":
      return "SEO_CONTENT";
    case "REVIEW_GENERATION":
      return "REVIEW_GENERATION";
    case "CAPACITY_FILL":
      return "MAINTENANCE_PUSH";
    case "HIGH_VALUE_SERVICE_PUSH":
      return "WATER_HEATER";
    default:
      return "CUSTOM";
  }
}

function toCampaignObjectiveFromAction(actionType: string): CampaignObjective {
  switch (actionType) {
    case "AEO_CONTENT":
    case "SEO_CONTENT":
    case "GBP_OPTIMIZATION":
      return "IMPROVE_AI_SEARCH_VISIBILITY";
    case "REVIEW_GENERATION":
      return "INCREASE_REVIEWS";
    case "CAPACITY_FILL":
      return "FILL_OPEN_SCHEDULE";
    case "HIGH_VALUE_SERVICE_PUSH":
      return "PUSH_HIGHER_TICKET_JOBS";
    default:
      return "CAPTURE_SEASONAL_DEMAND";
  }
}

function routePromptIntent(prompt: string): RoutedIntent {
  const lower = normalize(prompt);

  if (
    lower.includes("slow week") ||
    lower.includes("fill the schedule") ||
    lower.includes("fill schedule") ||
    lower.includes("capacity")
  ) {
    return {
      lane: "CAPACITY_FILL",
      mode: "CAMPAIGN",
      preferredCampaignType: "MAINTENANCE_PUSH",
      preferredActionType: "CAPACITY_FILL",
      label: "Capacity-fill intent",
    };
  }

  if (lower.includes("review")) {
    return {
      lane: "REVIEWS",
      mode: "CAMPAIGN",
      preferredCampaignType: "REVIEW_GENERATION",
      preferredActionType: "REVIEW_GENERATION",
      label: "Review intent",
    };
  }

  if (
    lower.includes("aeo") ||
    lower.includes("faq") ||
    lower.includes("seo") ||
    lower.includes("visibility") ||
    lower.includes("answer engine") ||
    lower.includes("ai search")
  ) {
    return {
      lane: "AEO_SEO",
      mode: "ACTION_PACK",
      preferredCampaignType: "AEO_FAQ",
      preferredActionType: "AEO_CONTENT",
      label: "AEO / SEO intent",
    };
  }

  const requestedService = extractRequestedServiceLabel(prompt);
  if (requestedService) {
    return {
      lane: "SERVICE",
      mode: "CAMPAIGN",
      label: `${requestedService} service intent`,
    };
  }

  return {
    lane: "GENERAL",
    mode: "AUTO",
    label: "Auto intent",
  };
}

function getStrongMatchThreshold(lane: PromptLane): number {
  switch (lane) {
    case "SERVICE":
      return 65;
    case "CAPACITY_FILL":
      return 65;
    case "AEO_SEO":
    case "REVIEWS":
      return 60;
    default:
      return 50;
  }
}

function scoreExistingOpportunityFit(
  prompt: string,
  opportunity: EngineOpportunity,
  routedIntent: RoutedIntent
): number {
  const lowerPrompt = normalize(prompt);
  const service = normalize(opportunity.serviceName);
  const title = normalize(opportunity.title);
  const bestMove = normalize(opportunity.bestMove);
  const displayMove = normalize(opportunity.displayMoveLabel);

  const requestedService = extractRequestedServiceLabel(prompt);
  const normalizedRequestedService = requestedService
    ? normalize(requestedService)
    : null;

  let score = 0;
  score += Math.min(opportunity.rawOpportunityScore * 0.35, 35);

  if (
    routedIntent.preferredCampaignType &&
    opportunity.recommendedCampaignType === routedIntent.preferredCampaignType
  ) {
    score += 28;
  }

  if (
    routedIntent.lane === "CAPACITY_FILL" &&
    (opportunity.opportunityType === "CAPACITY_GAP" ||
      opportunity.recommendedCampaignType === "MAINTENANCE_PUSH" ||
      normalize(opportunity.actionThesis.angle).includes("schedule"))
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "AEO_SEO" &&
    (opportunity.opportunityType === "AI_SEARCH_VISIBILITY" ||
      opportunity.recommendedCampaignType === "AEO_FAQ" ||
      opportunity.recommendedCampaignType === "SEO_CONTENT")
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "REVIEWS" &&
    opportunity.recommendedCampaignType === "REVIEW_GENERATION"
  ) {
    score += 35;
  }

  if (normalizedRequestedService) {
    if (
      lowerPrompt.includes(normalizedRequestedService) ||
      service.includes(normalizedRequestedService) ||
      title.includes(normalizedRequestedService) ||
      bestMove.includes(normalizedRequestedService) ||
      displayMove.includes(normalizedRequestedService)
    ) {
      score += 40;
    }
  }

  if (
    lowerPrompt.includes(service) ||
    lowerPrompt.includes(title) ||
    lowerPrompt.includes(bestMove)
  ) {
    score += 15;
  }

  return Math.max(0, Math.round(score));
}

function buildPromptRefinedActionThesis(params: {
  prompt: string;
  resolvedOpportunity: Pick<
    ResolvedOpportunity,
    "familyKey" | "actionThesis" | "displayMoveLabel" | "imageMode" | "imageKey"
  >;
  serviceArea: string;
}): ActionThesis & { whyThisActionBullets: string[] } {
  const { prompt, resolvedOpportunity } = params;
  const lower = normalize(prompt);
  const base = resolvedOpportunity.actionThesis;

  if (
    lower.includes("aeo") ||
    lower.includes("faq") ||
    lower.includes("seo") ||
    lower.includes("visibility") ||
    lower.includes("ai search")
  ) {
    return {
      ...base,
      imageMode: "LOGO",
      imageKey: "company-logo",
      whyThisActionBullets: [
        "This request is visibility-oriented and is better handled through content, search presence, and website clarity.",
        "A branded visual anchor is a better fit for this action than a physical service image.",
        "The action is intended to improve discoverability and trust rather than only immediate booked jobs.",
        "This keeps the content aligned to local visibility work instead of forcing it into a service-promo lane.",
      ],
    };
  }

  if (lower.includes("review")) {
    return {
      ...base,
      whyThisActionBullets: [
        "This request is focused on review generation and trust-building.",
        "Recent reviews strengthen conversion and local credibility over time.",
        "This action should stay tightly aligned to the request instead of drifting into generic promotion.",
        "The content should feel easy to approve and operationally simple to execute.",
      ],
    };
  }

  if (lower.includes("fill the schedule") || lower.includes("capacity")) {
    return {
      ...base,
      whyThisActionBullets: [
        "This request is about filling open capacity, not only chasing the largest-ticket work.",
        "The action is positioned to create lower-friction, easier-to-book demand.",
        "This keeps the recommendation aligned to current schedule needs.",
        "The messaging should feel practical, believable, and easy to launch quickly.",
      ],
    };
  }

  return {
    ...base,
    whyThisActionBullets: [
      "This action is the clearest match to the requested service and commercial goal.",
      "It is framed to be easy to review, approve, and execute quickly.",
      "The messaging stays aligned to the displayed move instead of drifting into an unrelated category.",
      "The goal is to generate believable local demand, not generic marketing copy.",
    ],
  };
}

function resolveSyntheticJobValue(params: {
  profile: {
    averageJobValue: unknown;
    servicePricingJson?: unknown;
  };
  familyKey: string;
  serviceName: string;
  primaryService?: string;
}) {
  const numericAverageJobValue =
    typeof params.profile.averageJobValue === "number" &&
    Number.isFinite(params.profile.averageJobValue)
      ? params.profile.averageJobValue
      : Number(params.profile.averageJobValue ?? 0);

  const fallbackJobValue =
    Number.isFinite(numericAverageJobValue) && numericAverageJobValue > 0
      ? numericAverageJobValue
      : 450;

  return resolveServiceJobValue({
    profile: params.profile as BusinessProfile,
    candidate: {
      familyKey: params.familyKey,
      serviceName: params.serviceName,
      actionThesisPrimaryService: params.primaryService ?? params.serviceName,
    },
    fallbackJobValue,
  });
}

function buildSyntheticOpportunity(params: {
  prompt: string;
  routedIntent: RoutedIntent;
  profile: {
    businessName: string;
    serviceArea: string;
    averageJobValue: unknown;
    servicePricingJson?: unknown;
    hasFaqContent: boolean;
    servicePageUrls: string[];
  };
}): ResolvedOpportunity {
  const { prompt, routedIntent, profile } = params;
  const lowerPrompt = normalize(prompt);
  const requestedService = extractRequestedServiceLabel(prompt);
  const inferredIndustry = inferIndustryFromContext({
    prompt,
    familyKey: requestedService ? slugify(requestedService) : null,
    serviceName: requestedService,
  });

  if (routedIntent.lane === "CAPACITY_FILL") {
    const serviceName = requestedService ?? "Open schedule service";
    const familyKey = requestedService
      ? slugify(requestedService)
      : `${inferredIndustry}-capacity-fill`;
    const bestMove = requestedService
      ? `Fill Schedule with ${requestedService}`
      : "Fill This Week’s Schedule";
    const opportunityType: OpportunityType = "CAPACITY_GAP";
    const resolvedJobValue = resolveSyntheticJobValue({
      profile,
      familyKey,
      serviceName,
      primaryService: serviceName,
    });

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove,
      }),
      familyKey,
      title: `${serviceName} Capacity Opportunity`,
      serviceName,
      opportunityType,
      bestMove,
      displayMoveLabel: bestMove,
      displaySummary:
        "Use lower-friction, easier-to-book work to turn open capacity into booked jobs.",
      imageKey: familyKey,
      imageMode: "SERVICE_IMAGE",
            actionThesis: {
        familyKey,
        primaryService: serviceName,
        angle: "schedule fill",
        title: bestMove,
        summary:
          "Create a practical local action that helps turn open capacity into booked jobs.",
        audience: `Homeowners in ${profile.serviceArea} with service needs that are easier to book this week`,
        offerHint: "",
        ctaHint: "Book now",
        imageKey: familyKey,
        imageMode: "SERVICE_IMAGE",
      },
      recommendedCampaignType: "MAINTENANCE_PUSH",
      jobsLow: 2,
      jobsHigh: 5,
      revenueLow: Math.round(resolvedJobValue * 1.5),
      revenueHigh: Math.round(resolvedJobValue * 3.5),
      rawOpportunityScore: 74,
      confidenceLabel: "Medium",
      confidenceScore: 74,
            whyNowBullets: [
        "The request is to fill open schedule capacity, not only chase the highest-ticket work.",
        "This action is designed to create lower-friction demand that is easier to approve and launch quickly.",
        "A schedule-fill action should stay aligned to immediate booking needs instead of drifting into unrelated promotion.",
      ],
      whyThisMatters:
        "A schedule-fill request should produce a schedule-fill action instead of drifting into unrelated promotion.",
      sourceTags: ["Capacity", "Demand"],
      source: "generated",
      fitScore: 92,
    };
  }

  if (routedIntent.lane === "AEO_SEO") {
    const serviceName = requestedService ?? "AI search visibility";
    const opportunityType: OpportunityType = "AI_SEARCH_VISIBILITY";
    const baseAverageJobValue =
      typeof profile.averageJobValue === "number" &&
      Number.isFinite(profile.averageJobValue)
        ? profile.averageJobValue
        : Number(profile.averageJobValue ?? 450);

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove: "Improve AI Search Visibility",
      }),
      familyKey: "ai-search-visibility",
      title: "AI Search Visibility Opportunity",
      serviceName,
      opportunityType,
      bestMove: "Improve AI Search Visibility",
      displayMoveLabel: "Improve AI Search Visibility",
      displaySummary: `Strengthen local answer-engine visibility in ${profile.serviceArea}.`,
      imageKey: "company-logo",
      imageMode: "LOGO",
      actionThesis: {
        familyKey: "ai-search-visibility",
        primaryService: serviceName,
        angle: "answer-engine visibility",
        title: "Improve AI Search Visibility",
        summary:
          "Improve discoverability through FAQ, GBP, and service-page upgrades.",
        audience: `Homeowners searching for service help in ${profile.serviceArea}`,
        offerHint: "",
        ctaHint: "Review visibility action",
        imageKey: "company-logo",
        imageMode: "LOGO",
      },
      recommendedCampaignType: "AEO_FAQ",
      jobsLow: 1,
      jobsHigh: 2,
      revenueLow: Math.round(baseAverageJobValue * 1),
      revenueHigh: Math.round(baseAverageJobValue * 2),
      rawOpportunityScore: 68,
      confidenceLabel: "Medium",
      confidenceScore: 78,
      whyNowBullets: [
        profile.hasFaqContent
          ? "FAQ coverage still appears improvable for stronger AI/local visibility."
          : "The business appears to lack structured FAQ coverage.",
        profile.servicePageUrls.length < 3
          ? "Service-page coverage looks thin, which weakens answer visibility."
          : "Service-page coverage can still support stronger answer-engine relevance.",
        "The request is explicitly asking for AEO / FAQ / visibility work.",
      ],
      whyThisMatters:
        "This is the most direct match to a visibility-oriented request and should not be forced through an unrelated service opportunity.",
      sourceTags: ["AEO", "Demand"],
      source: "generated",
      fitScore: 95,
    };
  }

  if (routedIntent.lane === "REVIEWS") {
    const serviceName = "Review generation";
    const opportunityType: OpportunityType = "LOCAL_SEARCH_SPIKE";
    const baseAverageJobValue =
      typeof profile.averageJobValue === "number" &&
      Number.isFinite(profile.averageJobValue)
        ? profile.averageJobValue
        : Number(profile.averageJobValue ?? 450);

        return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove: "Post-Service Review Request Workflow",
      }),
      familyKey: `${inferredIndustry}-reviews`,
      title: "Review Generation Opportunity",
      serviceName,
      opportunityType,
            bestMove: "Post-Service Review Request Workflow",
      displayMoveLabel: "Post-Service Review Request Workflow",
      displaySummary: `Create a structured post-service review-request workflow for recent completed-job customers in ${profile.serviceArea}.`,
      imageKey: `${inferredIndustry}-reviews`,
      imageMode: "SERVICE_IMAGE",
            actionThesis: {
        familyKey: `${inferredIndustry}-reviews`,
        primaryService: "Review generation",
        angle: "review acquisition",
        title: "Post-Service Review Request Workflow",
        summary:
          "Send a structured post-service review request to recent completed-job customers.",
        audience: `Recent completed-job customers in ${profile.serviceArea} who have not yet left a review`,
        offerHint: "",
        ctaHint: "Request review",
        imageKey: `${inferredIndustry}-reviews`,
        imageMode: "SERVICE_IMAGE",
      },
      recommendedCampaignType: "REVIEW_GENERATION",
      jobsLow: 1,
      jobsHigh: 2,
      revenueLow: Math.round(baseAverageJobValue * 1),
      revenueHigh: Math.round(baseAverageJobValue * 2),
      rawOpportunityScore: 64,
      confidenceLabel: "Medium",
      confidenceScore: 68,
            whyNowBullets: [
        "The request is explicitly about reviews from real customers.",
        "Fresh reviews support local trust and conversion over time.",
        "A defined review-request workflow is more credible than vague reputation marketing.",
      ],
      whyThisMatters:
        "A review-focused request should produce a review-focused action.",
      sourceTags: ["Trust", "Demand"],
      source: "generated",
      fitScore: 88,
    };
  }

  const serviceName =
    requestedService ??
    (lowerPrompt.includes("emergency")
      ? "Emergency service"
      : "Local service demand");

  const familyKey = requestedService
    ? slugify(requestedService)
    : `${inferredIndustry}-general-service`;

  const opportunityType: OpportunityType =
    lowerPrompt.includes("emergency")
      ? "COMPETITOR_INACTIVE"
      : lowerPrompt.includes("upgrade") || lowerPrompt.includes("install")
        ? "HIGH_VALUE_SERVICE"
        : "LOCAL_SEARCH_SPIKE";

  const bestMove = requestedService
    ? `Promote ${requestedService}`
    : "Promote Local Service Demand";

  const resolvedJobValue = resolveSyntheticJobValue({
    profile,
    familyKey,
    serviceName,
    primaryService: serviceName,
  });

  return {
    opportunityKey: buildSyntheticOpportunityKey({
      serviceName,
      opportunityType,
      bestMove,
    }),
    familyKey,
    title: requestedService
      ? `${requestedService} Revenue Opportunity`
      : "Prompt-Aligned Revenue Opportunity",
    serviceName,
    opportunityType,
    bestMove,
    displayMoveLabel: bestMove,
    displaySummary: requestedService
      ? `Build a custom requested action for ${requestedService.toLowerCase()} demand in ${profile.serviceArea}.`
      : `Build a prompt-aligned local action for ${profile.serviceArea}.`,
    imageKey: familyKey,
    imageMode: "SERVICE_IMAGE",
    actionThesis: {
      familyKey,
      primaryService: serviceName,
      angle:
        opportunityType === "HIGH_VALUE_SERVICE"
          ? "high-value service demand"
          : lowerPrompt.includes("emergency")
            ? "urgent demand capture"
            : "local demand capture",
      title: bestMove,
      summary: requestedService
        ? `Generate more local demand for ${requestedService.toLowerCase()} based on the customer’s explicit request.`
        : "Generate more local demand with a prompt-aligned action instead of forcing a weak category match.",
      audience: `Homeowners in ${profile.serviceArea}`,
      offerHint: "Compelling local service offer",
      ctaHint: lowerPrompt.includes("emergency") ? "Call now" : "Book now",
      imageKey: familyKey,
      imageMode: "SERVICE_IMAGE",
    },
    recommendedCampaignType:
      opportunityType === "HIGH_VALUE_SERVICE" ? "WATER_HEATER" : "CUSTOM",
    jobsLow: 1,
    jobsHigh: 3,
    revenueLow: Math.round(resolvedJobValue * 1),
    revenueHigh: Math.round(resolvedJobValue * 3),
    rawOpportunityScore: requestedService ? 68 : 60,
    confidenceLabel: "Low",
    confidenceScore: requestedService ? 68 : 60,
    whyNowBullets: requestedService
      ? [
          "The request is explicitly asking for a service that is not currently surfaced as a strong existing match.",
          "MarketForge allows a custom requested action even when that service is not part of the strongest current recommendation set.",
          "This keeps the action aligned to the customer’s request without polluting the default engine.",
        ]
      : [
          "No strong existing opportunity matched the prompt cleanly.",
          "A prompt-aligned opportunity was synthesized to avoid a misleading pairing.",
          "This keeps the execution plan grounded in the request instead of forcing a stale match.",
        ],
    whyThisMatters: requestedService
      ? "The customer explicitly requested this service, so MarketForge is allowing a custom action without making it part of the default recommendation engine."
      : "When existing opportunities do not fit well enough, the system should build a better prompt-specific opportunity rather than guessing.",
    sourceTags: ["Demand"],
    source: "generated",
    fitScore: requestedService ? 90 : 80,
  };
}

function buildFallbackCampaignDraft(params: {
  actionTitle: string;
  actionSummary: string;
  targetService: string;
  serviceArea: string;
  campaignType: CampaignType;
  objective: CampaignObjective;
  actionThesis: ActionThesis & { whyThisActionBullets?: string[] };
}) {
  const {
    actionTitle,
    actionSummary,
    targetService,
    campaignType,
    objective,
    actionThesis,
  } = params;

    const offer =
    campaignType === "AEO_FAQ"
      ? null
      : campaignType === "REVIEW_GENERATION"
        ? null
        : campaignType === "MAINTENANCE_PUSH"
          ? null
          : actionThesis.offerHint;

    const cta =
    campaignType === "REVIEW_GENERATION"
      ? "Request review"
      : actionThesis.ctaHint;

  return {
    title: actionTitle,
    description: actionSummary,
    campaignType,
    objective,
    targetService,
    offer,
    audience: actionThesis.audience,
    cta,
    landingIntent:
      campaignType === "AEO_FAQ" || campaignType === "SEO_CONTENT"
        ? "Improve local search and answer-engine visibility"
        : "Convert local demand into booked jobs",
    creativeGuidance: {
      recommendedImage:
        actionThesis.imageMode === "LOGO"
          ? "Use the company logo or a clean branded mark as the main visual."
          : `Use a real image aligned to this move: ${actionThesis.title.toLowerCase()}.`,
      avoidImagery:
        "Avoid generic stock-looking imagery, fake before/after visuals, and visuals that do not match the service being promoted.",
    },
  };
}

function buildFallbackCampaignFromResolvedOpportunity(
  resolvedOpportunity: ResolvedOpportunity,
  profile: {
    serviceArea: string;
  },
  actionTitle: string,
  actionSummary: string,
  actionType: string,
  actionThesis: ActionThesis & { whyThisActionBullets?: string[] }
) {
  const campaignType =
    resolvedOpportunity.recommendedCampaignType ??
    toCampaignTypeFromAction(actionType);

  const objective = toCampaignObjectiveFromAction(actionType);

  return buildFallbackCampaignDraft({
    actionTitle,
    actionSummary,
    targetService: actionThesis.primaryService,
    serviceArea: profile.serviceArea,
    campaignType,
    objective,
    actionThesis,
  });
}

function cleanActionTitleForAd(title?: string | null) {
  const base = (title ?? "Local Service Offer").trim();

  return base
    .replace(/^promote\s+/i, "")
    .replace(/^capture\s+/i, "")
    .replace(/^push\s+/i, "")
    .replace(/^improve\s+/i, "")
    .replace(/^fill\s+/i, "")
    .replace(/^more\s+/i, "")
    .replace(/^high-intent\s+/i, "")
    .replace(/\s+jobs?$/i, "")
    .replace(/\s+bookings?$/i, "")
    .replace(/\s+demand$/i, "")
    .replace(/\s+response$/i, "")
    .trim();
}

function buildMetaPrimaryText(params: {
  summary?: string | null;
  serviceArea?: string | null;
  cta?: string | null;
}) {
  const summary = (params.summary ?? "").trim();
  const serviceArea = getConsumerFacingAreaLabel(params.serviceArea);
  const cta = (params.cta ?? "Book now").trim();

  let cleaned = summary
    .replace(/^generate\s+/i, "")
    .replace(/^drive\s+/i, "")
    .replace(/^capture\s+/i, "")
    .replace(/^promote\s+/i, "")
    .replace(/^more\s+/i, "")
    .replace(/^high-intent\s+/i, "")
    .replace(/\bbookings\b/gi, "appointments")
    .replace(/\btrust and conversion\b/gi, "why homeowners choose this service")
    .trim();

  if (!cleaned) {
    return serviceArea
      ? `Trusted local service is available in ${serviceArea}. ${cta}.`
      : `Trusted local service is available now. ${cta}.`;
  }

  if (serviceArea) {
    const escapedArea = serviceArea.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned
      .replace(new RegExp(`\\s+in\\s+${escapedArea}\\.?\s*$`, "i"), "")
      .trim();
  }

  cleaned = cleaned.replace(/\.\s*$/g, "").trim();

  return serviceArea
    ? `${cleaned} in ${serviceArea}. ${cta}.`
    : `${cleaned}. ${cta}.`;
}

function buildGoogleBusinessPostText(params: {
  summary?: string | null;
  serviceArea?: string | null;
  cta?: string | null;
}) {
  const summary = (params.summary ?? "").trim();
  const serviceArea = getConsumerFacingAreaLabel(params.serviceArea);
  const cta = (params.cta ?? "Learn more").trim();

  let cleaned = summary
    .replace(/^generate\s+/i, "")
    .replace(/^drive\s+/i, "")
    .replace(/^capture\s+/i, "")
    .replace(/^promote\s+/i, "")
    .replace(/^more\s+/i, "")
    .replace(/^high-intent\s+/i, "")
    .replace(/\bbookings\b/gi, "appointments")
    .replace(/\btrust and conversion\b/gi, "why homeowners choose this service")
    .trim();

  if (!cleaned) {
    return serviceArea
      ? `Need local service in ${serviceArea}? ${cta}.`
      : `Need local service help? ${cta}.`;
  }

  if (serviceArea) {
    const escapedArea = serviceArea.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned
      .replace(new RegExp(`\\s+in\\s+${escapedArea}\\.?\s*$`, "i"), "")
      .trim();
  }

  cleaned = cleaned.replace(/\.\s*$/g, "").trim();

  return serviceArea
    ? `${cleaned} in ${serviceArea}. ${cta}.`
    : `${cleaned}. ${cta}.`;
}

function normalizeOfferText(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getConsumerFacingAreaLabel(serviceArea?: string | null) {
  const area = (serviceArea ?? "").trim();

  if (!area) return "";

  const commaParts = area
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (area.length > 60 || commaParts.length > 2) {
    return commaParts[0] || "your area";
  }

  return area;
}

function isReviewActionType(params: {
  actionType?: string | null;
  campaignType?: string | null;
  routedLane?: string | null;
}) {
  return (
    params.actionType === "REVIEW_GENERATION" ||
    params.campaignType === "REVIEW_GENERATION" ||
    params.routedLane === "REVIEWS"
  );
}

function isVisibilityActionType(params: {
  actionType?: string | null;
  campaignType?: string | null;
  routedLane?: string | null;
  opportunityType?: OpportunityType | null;
}) {
  return (
    params.actionType === "AEO_CONTENT" ||
    params.actionType === "SEO_CONTENT" ||
    params.campaignType === "AEO_FAQ" ||
    params.campaignType === "SEO_CONTENT" ||
    params.routedLane === "AEO_SEO" ||
    params.opportunityType === "AI_SEARCH_VISIBILITY"
  );
}

function sanitizeCustomerFacingOffer(value?: string | null) {
  const text = (value ?? "").trim();
  if (!text) return null;

  const lower = text.toLowerCase();

  const invalidFragments = [
    "review-backed",
    "review mention",
    "mention this review",
    "simple review request",
    "simple local offer",
    "compelling local service offer",
    "relevant",
  ];

  if (invalidFragments.some((fragment) => lower.includes(fragment))) {
    return null;
  }

  return text;
}

function buildMetaHeadline(params: {
  actionTitle: string;
  targetService: string;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
}) {
  if (params.isReviewAction) {
    return "Request More Customer Reviews";
  }

  if (params.isVisibilityAction) {
    return `Improve Visibility for ${params.targetService}`;
  }

  return cleanActionTitleForAd(params.actionTitle);
}

function buildMetaPrimaryTextFromAction(params: {
  actionSummary?: string | null;
  serviceArea?: string | null;
  cta?: string | null;
  offer?: string | null;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
  targetService: string;
}) {
  const serviceArea = getConsumerFacingAreaLabel(params.serviceArea);
  const cta = (params.cta ?? "Book now").trim();
  const cleanOffer = sanitizeCustomerFacingOffer(params.offer);

  if (params.isReviewAction) {
    return `Ask recent completed-job customers for a review using a simple, approved follow-up workflow.`;
  }

  if (params.isVisibilityAction) {
    return serviceArea
      ? `Make it easier for homeowners to find ${params.targetService.toLowerCase()} in ${serviceArea}.`
      : `Make it easier for homeowners to find ${params.targetService.toLowerCase()}.`;
  }

  const base = buildMetaPrimaryText({
    summary: params.actionSummary,
    serviceArea,
    cta,
  });

  return cleanOffer ? `${cleanOffer}. ${base}` : base;
}

function buildGoogleBusinessDescriptionFromAction(params: {
  actionSummary?: string | null;
  serviceArea?: string | null;
  cta?: string | null;
  offer?: string | null;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
  targetService: string;
}) {
  const serviceArea = getConsumerFacingAreaLabel(params.serviceArea);
  const cta = (params.cta ?? "Learn more").trim();
  const cleanOffer = sanitizeCustomerFacingOffer(params.offer);

  if (params.isReviewAction) {
    return `Use this approved workflow to request reviews from recent completed-job customers.`;
  }

  if (params.isVisibilityAction) {
    return serviceArea
      ? `Help more homeowners find your ${params.targetService.toLowerCase()} services in ${serviceArea}.`
      : `Help more homeowners find your ${params.targetService.toLowerCase()} services.`;
  }

  const base = buildGoogleBusinessPostText({
    summary: params.actionSummary,
    serviceArea,
    cta,
  });

  return cleanOffer ? `${cleanOffer} — ${base}` : base;
}

function getAssetTypesForAction(params: {
  executionMode: "CAMPAIGN" | "ACTION_PACK";
  actionType: string;
  campaignType: CampaignType;
  routedLane: PromptLane;
  opportunityType: OpportunityType;
}): AssetType[] {
  const visibilityAction = isVisibilityActionType({
    actionType: params.actionType,
    campaignType: params.campaignType,
    routedLane: params.routedLane,
    opportunityType: params.opportunityType,
  });

  const reviewAction = isReviewActionType({
    actionType: params.actionType,
    campaignType: params.campaignType,
    routedLane: params.routedLane,
  });

  if (visibilityAction) {
        return [
      "GOOGLE_BUSINESS",
      "BLOG",
      "AEO_FAQ",
      "ANSWER_SNIPPET",
    ];
  }

  if (reviewAction) {
    return [
      "GOOGLE_BUSINESS",
      "EMAIL",
    ];
  }

  return [
    "GOOGLE_BUSINESS",
    "META",
    "GOOGLE_ADS",
    "YELP",
    "EMAIL",
    "BLOG",
    "AEO_FAQ",
    "ANSWER_SNIPPET",
  ];
}

function buildStructuredGoogleBusinessAsset(params: {
  title?: string | null;
  summary?: string | null;
  cta?: string | null;
  offer?: string | null;
  imageKey?: string | null;
  imageMode?: "SERVICE_IMAGE" | "LOGO" | null;
  industry?: string | null;
  serviceArea?: string | null;
}) {
  const cta = params.cta ?? "Learn more";
  const offer = normalizeOfferText(params.offer);
  const descriptionBase =
    (params.summary ?? "").trim() ||
    buildGoogleBusinessPostText({
      summary: params.summary,
      serviceArea: params.serviceArea,
      cta,
    });

  return JSON.stringify({
    kind: "GOOGLE_BUSINESS",
    title: cleanActionTitleForAd(params.title),
    description:
      offer && !descriptionBase.toLowerCase().includes(offer.toLowerCase())
        ? `${offer} — ${descriptionBase}`
        : descriptionBase,
    cta,
    offer,
    imageKey: normalizeStructuredAssetImageKey({
      imageKey: params.imageKey,
      industry: params.industry,
    }),
    imageMode: params.imageMode ?? "SERVICE_IMAGE",
    industry: params.industry ?? "plumbing",
  });
}

function buildStructuredMetaAsset(params: {
  headline?: string | null;
  primaryText?: string | null;
  cta?: string | null;
  offer?: string | null;
  imageKey?: string | null;
  imageMode?: "SERVICE_IMAGE" | "LOGO" | null;
  industry?: string | null;
  serviceArea?: string | null;
}) {
  const cta = params.cta ?? "Book now";
  const offer = normalizeOfferText(params.offer);
  const primaryTextBase =
    (params.primaryText ?? "").trim() ||
    buildMetaPrimaryText({
      summary: params.primaryText,
      serviceArea: params.serviceArea,
      cta,
    });

  return JSON.stringify({
    kind: "META",
    headline: cleanActionTitleForAd(params.headline),
    primaryText:
      offer && !primaryTextBase.toLowerCase().includes(offer.toLowerCase())
        ? `${offer}. ${primaryTextBase}`
        : primaryTextBase,
    cta,
    offer,
    imageKey: normalizeStructuredAssetImageKey({
      imageKey: params.imageKey,
      industry: params.industry,
    }),
    imageMode: params.imageMode ?? "SERVICE_IMAGE",
    industry: params.industry ?? "plumbing",
  });
}

function buildStructuredEmailAsset(params: {
  subject?: string | null;
  previewLine?: string | null;
  body?: string | null;
  cta?: string | null;
  industry?: string | null;
}) {
  return JSON.stringify({
    kind: "EMAIL",
    subject: params.subject ?? "Service Update",
    previewLine:
      params.previewLine ?? "Local service support is available.",
    body:
      params.body ??
      "We have availability to help with your local service needs.",
    cta: params.cta ?? "Learn More",
    industry: params.industry ?? "plumbing",
  });
}

function buildEmailAssetFromAction(params: {
  actionTitle: string;
  actionSummary?: string | null;
  cta?: string | null;
  targetService: string;
  serviceArea: string;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
  isOfferAction: boolean;
  industry?: string | null;
}) {
  if (params.isReviewAction) {
    return buildStructuredEmailAsset({
      subject: "Quick favor after your recent service",
      previewLine: "Would you be willing to leave a quick review?",
      body: `Thank you for choosing us for your recent service. If everything went well, we’d appreciate a quick review. Your feedback helps other homeowners in ${params.serviceArea} feel confident choosing the right company.`,
      cta: "Leave a review",
      industry: params.industry,
    });
  }

  if (params.isVisibilityAction) {
    return buildStructuredEmailAsset({
      subject: `${params.targetService} visibility action draft`,
      previewLine: "Optional manual-use placeholder",
      body: `This action is primarily focused on improving visibility through Google Business, FAQ, answer content, and blog support. Email is included here only as an optional manual-use placeholder if needed later.`,
      cta: "Learn more",
      industry: params.industry,
    });
  }

  if (params.isOfferAction) {
    return buildStructuredEmailAsset({
      subject: params.actionTitle,
      previewLine: params.actionSummary,
      body:
        params.actionSummary ??
        `We’re currently promoting ${params.targetService.toLowerCase()} in ${params.serviceArea}.`,
      cta: params.cta ?? "Book now",
      industry: params.industry,
    });
  }

  return buildStructuredEmailAsset({
    subject: params.actionTitle,
    previewLine: params.actionSummary,
    body:
      params.actionSummary ??
      `We’re currently promoting ${params.targetService.toLowerCase()} in ${params.serviceArea}.`,
    cta: params.cta ?? "Learn more",
    industry: params.industry,
  });
}

function cleanInternalMarketingLanguage(value?: string | null) {
  const text = (value ?? "").trim();

  if (!text) return "";

  return text
    .replace(/\bdrive more high-intent bookings\b/gi, "understand when professional help is needed")
    .replace(/\bgenerate more high-intent bookings\b/gi, "understand when professional help is needed")
    .replace(/\bcapture more high-intent bookings\b/gi, "understand when professional help is needed")
    .replace(/\bdrive more bookings\b/gi, "know when it is time to take action")
    .replace(/\bgenerate more bookings\b/gi, "know when it is time to take action")
    .replace(/\bcapture more bookings\b/gi, "know when it is time to take action")
    .replace(/\bgenerate more local demand\b/gi, "help homeowners make informed decisions")
    .replace(/\bdrive more local demand\b/gi, "help homeowners make informed decisions")
    .replace(/\bcapture local demand\b/gi, "help homeowners make informed decisions")
    .replace(/\bhigh-intent\b/gi, "")
    .replace(/\bbookings\b/gi, "service appointments")
    .replace(/\bdemand\b/gi, "service needs")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCustomerFacingBlogIntro(params: {
  primaryService: string;
  serviceArea: string;
}) {
  return `If you need ${params.primaryService.toLowerCase()} in ${params.serviceArea}, it helps to understand the early warning signs, what can happen if the issue gets worse, and when it makes sense to bring in a professional.`;
}

function buildCustomerFacingBlogSections(params: {
  primaryService: string;
  businessName: string;
  serviceArea: string;
  summary?: string | null;
  whyBullets?: string[] | null;
}) {
  const service = params.primaryService.toLowerCase();

  return [
    {
      heading: `Common signs you may need ${service}`,
      body: `Homeowners often notice recurring issues, reduced performance, unusual sounds, inconsistent operation, or visible warning signs before they realize they need ${service}. Catching those signs early can make the problem easier and less expensive to address.`,
    },
    {
      heading: `Why acting early matters`,
      body: `When service issues are ignored, they can become more disruptive, more expensive, and harder to resolve. Taking action early usually helps protect comfort, safety, property condition, and overall system performance.`,
    },
    {
      heading: `How ${params.businessName} helps homeowners in ${params.serviceArea}`,
      body: `${params.businessName} helps homeowners across ${params.serviceArea} with professional ${service}, clear recommendations, and practical next steps based on the condition of the property and the urgency of the issue.`,
    },
  ];
}

async function buildStructuredBlogAsset(params: {
  title?: string | null;
  businessName?: string | null;
  serviceArea?: string | null;
  primaryService?: string | null;
  summary?: string | null;
  whyBullets?: string[] | null;
  cta?: string | null;
  imageKey?: string | null;
  imageMode?: "SERVICE_IMAGE" | "LOGO" | null;
  industry?: string | null;
}) {
  const serviceName = params.primaryService ?? "local service";
  const businessName = params.businessName ?? "This business";
  const serviceArea = params.serviceArea ?? "your area";

  // 🔥 NEW: Try AI generation first
  const aiBlog = await generateBlogWithAI({
    businessName,
    serviceName,
    serviceArea,
  });

  // ✅ SUCCESS PATH (AI worked)
  if (aiBlog) {
    return JSON.stringify({
      kind: "BLOG",
      title: aiBlog.title,
      excerpt: aiBlog.excerpt,
      introduction: aiBlog.introduction,
      sections: aiBlog.sections,
      cta: aiBlog.cta ?? "Book now",
      imageKey: params.imageKey ?? "general-service",
      imageMode: params.imageMode ?? "SERVICE_IMAGE",
      industry: params.industry ?? "plumbing",
    });
  }

  // 🛟 FALLBACK (existing deterministic logic)
  return JSON.stringify({
    kind: "BLOG",
    title: `${serviceName} Guide for Homeowners in ${serviceArea}`,
    excerpt: `What homeowners in ${serviceArea} should know about ${serviceName.toLowerCase()}.`,
    introduction: `If you need ${serviceName.toLowerCase()} in ${serviceArea}, it helps to understand the early warning signs and when it makes sense to bring in a professional.`,
    sections: [
      {
        heading: `Common signs you may need ${serviceName.toLowerCase()}`,
        body: `Homeowners often notice recurring issues, reduced performance, unusual sounds, or visible warning signs before realizing they need ${serviceName.toLowerCase()}.`,
      },
      {
        heading: `Why acting early matters`,
        body: `When issues are ignored, they can become more disruptive and more expensive. Acting early usually helps protect your home and avoid bigger repairs.`,
      },
      {
        heading: `How ${businessName} helps homeowners in ${serviceArea}`,
        body: `${businessName} helps homeowners across ${serviceArea} with professional ${serviceName.toLowerCase()} service and clear next steps.`,
      },
    ],
    cta: params.cta ?? "Book now",
    imageKey: params.imageKey ?? "general-service",
    imageMode: params.imageMode ?? "SERVICE_IMAGE",
    industry: params.industry ?? "plumbing",
  });
}

function shouldInvalidateOpportunitySnapshotOnCampaignCreate(_: {
  campaignOrigin: "recommendation" | "nl_custom";
  consumesRecommendationSlot: boolean;
}): boolean {
  return false;
}

function buildBroadServiceSyntheticOpportunity(params: {
  industry: string;
  profile: {
    serviceArea: string;
    averageJobValue: unknown;
    servicePricingJson?: unknown;
  };
}): ResolvedOpportunity {
  const descriptor = getBroadServiceDescriptor(params.industry);
  const opportunityType: OpportunityType = "LOCAL_SEARCH_SPIKE";

  const resolvedJobValue = resolveSyntheticJobValue({
    profile: params.profile,
    familyKey: descriptor.familyKey,
    serviceName: descriptor.serviceName,
    primaryService: descriptor.serviceName,
  });

  return {
    opportunityKey: buildSyntheticOpportunityKey({
      serviceName: descriptor.serviceName,
      opportunityType,
      bestMove: descriptor.displayMoveLabel,
    }),
    familyKey: descriptor.familyKey,
    title: `${descriptor.serviceName} Opportunity`,
    serviceName: descriptor.serviceName,
    opportunityType,
    bestMove: descriptor.displayMoveLabel,
    displayMoveLabel: descriptor.displayMoveLabel,
    displaySummary: descriptor.summary,
    imageKey: descriptor.imageKey,
    imageMode: "SERVICE_IMAGE",
    actionThesis: {
      familyKey: descriptor.familyKey,
      primaryService: descriptor.serviceName,
      angle: "broad service demand",
      title: descriptor.displayMoveLabel,
      summary: descriptor.summary,
      audience: `Homeowners in ${params.profile.serviceArea} who need ${descriptor.audienceLabel.toLowerCase()}`,
      offerHint: `Broad ${descriptor.serviceName.toLowerCase()} offer`,
      ctaHint: descriptor.ctaHint,
      imageKey: descriptor.imageKey,
      imageMode: "SERVICE_IMAGE",
    },
    recommendedCampaignType: "CUSTOM",
    jobsLow: 2,
    jobsHigh: 3,
    revenueLow: Math.round(resolvedJobValue * 2),
    revenueHigh: Math.round(resolvedJobValue * 3),
    rawOpportunityScore: 72,
    confidenceLabel: "Medium",
    confidenceScore: 72,
    whyNowBullets: [
      "The request is broad service demand, not a specific premium subservice.",
      "This keeps the action aligned to what the user actually asked for.",
      "A broad service campaign should use broad service framing and matching imagery.",
    ],
    whyThisMatters:
      "Broad service intent should remain broad instead of drifting into a specific high-ticket or narrow subservice.",
    sourceTags: ["Demand"],
    source: "generated",
    fitScore: 90,
  };
}

export async function createCampaignFromPrompt(
  prompt: string,
  options: CreateCampaignFromPromptOptions = {}
): Promise<CreateCampaignResult> {
  const cleanedPrompt = prompt.trim();

  if (cleanedPrompt.length < 10) {
    return {
      success: false,
      error: "Please enter a more specific request.",
    };
  }

  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const appUser = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      workspaces: {
        include: {
          workspace: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const workspace = appUser?.workspaces[0]?.workspace;

  if (!workspace || !workspace.onboardingCompletedAt) {
    return {
      success: false,
      error: "Complete onboarding before generating actions.",
    };
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    return {
      success: false,
      error: "Business profile not found.",
    };
  }

  const [competitors, performanceSignals] = await Promise.all([
    prisma.competitor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    }),
    getCampaignPerformanceSignals(workspace.id),
  ]);

  const engine = await buildRevenueOpportunityEngine({
    profile,
    competitors,
    performanceSignals,
  });

  const routedIntent = routePromptIntent(cleanedPrompt);

  const scoredExistingMatches = engine.rankedOpportunities
    .map((opportunity) => ({
      opportunity,
      fitScore: scoreExistingOpportunityFit(
        cleanedPrompt,
        opportunity,
        routedIntent
      ),
    }))
    .sort(
      (a, b) =>
        b.fitScore - a.fitScore ||
        b.opportunity.rawOpportunityScore - a.opportunity.rawOpportunityScore
    );

    const bestExistingMatch = scoredExistingMatches[0] ?? null;
  const strongMatchThreshold = getStrongMatchThreshold(routedIntent.lane);
  const forcedOpportunity = options.linkedOpportunity ?? null;

  const requestedService = extractRequestedServiceLabel(cleanedPrompt);
  const inferredIndustry = inferIndustryFromContext({
    prompt: cleanedPrompt,
    familyKey: requestedService ? slugify(requestedService) : null,
    serviceName: requestedService,
  });

  const broadServiceIntent =
    routedIntent.lane === "SERVICE" &&
    isBroadServiceIntent({
      prompt: cleanedPrompt,
      industry: inferredIndustry,
      requestedService,
    });

  const shouldRejectSpecificExistingMatch =
    broadServiceIntent &&
    bestExistingMatch &&
    isSpecificSubserviceFamily({
      familyKey: bestExistingMatch.opportunity.familyKey,
      industry: inferredIndustry,
    });

  const resolvedOpportunity: ResolvedOpportunity =
    forcedOpportunity ??
        (bestExistingMatch &&
    bestExistingMatch.fitScore >= strongMatchThreshold &&
    !shouldRejectSpecificExistingMatch
      ? {
          opportunityKey: bestExistingMatch.opportunity.opportunityKey,
          familyKey: bestExistingMatch.opportunity.familyKey,
          title: bestExistingMatch.opportunity.title,
          serviceName: bestExistingMatch.opportunity.serviceName,
          opportunityType: bestExistingMatch.opportunity.opportunityType,
          bestMove: bestExistingMatch.opportunity.bestMove,
          displayMoveLabel: bestExistingMatch.opportunity.displayMoveLabel,
          displaySummary: bestExistingMatch.opportunity.displaySummary,
          imageKey: bestExistingMatch.opportunity.imageKey,
          imageMode: bestExistingMatch.opportunity.imageMode,
          actionThesis: bestExistingMatch.opportunity.actionThesis,
          recommendedCampaignType:
            bestExistingMatch.opportunity.recommendedCampaignType,
          jobsLow: bestExistingMatch.opportunity.jobsLow,
          jobsHigh: bestExistingMatch.opportunity.jobsHigh,
          revenueLow: bestExistingMatch.opportunity.revenueLow,
          revenueHigh: bestExistingMatch.opportunity.revenueHigh,
          rawOpportunityScore: bestExistingMatch.opportunity.rawOpportunityScore,
          confidenceLabel: bestExistingMatch.opportunity.confidenceLabel,
          confidenceScore: bestExistingMatch.opportunity.confidenceScore,
          whyNowBullets: bestExistingMatch.opportunity.whyNowBullets,
          whyThisMatters: bestExistingMatch.opportunity.whyThisMatters,
          sourceTags: bestExistingMatch.opportunity.sourceTags,
          source: "existing",
          fitScore: bestExistingMatch.fitScore,
        }
                  : broadServiceIntent
        ? buildBroadServiceSyntheticOpportunity({
            industry: inferredIndustry,
            profile: {
              serviceArea: profile.serviceArea,
              averageJobValue: profile.averageJobValue,
              servicePricingJson: profile.servicePricingJson,
            },
          })
        : buildSyntheticOpportunity({
            prompt: cleanedPrompt,
            routedIntent,
            profile: {
              businessName: profile.businessName,
              serviceArea: profile.serviceArea,
              averageJobValue: profile.averageJobValue,
              servicePricingJson: profile.servicePricingJson,
              hasFaqContent: profile.hasFaqContent,
              servicePageUrls: profile.servicePageUrls,
            },
          }));

  const refinedActionThesis = buildPromptRefinedActionThesis({
    prompt: cleanedPrompt,
    resolvedOpportunity,
    serviceArea: profile.serviceArea,
  });

  const systemPrompt = `
You are the MarketForge next-best-action planner for local home-service businesses.

Your job is to:
1. Parse the user's request.
2. Use the resolved opportunity for ranking context only.
3. Use the canonical action thesis below as the source of truth for the commercial move.
4. Generate one coherent action package where strategy, explanation, imagery guidance, and assets all describe the same move.

Critical rules:
- Do not drift back to a broader category if the action thesis is more specific.
- The action thesis is the source of truth for title, angle, audience, CTA, and image direction.
- Respect explicit user intent.
- Keep the language direct, commercial, and trustworthy.
- Avoid generic agency language.
- Avoid fake certainty.

Output rules:
- Always populate nextBestAction.
- Always populate actionThesis.
- Always populate actionPack.
- If the request is campaign-like, populate campaign.
- If the request is AEO/SEO-like, campaign may be null.
- actionThesis.title must align with the selected move.
- actionThesis.whyThisActionBullets must explain the chosen move, not just the broad family.
`.trim();

  const userPrompt = `
Business:
${profile.businessName}
Website: ${profile.website ?? "unknown"}
Phone: ${profile.phone ?? "unknown"}
City: ${profile.city}
State: ${profile.state ?? "unknown"}
Service area: ${profile.serviceArea}

User request:
${cleanedPrompt}

Detected intent:
${routedIntent.label}

Resolved opportunity source:
${resolvedOpportunity.source}

Resolved opportunity fit score:
${resolvedOpportunity.fitScore}

Resolved opportunity:
Title: ${resolvedOpportunity.title}
Family Key: ${resolvedOpportunity.familyKey}
Service: ${resolvedOpportunity.serviceName}
Type: ${resolvedOpportunity.opportunityType}
Display Move: ${resolvedOpportunity.displayMoveLabel}
Campaign Type: ${resolvedOpportunity.recommendedCampaignType}
Jobs: ${resolvedOpportunity.jobsLow}-${resolvedOpportunity.jobsHigh}
Revenue: ${resolvedOpportunity.revenueLow}-${resolvedOpportunity.revenueHigh}
MarketForge Action Score: ${resolvedOpportunity.rawOpportunityScore}
Signals: ${resolvedOpportunity.sourceTags.join(" | ")}
Why Now: ${resolvedOpportunity.whyNowBullets.join(" | ")}
Why This Matters: ${resolvedOpportunity.whyThisMatters}

Canonical action thesis:
Title: ${refinedActionThesis.title}
Primary Service: ${refinedActionThesis.primaryService}
Angle: ${refinedActionThesis.angle}
Summary: ${refinedActionThesis.summary}
Audience: ${refinedActionThesis.audience}
Offer Hint: ${refinedActionThesis.offerHint}
CTA Hint: ${refinedActionThesis.ctaHint}
Image Key: ${refinedActionThesis.imageKey}
Image Mode: ${refinedActionThesis.imageMode}
Why This Action Bullets: ${refinedActionThesis.whyThisActionBullets.join(" | ")}

Return a single structured next-best-action plan.
`.trim();

  const completion = await openai.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: zodResponseFormat(
      nlCampaignSchema,
      "marketforge_nl_campaign"
    ),
  });

  const parsed = completion.choices[0]?.message.parsed;

  if (!parsed) {
    return {
      success: false,
      error: "The AI response could not be parsed into an action plan.",
    };
  }

  const effectiveExecutionMode =
    routedIntent.mode === "CAMPAIGN"
      ? "CAMPAIGN"
      : routedIntent.mode === "ACTION_PACK"
        ? "ACTION_PACK"
        : parsed.nextBestAction.executionMode;

  const effectiveActionType =
    routedIntent.preferredActionType ?? parsed.nextBestAction.actionType;

    const effectiveActionThesis = {
    ...refinedActionThesis,
    ...parsed.actionThesis,
    familyKey: resolvedOpportunity.familyKey,
    imageKey: refinedActionThesis.imageKey,
    imageMode: refinedActionThesis.imageMode,
    whyThisActionBullets:
      parsed.actionThesis.whyThisActionBullets?.length > 0
        ? parsed.actionThesis.whyThisActionBullets
        : refinedActionThesis.whyThisActionBullets,
  };

  const campaignDraft =
    parsed.campaign ??
    buildFallbackCampaignFromResolvedOpportunity(
      resolvedOpportunity,
      { serviceArea: profile.serviceArea },
      effectiveActionThesis.title,
      effectiveActionThesis.summary,
      effectiveActionType,
      effectiveActionThesis
    );

  const estimatedRevenue = midpoint(
    resolvedOpportunity.revenueLow,
    resolvedOpportunity.revenueHigh
  );

  const estimatedBookedJobs = midpoint(
    resolvedOpportunity.jobsLow,
    resolvedOpportunity.jobsHigh
  );

  const estimatedLeads =
    estimatedBookedJobs != null
      ? Math.max(estimatedBookedJobs * 2, estimatedBookedJobs + 2)
      : null;

  const campaignName = campaignDraft.title || effectiveActionThesis.title;

  const campaignOrigin = options.campaignOrigin ?? "nl_custom";
  const consumesRecommendationSlot =
    options.consumesRecommendationSlot ?? false;

  const structuredIndustry = inferIndustryFromContext({
    prompt: cleanedPrompt,
    familyKey: resolvedOpportunity.familyKey,
    serviceName: effectiveActionThesis.primaryService,
  });

  const actionSpec = buildActionSpec({
  actionName: campaignName,
  targetService: campaignDraft.targetService,
  rawOffer: campaignDraft.offer,
  rawAudience:
    campaignDraft.audience ??
    effectiveActionThesis.audience ??
    resolvedOpportunity.actionThesis.audience,
  cta: campaignDraft.cta,
  actionSummary: effectiveActionThesis.summary,
  actionType: effectiveActionType,
  routedLane: routedIntent.lane,
  opportunityType: resolvedOpportunity.opportunityType,
  campaignType: campaignDraft.campaignType,
  serviceArea: profile.serviceArea,
  averageJobValue:
    profile.averageJobValue != null
      ? Number(profile.averageJobValue)
      : null,
});

let refinedTargeting = null;

try {
  refinedTargeting = await refineTargetingWithAI({
    service: actionSpec.targetService,
    serviceArea: profile.serviceArea,
    demandType: actionSpec.targeting.base.service.demandType,
    intentLevel: actionSpec.targeting.intent.level,
    jobValueTier: actionSpec.targeting.economics.jobValueTier,
    existingKeywordThemes:
      actionSpec.targeting.platforms.googleAds.keywordThemes,
    existingNegativeKeywords:
      actionSpec.targeting.wasteControls.negativeKeywordThemes,
  });
} catch (e) {
  console.error("Targeting AI refinement failed", e);
}

if (refinedTargeting) {
  if (Array.isArray(refinedTargeting.keywordThemes)) {
  const baseKeywords =
  actionSpec.targeting.platforms.googleAds.keywordThemes;

if (Array.isArray(refinedTargeting.keywordThemes)) {
  const cleaned = refinedTargeting.keywordThemes
    .map((k: string) => k.toLowerCase().trim())
    .filter((k: string) => k.length > 0)
    .filter((k: string) => !k.includes("service service"))
    .filter((k: string) => k.split(" ").length <= 5);

  const allKeywords = Array.from(new Set([...baseKeywords, ...cleaned]));

  // Intent scoring
  const scored = allKeywords.map((k) => {
    let score = 1;

    if (k.includes("near me")) score += 3;
    if (k.includes("emergency") || k.includes("urgent")) score += 3;
    if (k.includes("cost") || k.includes("quote")) score += 2;
    if (k.includes("company") || k.includes("service")) score += 1;

    return { keyword: k, score };
  });

  // Sort by intent score
  const sorted = scored
    .sort((a, b) => b.score - a.score)
    .map((k) => k.keyword);

  // Keep top 6 highest intent keywords
  actionSpec.targeting.platforms.googleAds.keywordThemes =
    sorted.slice(0, 6);
}
  }

  if (Array.isArray(refinedTargeting.negativeKeywords)) {
    if (Array.isArray(refinedTargeting.negativeKeywords)) {
  actionSpec.targeting.wasteControls.negativeKeywordThemes = Array.from(
    new Set([
      ...actionSpec.targeting.wasteControls.negativeKeywordThemes,
      ...refinedTargeting.negativeKeywords.map((k: string) =>
        k.toLowerCase().trim()
      ),
    ])
  );
}
  }

  if (Array.isArray(refinedTargeting.metaNotes)) {
    actionSpec.targeting.platforms.meta.notes = [
      ...actionSpec.targeting.platforms.meta.notes,
      ...refinedTargeting.metaNotes,
    ];
  }

  if (Array.isArray(refinedTargeting.refinementNotes)) {
    actionSpec.targeting.summary.notes = [
      ...actionSpec.targeting.summary.notes,
      ...refinedTargeting.refinementNotes,
    ];
  }
}

      const reviewAction = isReviewActionType({
    actionType: effectiveActionType,
    campaignType: campaignDraft.campaignType,
    routedLane: routedIntent.lane,
  });

  const visibilityAction = isVisibilityActionType({
    actionType: effectiveActionType,
    campaignType: campaignDraft.campaignType,
    routedLane: routedIntent.lane,
    opportunityType: resolvedOpportunity.opportunityType,
  });

  const isOfferAction = actionSpec.offerType !== "none";

  const includedAssetTypes = getAssetTypesForAction({
    executionMode: effectiveExecutionMode,
    actionType: effectiveActionType,
    campaignType: campaignDraft.campaignType,
    routedLane: routedIntent.lane,
    opportunityType: resolvedOpportunity.opportunityType,
  });

    const generatedAdCopy = await generateAdCopyWithAI({
    businessName: profile.businessName,
    serviceArea: profile.serviceArea,
    targetService: effectiveActionThesis.primaryService,
    actionTitle: effectiveActionThesis.title,
    actionSummary: effectiveActionThesis.summary,
    targetAudience: actionSpec.targetAudience,
    offer: campaignDraft.offer,
    cta: effectiveActionThesis.ctaHint,
    isReviewAction: reviewAction,
    isVisibilityAction: visibilityAction,
    isOfferAction,
  });

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      recommendationId: null,
      revenueOpportunityId: null,
      name: actionSpec.actionName,
      campaignType: campaignDraft.campaignType,
      objective: campaignDraft.objective,
      targetService: actionSpec.targetService,
      offer: actionSpec.offerLabel,
      audience: actionSpec.targetAudience,
      serviceArea: profile.serviceArea,
      estimatedLeads,
      estimatedBookedJobs,
      estimatedRevenue,
      status: "DRAFT",
      qualityReviewStatus: "PENDING",
      briefJson: {
        userPrompt: cleanedPrompt,
        parsedIntent: parsed.parsedIntent,
        campaignOrigin,
        consumesRecommendationSlot,
        opportunityCheck: {
          ...parsed.opportunityCheck,
          matchedOpportunityTitle: resolvedOpportunity.title,
          matchedRecommendationTitle: resolvedOpportunity.displayMoveLabel,
          confidenceScore: resolvedOpportunity.rawOpportunityScore,
          whyNowBullets: resolvedOpportunity.whyNowBullets,
          sourceTags: resolvedOpportunity.sourceTags,
          whyThisMatters: resolvedOpportunity.whyThisMatters,
        },
        actionThesis: effectiveActionThesis,
        nextBestAction: {
          ...parsed.nextBestAction,
          executionMode: effectiveExecutionMode,
          actionType: effectiveActionType,
          title: effectiveActionThesis.title,
          summary: effectiveActionThesis.summary,
        },
        actionPack: parsed.actionPack,
        actionSpec,
        campaignDraft: {
          ...campaignDraft,
          offer: actionSpec.offerLabel,
          audience: actionSpec.targetAudience,
          cta: actionSpec.cta,
        },
        creativeGuidance: campaignDraft.creativeGuidance,
        matchedOpportunityKey: consumesRecommendationSlot
          ? resolvedOpportunity.opportunityKey
          : null,
        matchedOpportunityTitle: consumesRecommendationSlot
          ? resolvedOpportunity.title
          : null,
        matchedOpportunitySource: resolvedOpportunity.source,
        matchedOpportunityFitScore: resolvedOpportunity.fitScore,
        matchedFamilyKey: consumesRecommendationSlot
          ? resolvedOpportunity.familyKey
          : null,
        displayMoveLabel: resolvedOpportunity.displayMoveLabel,
        displaySummary: resolvedOpportunity.displaySummary,
        imageKey: effectiveActionThesis.imageKey,
        imageMode: effectiveActionThesis.imageMode,
        estimatedRange: {
          jobsLow: resolvedOpportunity.jobsLow,
          jobsHigh: resolvedOpportunity.jobsHigh,
          revenueLow: resolvedOpportunity.revenueLow,
          revenueHigh: resolvedOpportunity.revenueHigh,
        },
        marketForgeActionScore: resolvedOpportunity.rawOpportunityScore,
        routedIntent: routedIntent.label,
        routedLane: routedIntent.lane,
        structuredIndustry,
        generatedAt: new Date().toISOString(),
      },
    },
  });

  const googleBusinessImage = shouldGenerateAiImage({
    assetType: "GOOGLE_BUSINESS",
    imageMode: effectiveActionThesis.imageMode,
    isReviewAction: reviewAction,
    isVisibilityAction: visibilityAction,
  })
    ? await generateAndStoreCampaignImage({
        campaignId: campaign.id,
        assetType: "GOOGLE_BUSINESS",
        businessName: profile.businessName,
        serviceArea: profile.serviceArea,
        targetService: effectiveActionThesis.primaryService,
        actionTitle: effectiveActionThesis.title,
        actionSummary: effectiveActionThesis.summary,
        audience: actionSpec.targetAudience,
        offer: campaignDraft.offer,
        cta: actionSpec.cta,
      })
    : {
        url: null,
        prompt: null,
        status: "skipped" as const,
        mimeType: null,
      };

    const metaImage = shouldGenerateAiImage({
    assetType: "META",
    imageMode: effectiveActionThesis.imageMode,
    isReviewAction: reviewAction,
    isVisibilityAction: visibilityAction,
  })
    ? await generateAndStoreCampaignImage({
        campaignId: campaign.id,
        assetType: "META",
        businessName: profile.businessName,
        serviceArea: profile.serviceArea,
        targetService: effectiveActionThesis.primaryService,
        actionTitle: effectiveActionThesis.title,
        actionSummary: effectiveActionThesis.summary,
        audience: actionSpec.targetAudience,
        offer: campaignDraft.offer,
        cta: actionSpec.cta,
      })
    : {
        url: null,
        prompt: null,
        status: "skipped" as const,
        mimeType: null,
      };

  const googleAdsImage = shouldGenerateAiImage({
    assetType: "GOOGLE_ADS",
    imageMode: effectiveActionThesis.imageMode,
    isReviewAction: reviewAction,
    isVisibilityAction: visibilityAction,
  })
    ? await generateAndStoreCampaignImage({
        campaignId: campaign.id,
        assetType: "GOOGLE_ADS",
        businessName: profile.businessName,
        serviceArea: profile.serviceArea,
        targetService: effectiveActionThesis.primaryService,
        actionTitle: effectiveActionThesis.title,
        actionSummary: effectiveActionThesis.summary,
        audience: actionSpec.targetAudience,
        offer: campaignDraft.offer,
        cta: actionSpec.cta,
      })
    : {
        url: null,
        prompt: null,
        status: "skipped" as const,
        mimeType: null,
      };

    const assetData: Array<{
    campaignId: string;
    assetType: AssetType;
    title: string;
    content: string;
    aiImageUrl?: string | null;
    aiImagePrompt?: string | null;
    aiImageStatus?: string | null;
    aiImageMimeType?: string | null;
  }> = [];

    if (includedAssetTypes.includes("GOOGLE_BUSINESS")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "GOOGLE_BUSINESS",
      title:
        effectiveExecutionMode === "ACTION_PACK"
          ? "Google Business Action Draft"
          : "Google Business Post",
      content: buildStructuredGoogleBusinessAsset({
        title: generatedAdCopy?.googleBusiness?.title ?? effectiveActionThesis.title,
        summary:
          generatedAdCopy?.googleBusiness?.description ??
          buildGoogleBusinessDescriptionFromAction({
            actionSummary: effectiveActionThesis.summary,
            serviceArea: profile.serviceArea,
            cta: effectiveActionThesis.ctaHint,
            offer: campaignDraft.offer,
            isReviewAction: reviewAction,
            isVisibilityAction: visibilityAction,
            targetService: effectiveActionThesis.primaryService,
          }),
        cta: generatedAdCopy?.googleBusiness?.cta ?? effectiveActionThesis.ctaHint,
        offer: sanitizeCustomerFacingOffer(campaignDraft.offer),
        imageKey: effectiveActionThesis.imageKey,
        imageMode: effectiveActionThesis.imageMode,
        industry: structuredIndustry,
        serviceArea: profile.serviceArea,
      }),
      aiImageUrl: googleBusinessImage.url,
      aiImagePrompt: googleBusinessImage.prompt,
      aiImageStatus: googleBusinessImage.status,
      aiImageMimeType: googleBusinessImage.mimeType,
    });
  }

    if (includedAssetTypes.includes("META")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "META",
      title:
        effectiveExecutionMode === "ACTION_PACK"
          ? "Meta Action Draft"
          : "Meta Ad Copy",
      content: buildStructuredMetaAsset({
        headline:
          generatedAdCopy?.meta?.headline ??
          buildMetaHeadline({
            actionTitle: effectiveActionThesis.title,
            targetService: effectiveActionThesis.primaryService,
            isReviewAction: reviewAction,
            isVisibilityAction: visibilityAction,
          }),
        primaryText:
          generatedAdCopy?.meta?.primaryText ??
          buildMetaPrimaryTextFromAction({
            actionSummary: effectiveActionThesis.summary,
            serviceArea: profile.serviceArea,
            cta: effectiveActionThesis.ctaHint,
            offer: campaignDraft.offer,
            isReviewAction: reviewAction,
            isVisibilityAction: visibilityAction,
            targetService: effectiveActionThesis.primaryService,
          }),
        cta: generatedAdCopy?.meta?.cta ?? effectiveActionThesis.ctaHint,
        offer: sanitizeCustomerFacingOffer(campaignDraft.offer),
        imageKey: effectiveActionThesis.imageKey,
        imageMode: effectiveActionThesis.imageMode,
        industry: structuredIndustry,
        serviceArea: profile.serviceArea,
      }),
      aiImageUrl: metaImage.url,
      aiImagePrompt: metaImage.prompt,
      aiImageStatus: metaImage.status,
      aiImageMimeType: metaImage.mimeType,
    });
  }

    if (includedAssetTypes.includes("GOOGLE_ADS")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "GOOGLE_ADS",
      title: "Google Ads Copy",
      content: formatGoogleAds(
        generatedAdCopy?.googleAds ?? parsed.assets.googleAds
      ),
      aiImageUrl: googleAdsImage.url,
      aiImagePrompt: googleAdsImage.prompt,
      aiImageStatus: googleAdsImage.status,
      aiImageMimeType: googleAdsImage.mimeType,
    });
  }

  if (includedAssetTypes.includes("YELP")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "YELP",
      title: "Yelp Ad Copy",
            content: formatYelp(generatedAdCopy?.yelp ?? parsed.assets.yelpAd),
    });
  }

    if (includedAssetTypes.includes("EMAIL")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "EMAIL",
      title: reviewAction
        ? "Review Request Email"
        : parsed.assets.emailCampaign.subjectLine ?? "Email Campaign",
      content: buildEmailAssetFromAction({
        actionTitle: effectiveActionThesis.title,
        actionSummary: effectiveActionThesis.summary,
        cta: effectiveActionThesis.ctaHint,
        targetService: effectiveActionThesis.primaryService,
        serviceArea: profile.serviceArea,
        isReviewAction: reviewAction,
        isVisibilityAction: visibilityAction,
        isOfferAction,
        industry: structuredIndustry,
      }),
    });
  }

  if (includedAssetTypes.includes("BLOG")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "BLOG",
      title:
        effectiveExecutionMode === "ACTION_PACK"
          ? parsed.actionPack.actionTitle ?? "Blog Article"
          : "Blog Article",
      content: await buildStructuredBlogAsset({
        title:
          effectiveExecutionMode === "ACTION_PACK"
            ? parsed.actionPack.actionTitle ?? effectiveActionThesis.title
            : effectiveActionThesis.title,
        businessName: profile.businessName,
        serviceArea: profile.serviceArea,
        primaryService: effectiveActionThesis.primaryService,
                summary: cleanInternalMarketingLanguage(
          generatedAdCopy?.googleBusiness?.description ?? effectiveActionThesis.summary
        ),
        whyBullets: effectiveActionThesis.whyThisActionBullets ?? [],
        cta: effectiveActionThesis.ctaHint,
        imageKey: effectiveActionThesis.imageKey,
        imageMode: effectiveActionThesis.imageMode,
        industry: structuredIndustry,
      }),
    });
  }

  if (includedAssetTypes.includes("AEO_FAQ")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "AEO_FAQ",
      title: "AEO FAQ",
      content: formatFaq(parsed.assets.aeoFaq),
    });
  }

  if (includedAssetTypes.includes("ANSWER_SNIPPET")) {
    assetData.push({
      campaignId: campaign.id,
      assetType: "ANSWER_SNIPPET",
      title: "Answer Snippet",
      content: parsed.assets.answerSnippet,
    });
  }

  await prisma.campaignAsset.createMany({
    data: assetData,
  });

  if (consumesRecommendationSlot) {
    const shouldInvalidateOnCreate = shouldInvalidateOpportunitySnapshotOnCampaignCreate(
      {
        campaignOrigin,
        consumesRecommendationSlot,
      }
    );

    if (shouldInvalidateOnCreate) {
      await invalidateWorkspaceOpportunitySnapshot(workspace.id);
    }
  }

  return {
    success: true,
    campaignId: campaign.id,
    campaignName: campaign.name,
  };
}

export async function createCampaignFromOpportunity(
  opportunityKey: string
): Promise<CreateCampaignResult> {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    return {
      success: false,
      error: "You must be signed in.",
    };
  }

  const appUser = await prisma.user.findUnique({
    where: { clerkUserId },
    include: {
      workspaces: {
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const workspace = appUser?.workspaces[0]?.workspace;

  if (!workspace || !workspace.onboardingCompletedAt) {
    return {
      success: false,
      error: "Complete onboarding before generating actions.",
    };
  }

  const snapshot = await prisma.workspaceOpportunitySnapshot.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!snapshot) {
    return {
      success: false,
      error: "Opportunity snapshot not found.",
    };
  }

  const topOpportunity = snapshot.topOpportunityJson as ResolvedOpportunity | null;
  const backlog = Array.isArray(snapshot.backlogJson)
    ? (snapshot.backlogJson as ResolvedOpportunity[])
    : [];

  const allOpportunities = [topOpportunity, ...backlog].filter(
    Boolean
  ) as ResolvedOpportunity[];

  const matched = allOpportunities.find(
    (opportunity) => opportunity.opportunityKey === opportunityKey
  );

  if (!matched) {
    return {
      success: false,
      error: "Selected opportunity could not be found.",
    };
  }

  const existingCampaign = await prisma.campaign.findFirst({
    where: {
      workspaceId: workspace.id,
      briefJson: {
        path: ["matchedOpportunityKey"],
        equals: matched.opportunityKey,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existingCampaign) {
    return {
      success: true,
      campaignId: existingCampaign.id,
      campaignName: existingCampaign.name,
    };
  }

  const prompt = `${matched.actionThesis.title}. ${matched.actionThesis.summary}`;

  return createCampaignFromPrompt(prompt, {
    linkedOpportunity: matched,
    campaignOrigin: "recommendation",
    consumesRecommendationSlot: true,
  });
}