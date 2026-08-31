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
import type { BusinessProfile, Prisma } from "@/generated/prisma";
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

export type PromptReadinessResult =
  | {
      ready: true;
    }
  | {
      ready: false;
      title: string;
      message: string;
      requirements: string[];
      examplePrompt: string;
      redirectHref?: string;
      redirectLabel?: string;
      isRoutingNotice?: boolean;
    };

type CreateCampaignResult =
  | { success: true; campaignId: string; campaignName: string }
  | { success: false; error: string }
  | {
      success: false;
      needsInput: true;
      title: string;
      message: string;
      requirements: string[];
      examplePrompt: string;
    };

function toPrismaJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

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
  | "REVIEWS"
  | "GENERAL";

type ResidentialOwnerObjective =
  | "STANDARD_SERVICE_GROWTH"
  | "COMPETITIVE_ACQUISITION"
  | "EDUCATION_PREPAREDNESS"
  | "POSITIONING_TRUST"
  | "RETENTION_REACTIVATION"
  | "REFERRAL_GROWTH"
  | "CROSS_SELL_UPSELL"
  | "REVIEW_GENERATION";

type ResolvedOwnerObjective = {
  objective: ResidentialOwnerObjective;
  confidence: "high" | "default";
  matchedSignals: string[];
};

type RoutedIntent = {
  lane: PromptLane;
  mode: "CAMPAIGN" | "ACTION_PACK" | "AUTO";
  ownerObjective: ResidentialOwnerObjective;
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

type PromotionalVerificationStatus =
  | "none"
  | "user_verified"
  | "search_verified"
  | "user_claimed_unverified"
  | "unverified";

type PromotionalContext = {
  promotedBrand: string | null;
  promotedProduct: string | null;
  promotedService: string | null;
  incentiveType:
    | "rebate"
    | "financing"
    | "discount"
    | "supplier_incentive"
    | "inventory_push"
    | "seasonal_promotion"
    | "premium_product_push"
    | "other"
    | "none"
    | null;
  incentiveDetails: string | null;
  incentiveValue: string | null;
  timeConstraint: string | null;
  verificationStatus: PromotionalVerificationStatus;
  sourceType:
    | "user_provided"
    | "manufacturer_official"
    | "distributor_official"
    | "utility_or_government"
    | "search_result"
    | "none"
    | null;
  sourceSummary: string | null;
  customerFacingOffer: string | null;
  usageRule: string;
  enrichmentNotes: string[];
};

function normalizePromotionalContext(
  context?: Partial<PromotionalContext> | null
): PromotionalContext {
  return {
    promotedBrand: context?.promotedBrand ?? null,
    promotedProduct: context?.promotedProduct ?? null,
    promotedService: context?.promotedService ?? null,
    incentiveType: context?.incentiveType ?? "none",
    incentiveDetails: context?.incentiveDetails ?? null,
    incentiveValue: context?.incentiveValue ?? null,
    timeConstraint: context?.timeConstraint ?? null,
    verificationStatus: context?.verificationStatus ?? "none",
    sourceType: context?.sourceType ?? "none",
    sourceSummary: context?.sourceSummary ?? null,
    customerFacingOffer: context?.customerFacingOffer ?? null,
    usageRule:
      context?.usageRule ??
      "Do not invent rebate values, financing terms, expiration dates, eligibility rules, or manufacturer relationship claims.",
    enrichmentNotes: context?.enrichmentNotes ?? [],
  };
}

function shouldAttemptPromotionalEnrichment(context: PromotionalContext) {
  if (context.verificationStatus === "user_verified") return false;

  const hasBrandOrProduct = Boolean(
    context.promotedBrand || context.promotedProduct || context.promotedService
  );

  const hasIncentiveIntent =
    context.incentiveType != null && context.incentiveType !== "none";

  const missingSpecificTerms =
    !context.incentiveValue || !context.timeConstraint || !context.incentiveDetails;

  return hasBrandOrProduct && hasIncentiveIntent && missingSpecificTerms;
}

function safeParsePromotionalContext(value: string): Partial<PromotionalContext> | null {
  try {
    return JSON.parse(value) as Partial<PromotionalContext>;
  } catch {
    return null;
  }
}

async function enrichPromotionalContext(params: {
  initialContext: PromotionalContext;
  userPrompt: string;
  businessName: string;
  serviceArea: string;
  city: string | null;
  state: string | null;
}) {
  const initialContext = normalizePromotionalContext(params.initialContext);

  if (!shouldAttemptPromotionalEnrichment(initialContext)) {
    return initialContext;
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1",
      tools: [{ type: "web_search" }],
      input: `
You are verifying promotional context for a local service business campaign.

Business: ${params.businessName}
Service Area: ${params.serviceArea}
City: ${params.city ?? "unknown"}
State: ${params.state ?? "unknown"}

User request:
${params.userPrompt}

Initial promotional context:
${JSON.stringify(initialContext, null, 2)}

Task:
Search for official, currently relevant promotional information related to the brand/product/service/incentive above.

Use ONLY reliable sources such as:
- manufacturer official websites
- official rebate centers
- distributor official websites
- utility or government rebate pages

Return JSON ONLY with this shape:
{
  "promotedBrand": string | null,
  "promotedProduct": string | null,
  "promotedService": string | null,
  "incentiveType": "rebate" | "financing" | "discount" | "supplier_incentive" | "inventory_push" | "seasonal_promotion" | "premium_product_push" | "other" | "none" | null,
  "incentiveDetails": string | null,
  "incentiveValue": string | null,
  "timeConstraint": string | null,
  "verificationStatus": "search_verified" | "user_claimed_unverified" | "unverified",
  "sourceType": "manufacturer_official" | "distributor_official" | "utility_or_government" | "search_result" | "none" | null,
  "sourceSummary": string | null,
  "customerFacingOffer": string | null,
  "usageRule": string,
  "enrichmentNotes": string[]
}

Critical rules:
- Do not invent values.
- Do not invent expiration dates.
- Do not invent APR, monthly payment, or financing terms.
- Do not claim the business is an authorized dealer unless the user explicitly said so.
- If exact terms are not verified, set verificationStatus to "user_claimed_unverified".
- If using a verified value, customerFacingOffer must use cautious wording such as "up to", "qualifying systems", "ask about", or "available offers".
- If not verified, customerFacingOffer must avoid exact values and deadlines.
`,
    });

    const outputText =
      typeof response.output_text === "string" ? response.output_text : "";

    const enriched = safeParsePromotionalContext(outputText);

    if (!enriched) {
      return {
        ...initialContext,
        verificationStatus: "user_claimed_unverified" as const,
        customerFacingOffer:
          initialContext.customerFacingOffer ??
          buildFallbackPromotionalOffer(initialContext),
        usageRule:
          "The user mentioned a promotion or incentive, but exact terms were not verified. Use cautious language and do not include specific values, deadlines, APRs, or eligibility claims.",
        enrichmentNotes: [
          ...initialContext.enrichmentNotes,
          "Promotional enrichment ran, but the response could not be parsed safely.",
        ],
      };
    }

    return normalizePromotionalContext({
      ...initialContext,
      ...enriched,
      enrichmentNotes: [
        ...initialContext.enrichmentNotes,
        ...(enriched.enrichmentNotes ?? []),
      ],
    });
  } catch (error) {
    console.error("[promotional-context] enrichment failed", error);

    return {
      ...initialContext,
      verificationStatus: "user_claimed_unverified" as const,
      customerFacingOffer:
        initialContext.customerFacingOffer ??
        buildFallbackPromotionalOffer(initialContext),
      usageRule:
        "The user mentioned a promotion or incentive, but enrichment failed. Use cautious language and do not include specific values, deadlines, APRs, or eligibility claims.",
      enrichmentNotes: [
        ...initialContext.enrichmentNotes,
        "Promotional enrichment failed; falling back to user-claimed unverified language.",
      ],
    };
  }
}

function buildFallbackPromotionalOffer(context: PromotionalContext) {
  const brandOrProduct =
    context.promotedBrand ??
    context.promotedProduct ??
    context.promotedService ??
    "this service";

  if (context.incentiveType === "financing") {
    return `Ask about available financing options for ${brandOrProduct}`;
  }

  if (context.incentiveType === "rebate") {
    return `Ask about available rebates for ${brandOrProduct}`;
  }

    if (context.incentiveType && context.incentiveType !== "none") {
    return `Ask about current offers for ${brandOrProduct}`;
  }

  return null;
}

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

type GeneratedArticle = {
  title: string;
  excerpt: string;
  introduction: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  cta: string;
};

type ActionSeoStrategy = {
  primarySearchTheme: string;
  secondaryKeywordThemes: string[];
  searchIntent: string;
  targetService: string;
  targetGeography: string;
  offerContext: string | null;
  recommendedPageFocus: string;
  titleTag: string;
  metaDescription: string;
  h1Recommendation: string;
  suggestedSlug: string;
  internalLinkTargets: string[];
  supportingQuestions: string[];
  contentSupportNotes: string[];
};

type GeneratedRevenueContentPackage = {
  actionSeoStrategy: ActionSeoStrategy;
  consumerArticle: GeneratedArticle;
  knowledgeArticle: GeneratedArticle;
};

async function generateRevenueContentPackageWithAI(params: {
  ownerObjective: ResidentialOwnerObjective;
  businessName: string;
  serviceName: string;
  serviceArea: string;
  actionTitle: string;
  actionSummary: string;
  targetAudience: string;
  offer?: string | null;
  cta?: string | null;
}): Promise<GeneratedRevenueContentPackage | null> {
  try {
    const prompt = `
You are creating the organic-search and website-content package that supports one revenue action for a local service business.

BUSINESS
Business: ${params.businessName}
Service: ${params.serviceName}
Service Area: ${params.serviceArea}

REVENUE ACTION
Action Title: ${params.actionTitle}
Action Summary: ${params.actionSummary}
Target Audience: ${params.targetAudience}
Offer / Promotional Context: ${params.offer ?? "None"}
CTA: ${params.cta ?? "None"}
Owner Objective: ${params.ownerObjective}

Owner-objective guidance:
${getAssetCopyGuidance(params.ownerObjective)}

You must create THREE DISTINCT OUTPUTS:

1. ACTION-LEVEL SEO STRATEGY
2. CONSUMER ARTICLE
3. KNOWLEDGE / AUTHORITY ARTICLE

==================================================
1. ACTION-LEVEL SEO STRATEGY
==================================================

The SEO strategy belongs to the REVENUE ACTION itself.

It does NOT belong to either article.

Its purpose is to make the service, problem, offer, commercial need, and local relevance represented by the revenue action easier to discover through traditional keyword-based search engines.

Base the SEO strategy on:
- the service being promoted
- the actual revenue action
- the homeowner need behind the action
- the target geography
- the target audience
- the offer or promotional enhancer when one exists and is safe to use

The SEO strategy should determine:
- the primary commercial search theme
- closely related secondary keyword themes
- the search intent being targeted
- the service and geography being targeted
- whether verified offer context should appear
- which existing or new website page should carry the strongest commercial focus
- recommended title tag
- recommended meta description
- recommended H1
- suggested URL slug
- useful internal-link targets
- homeowner questions that support the commercial topic
- how the Consumer Article and Knowledge / Authority Article can support the action without replacing the primary commercial page

Critical SEO rules:
- Do NOT base the SEO strategy on the Consumer Article title.
- Do NOT base the SEO strategy on the Knowledge Article title.
- Do NOT make the articles the primary SEO target unless the action itself genuinely calls for an informational page.
- Prefer commercially relevant search intent when the revenue action is promotional or service-driven.
- Do not invent keyword volume.
- Do not invent search volume.
- Do not invent keyword difficulty.
- Do not invent ranking position.
- Do not invent traffic estimates.
- Do not claim SEO outcomes.
- Do not create repetitive city/service keyword permutations.
- Do not keyword-stuff.
- Offer context must only use information supplied in the action.

==================================================
2. CONSUMER ARTICLE
==================================================

Purpose:
Help a homeowner understand the service, recognize when they may need it, make an informed decision, and know what reasonable next step to take.

Requirements:
- Write directly for homeowners.
- Be practical, useful, and easy to understand.
- Address signs, situations, decisions, tradeoffs, or next steps.
- Support the revenue action without sounding like an advertisement.
- Naturally answer useful homeowner questions.
- Keep the topic tightly related to the commercial action.
- Use a CTA appropriate to the owner objective.

==================================================
3. KNOWLEDGE / AUTHORITY ARTICLE
==================================================

Purpose:
Create deeper subject-matter content around the same service or problem so the website demonstrates meaningful topical depth and provides useful factual context to customers, search systems, and AI systems.

Requirements:
- Use a meaningfully different editorial angle from the Consumer Article.
- Explain concepts, causes, decision factors, processes, technical context, or tradeoffs.
- Be useful even to someone who is not ready to book.
- Demonstrate knowledgeable explanation rather than promotional language.
- Complement the Consumer Article instead of rewriting it.
- Stay understandable to a normal homeowner.
- Use a restrained CTA.

==================================================
GLOBAL CLAIM RULES
==================================================

- Do not invent business facts.
- Do not invent pricing or savings.
- Do not invent certifications or licenses.
- Do not invent years in business.
- Do not invent warranties.
- Do not invent financing terms.
- Do not invent response times.
- Do not invent guarantees.
- Do not invent manufacturer relationships.
- Do not manufacture urgency.
- Do not claim SEO rankings, AI visibility, authority gains, or traffic outcomes.
- Do not use internal strategy language such as "high-intent", "capture demand", "generate leads", or "conversion".
- Keep local references grounded only in the supplied service area.
- The two articles must have meaningfully different titles and editorial angles.

Return JSON ONLY in this exact shape:

{
  "actionSeoStrategy": {
    "primarySearchTheme": "...",
    "secondaryKeywordThemes": ["...", "...", "..."],
    "searchIntent": "...",
    "targetService": "...",
    "targetGeography": "...",
    "offerContext": null,
    "recommendedPageFocus": "...",
    "titleTag": "...",
    "metaDescription": "...",
    "h1Recommendation": "...",
    "suggestedSlug": "...",
    "internalLinkTargets": ["...", "..."],
    "supportingQuestions": ["...", "...", "..."],
    "contentSupportNotes": ["...", "..."]
  },
  "consumerArticle": {
    "title": "...",
    "excerpt": "...",
    "introduction": "...",
    "sections": [
      { "heading": "...", "body": "..." },
      { "heading": "...", "body": "..." },
      { "heading": "...", "body": "..." }
    ],
    "cta": "..."
  },
  "knowledgeArticle": {
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
}

Article guidelines:
- Excerpt = one sentence.
- Introduction = 2-3 sentences.
- Each section body = 2-4 sentences.
- Consumer Article should help move a homeowner toward an informed service decision.
- Knowledge / Authority Article should deepen understanding of the topic.
- Do not make the Knowledge Article simply a longer version of the Consumer Article.
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

    const parsed =
      JSON.parse(content) as GeneratedRevenueContentPackage;

    if (
      !parsed?.actionSeoStrategy ||
      !parsed?.consumerArticle ||
      !parsed?.knowledgeArticle
    ) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      "[revenue-content-generation] failed, falling back",
      error
    );

    return null;
  }
}

function getAssetCopyGuidance(
  ownerObjective: ResidentialOwnerObjective
): string {
  switch (ownerObjective) {
    case "EDUCATION_PREPAREDNESS":
      return `
- Write useful educational and preparedness content.
- Do not use fear, manufactured urgency, discounts, or aggressive sales language.
- Give homeowners practical steps they can understand and use.
- Use a restrained CTA such as "Save this guidance", "Prepare your property", "Learn what to look for", or "Contact us if professional help is needed".
- Do not invent weather severity, timing, damage, temperatures, or emergency declarations.
`.trim();

    case "REFERRAL_GROWTH":
      return `
- Write for satisfied past customers, not cold prospects.
- Clearly explain the real referral incentive and qualifying event supplied by the owner.
- Do not invent additional reward terms, restrictions, deadlines, or fulfillment rules.
- Use a referral CTA such as "Refer a friend".
`.trim();

    case "RETENTION_REACTIVATION":
      return `
- Write for past or existing customers.
- Acknowledge the existing relationship naturally.
- Give the customer a credible reason to return.
- Do not write as though the audience has never used the business.
- Do not invent a discount or urgency.
`.trim();

    case "CROSS_SELL_UPSELL":
      return `
- Write for existing or past customers.
- Explain why the related service is a useful next step.
- Do not invent a bundle, discount, package savings, or false urgency.
- Keep the message relationship-aware and relevant to prior service.
`.trim();

    case "COMPETITIVE_ACQUISITION":
      return `
- Help homeowners compare providers using truthful, supportable decision criteria.
- Do not attack competitors or invent competitor weaknesses.
- Do not use unsupported superiority claims.
- Keep the service and homeowner decision at the center of the copy.
`.trim();

    case "POSITIONING_TRUST":
      return `
- Build customer confidence and credible provider preference.
- Do not use unsupported "best", "number one", or "top-rated" claims.
- Focus on professionalism, clarity, responsiveness, communication, and decision confidence.
`.trim();

    case "REVIEW_GENERATION":
      return `
- Request honest feedback from real recent customers.
- Do not ask specifically for positive reviews.
- Do not offer an incentive in exchange for a review.
`.trim();

    case "STANDARD_SERVICE_GROWTH":
    default:
      return `
- Preserve the current direct, conversion-oriented residential service copy.
- Keep the service, offer, and CTA aligned to immediate homeowner demand.
`.trim();
  }
}

async function generateAdCopyWithAI(params: {
  ownerObjective: ResidentialOwnerObjective;
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
You are writing customer-facing copy for a local home-service business action.

Business: ${params.businessName}
Service Area: ${params.serviceArea}
Target Service: ${params.targetService}
Action Title: ${params.actionTitle}
Action Summary: ${params.actionSummary}
Audience: ${params.targetAudience}
Offer: ${params.offer ?? "None"}
CTA: ${params.cta ?? "Book now"}
Owner Objective: ${params.ownerObjective}

Owner-objective copy guidance:
${getAssetCopyGuidance(params.ownerObjective)}

Context:

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
- If this is an AEO or SEO visibility action, explain the service naturally without sounding like an SEO consultant.
- If this is an education or preparedness action, provide useful homeowner guidance rather than explaining that the business is "improving visibility."
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

function buildNeedsInputResult(params: {
  title: string;
  message: string;
  requirements: string[];
  examplePrompt: string;
  redirectHref?: string;
  redirectLabel?: string;
  isRoutingNotice?: boolean;
}): PromptReadinessResult {
  return {
    ready: false,
    title: params.title,
    message: params.message,
    requirements: params.requirements,
    examplePrompt: params.examplePrompt,
    redirectHref: params.redirectHref,
    redirectLabel: params.redirectLabel,
    isRoutingNotice: params.isRoutingNotice,
  };
}

function hasExplicitReferralIncentive(prompt: string): boolean {
  const lower = normalize(prompt);

  const incentiveSignals = [
    "$",
    "%",
    "gift card",
    "service credit",
    "account credit",
    "future service credit",
    "discount",
    "cash reward",
    "referral reward",
    "free service",
    "free add-on",
    "free add on",
    "donation",
    "reward both",
    "give them",
    "receive a",
    "gets a",
    "earn a",
  ];

  return incentiveSignals.some((signal) => lower.includes(signal));
}

function hasExplicitMonetaryValue(prompt: string): boolean {
  const lower = normalize(prompt);

  return (
    /\$\s?\d/.test(prompt) ||
    /\b\d+(?:\.\d+)?\s?%/.test(lower) ||
    /\b\d+\s+dollars?\b/.test(lower)
  );
}

function hasNamedFinancingProviderOrProgram(prompt: string): boolean {
  const lower = normalize(prompt);

  const providerPatterns = [
    /\bthrough\s+[a-z0-9][a-z0-9&.' -]{2,40}\b/,
    /\bprovided by\s+[a-z0-9][a-z0-9&.' -]{2,40}\b/,
    /\bfinancing from\s+[a-z0-9][a-z0-9&.' -]{2,40}\b/,
    /\b[a-z0-9][a-z0-9&.' -]{2,30}\s+financing\b/,
    /\bmanufacturer financing\b/,
    /\butility financing\b/,
  ];

  return providerPatterns.some((pattern) => pattern.test(lower));
}

function hasFinancingUsageInstruction(prompt: string): boolean {
  const lower = normalize(prompt);

  return [
    "do not advertise an apr",
    "do not mention apr",
    "do not advertise a rate",
    "do not mention a rate",
    "financing options available",
    "ask about financing",
    "call for financing details",
    "call for eligibility",
    "subject to approval",
    "for qualified customers",
    "apply online",
    "application link",
  ].some((signal) => lower.includes(signal));
}

function hasEligibleFinancingService(prompt: string): boolean {
  const lower = normalize(prompt);

  return [
    "for tree removal",
    "for stump grinding",
    "for hvac",
    "for ac",
    "for air conditioning",
    "for furnace",
    "for system replacement",
    "for plumbing",
    "for water heater",
    "for septic",
    "for generator",
    "for installation",
    "for replacement",
    "for repairs",
    "for jobs over",
    "for purchases over",
  ].some((signal) => lower.includes(signal));
}

function resolveReferralReadiness(
  prompt: string
): PromptReadinessResult | null {
  const objective =
    resolveResidentialOwnerObjective(prompt).objective;

  if (objective !== "REFERRAL_GROWTH") {
    return null;
  }

  if (hasExplicitReferralIncentive(prompt)) {
    return null;
  }

  return buildNeedsInputResult({
    title: "Add the referral offer to your request",
    message:
      "A referral action needs a real value exchange before MarketForge can generate customer-facing assets. Add the reward and basic qualification terms directly to your prompt.",
    requirements: [
      "What reward or incentive will be offered?",
      "Who receives the reward: the referring customer, the new customer, or both?",
      "What must happen for the referral to qualify?",
      "When will the reward be issued?",
    ],
    examplePrompt:
      "Give past customers a $50 service credit when they refer a new customer who books and completes a job. Issue the credit after the referred job is paid.",
  });
}

function resolveFinancingReadiness(
  prompt: string
): PromptReadinessResult | null {
  const lower = normalize(prompt);

  const mentionsFinancing = [
    "financing",
    "finance options",
    "payment plan",
    "payment plans",
    "monthly payments",
  ].some((signal) => lower.includes(signal));

  if (!mentionsFinancing) {
    return null;
  }

  const hasProvider =
    hasNamedFinancingProviderOrProgram(prompt);

  const hasUsageInstruction =
    hasFinancingUsageInstruction(prompt);

  const hasService =
    hasEligibleFinancingService(prompt);

  const hasExactTerms =
    hasExplicitMonetaryValue(prompt) ||
    lower.includes("apr") ||
    lower.includes("months") ||
    lower.includes("term");

  /*
   * Public or manufacturer financing can proceed when the user
   * identifies the program well enough for promotional enrichment.
   *
   * Private or vague financing requests need owner-supplied details.
   */
  if (
    hasProvider &&
    (hasService || hasUsageInstruction || hasExactTerms)
  ) {
    return null;
  }

  return buildNeedsInputResult({
    title: "Add your financing details",
    message:
      "MarketForge needs enough approved financing information to generate truthful customer-facing assets. Financing terms, eligibility, and application instructions cannot be invented.",
    requirements: [
      "Who provides the financing or what is the program called?",
      "Which services or purchases qualify?",
      "Should MarketForge use exact approved terms or only say that financing options are available?",
      "Where should customers call, apply, or request eligibility details?",
    ],
    examplePrompt:
      "Promote financing through GreenSky for tree removal jobs over $2,500. Use the phrase “financing options available” without advertising an APR or monthly payment. Ask customers to call for eligibility details.",
  });
}

function resolveDiscountReadiness(
  prompt: string
): PromptReadinessResult | null {
  const lower = normalize(prompt);

  const mentionsBusinessPromotion = [
    "our discount",
    "our special",
    "our promotion",
    "our promo",
    "summer discount",
    "seasonal discount",
    "limited-time discount",
    "limited time discount",
    "coupon",
    "special offer",
  ].some((signal) => lower.includes(signal));

  if (!mentionsBusinessPromotion) {
    return null;
  }

  const hasValue =
    hasExplicitMonetaryValue(prompt) ||
    lower.includes("free ");

  const hasEligibleService =
    [
      "tree removal",
      "stump grinding",
      "tree trimming",
      "pruning",
      "hvac",
      "ac repair",
      "system replacement",
      "furnace",
      "plumbing",
      "water heater",
      "drain cleaning",
      "septic",
      "generator",
      "installation",
      "repair",
      "service",
    ].some((signal) => lower.includes(signal));

  const hasTiming =
    [
      "through ",
      "until ",
      "expires ",
      "this week",
      "this month",
      "this summer",
      "this winter",
      "this spring",
      "this fall",
      "limited time",
    ].some((signal) => lower.includes(signal));

  const hasRedemptionInstruction =
    [
      "mention",
      "use code",
      "promo code",
      "call to redeem",
      "book online",
      "request an estimate",
      "schedule",
    ].some((signal) => lower.includes(signal));

  if (
    hasValue &&
    hasEligibleService &&
    (hasTiming || hasRedemptionInstruction)
  ) {
    return null;
  }

  return buildNeedsInputResult({
    title: "Add the promotion details",
    message:
      "MarketForge needs the actual business-created offer before generating customer-facing assets. The discount value, eligible service, and redemption terms cannot be assumed.",
    requirements: [
      "What is the discount, credit, free add-on, or promotional value?",
      "Which service or purchase qualifies?",
      "When does the offer apply or expire?",
      "How should customers claim or redeem it?",
    ],
    examplePrompt:
      "Offer $100 off tree removal jobs booked this month. The discount applies to completed jobs over $1,500. Ask customers to mention the offer when requesting an estimate.",
  });
}

function resolveMembershipReadiness(
  prompt: string
): PromptReadinessResult | null {
  const lower = normalize(prompt);

  const mentionsPlan = [
    "maintenance plan",
    "maintenance membership",
    "service agreement",
    "service plan",
    "membership program",
    "our membership",
    "our plan",
  ].some((signal) => lower.includes(signal));

  if (!mentionsPlan) {
    return null;
  }

  const hasIncludedBenefits =
    [
      "includes",
      "included",
      "covers",
      "inspection",
      "priority scheduling",
      "priority service",
      "discounted repairs",
      "annual visit",
      "seasonal visit",
      "maintenance visit",
      "tune-up",
      "tune up",
    ].some((signal) => lower.includes(signal));

  const hasPriceOrApprovedNonPriceInstruction =
    hasExplicitMonetaryValue(prompt) ||
    lower.includes("do not mention price") ||
    lower.includes("ask about pricing") ||
    lower.includes("call for pricing");

  const hasBillingOrEnrollmentInstruction =
    [
      "per month",
      "monthly",
      "per year",
      "annual",
      "annually",
      "enroll",
      "sign up",
      "call to join",
      "book online",
    ].some((signal) => lower.includes(signal));

  if (
    hasIncludedBenefits &&
    hasPriceOrApprovedNonPriceInstruction &&
    hasBillingOrEnrollmentInstruction
  ) {
    return null;
  }

  return buildNeedsInputResult({
    title: "Add your plan details",
    message:
      "MarketForge needs the real membership or maintenance-plan structure before generating an action. Plan benefits, pricing language, and enrollment terms must come from the business.",
    requirements: [
      "What is the plan or membership called?",
      "What services or benefits are included?",
      "What pricing language is approved?",
      "How often is the customer billed or serviced?",
      "How should customers enroll or ask for details?",
    ],
    examplePrompt:
      "Promote our Tree Care Membership. It includes one annual tree-health inspection and priority scheduling. The plan is $199 per year. Ask customers to call to enroll.",
  });
}

function resolveWebsiteIntelligenceRouting(
  prompt: string
): PromptReadinessResult | null {
  const lower = normalize(prompt);

  const hasExplicitAeoIntent =
    lower.includes("aeo") ||
    lower.includes("answer engine") ||
    lower.includes("ai search") ||
    lower.includes("show up in chatgpt") ||
    lower.includes("show up on chatgpt") ||
    lower.includes("appear in chatgpt") ||
    lower.includes("recommended by chatgpt") ||
    lower.includes("recommend me in chatgpt") ||
    lower.includes("show up in gemini") ||
    lower.includes("show up on gemini") ||
    lower.includes("show up in perplexity") ||
    lower.includes("answer-engine");

  if (!hasExplicitAeoIntent) {
    return null;
  }

  return buildNeedsInputResult({
    title: "AEO recommendations come from your website analysis",
    message:
      "MarketForge bases AEO actions on what it actually finds on your live website. Rather than creating a generic AEO action from a prompt, review your Website Intelligence recommendations to see what MarketForge recommends for your site.",
    requirements: [
      "Website Intelligence evaluates your live site before recommending an AEO improvement.",
      "If MarketForge identifies an executable authority or content gap, you can create that action directly from the AEO recommendations page.",
      "Website changes that require you or your developer are also provided there as implementation plans.",
    ],
    examplePrompt:
      "Promote AC replacement and create helpful homeowner content that supports this revenue action.",
    redirectHref: "/aeo",
    redirectLabel: "View AEO Recommendations",
    isRoutingNotice: true,
  });
}

function resolvePromptReadiness(
  prompt: string
): PromptReadinessResult {
  const cleanedPrompt = prompt.trim();

  if (cleanedPrompt.length < 10) {
    return buildNeedsInputResult({
      title: "Add more detail to your request",
      message:
        "MarketForge needs a clearer business goal before it can generate an action.",
      requirements: [
        "Describe the result you want.",
        "Include the service, audience, offer, or business objective when relevant.",
      ],
      examplePrompt:
        "Promote tree removal to homeowners in my service area.",
    });
  }

  const readinessChecks = [
    resolveWebsiteIntelligenceRouting,
    resolveReferralReadiness,
    resolveFinancingReadiness,
    resolveDiscountReadiness,
    resolveMembershipReadiness,
  ];

  for (const check of readinessChecks) {
    const issue = check(cleanedPrompt);

    if (issue) {
      return issue;
    }
  }

  return {
    ready: true,
  };
}

export async function validateCampaignPrompt(
  prompt: string
): Promise<PromptReadinessResult> {
  return resolvePromptReadiness(prompt);
}

function resolveResidentialOwnerObjective(
  prompt: string
): ResolvedOwnerObjective {
  const lower = normalize(prompt);

  const matchedSignals: string[] = [];

  const includesAny = (phrases: string[]) =>
    phrases.some((phrase) => lower.includes(phrase));

  const hasEducationVerb = includesAny([
    "educate",
    "teach",
    "explain",
    "help homeowners understand",
    "show homeowners how",
    "prepare homeowners",
    "prevention tips",
    "prevent",
    "protect their",
    "protect your",
    "checklist",
    "advisory",
  ]);

  const hasPreparednessTopic = includesAny([
    "frozen pipe",
    "frozen pipes",
    "freeze",
    "winter storm",
    "hurricane",
    "severe storm",
    "severe weather",
    "extreme heat",
    "heavy rain",
    "high winds",
    "sewer backup",
    "spring maintenance",
    "fall maintenance",
    "storm preparation",
    "weather preparation",
  ]);

  if (hasEducationVerb && hasPreparednessTopic) {
    matchedSignals.push(
      "educational or prevention language",
      "preparedness or seasonal-risk topic"
    );

    return {
      objective: "EDUCATION_PREPAREDNESS",
      confidence: "high",
      matchedSignals,
    };
  }

  if (
    includesAny([
      "win business from",
      "choosing us instead of",
      "choose us instead of",
      "compete with",
      "compete against",
      "take market share from",
      "beat the larger companies",
      "beat the big companies",
      "win customers from",
    ])
  ) {
    matchedSignals.push("explicit competitive-acquisition language");

    return {
      objective: "COMPETITIVE_ACQUISITION",
      confidence: "high",
      matchedSignals,
    };
  }

  if (
    includesAny([
      "more referrals",
      "referral program",
      "refer a friend",
      "refer friends",
      "refer family",
      "ask customers to refer",
      "word of mouth",
      "customer referrals",
    ])
  ) {
    matchedSignals.push("explicit referral-growth language");

    return {
      objective: "REFERRAL_GROWTH",
      confidence: "high",
      matchedSignals,
    };
  }

  if (
    includesAny([
      "more repeat customers",
      "repeat business",
      "bring customers back",
      "win customers back",
      "past customers",
      "existing customers",
      "customers who have not called",
      "reactivate",
      "reactivation",
      "customer retention",
      "retain customers",
    ])
  ) {
    matchedSignals.push("explicit retention or reactivation language");

    return {
      objective: "RETENTION_REACTIVATION",
      confidence: "high",
      matchedSignals,
    };
  }

  const hasExistingCustomerSignal =
    includesAny([
      "past customers",
      "existing customers",
      "current customers",
      "recent customers",
    ]) ||
    /\b(past|existing|current|recent)\b.{0,50}\bcustomers?\b/.test(lower);

  const hasRelatedServiceSignal =
    includesAny([
      "cross-sell",
      "cross sell",
      "upsell",
      "up-sell",
      "add another service",
      "related service",
      "also promote",
      "schedule another service",
      "schedule an additional service",
    ]) ||
    /\b(encourage|ask|invite|remind)\b.{0,80}\b(schedule|book|add)\b/.test(
      lower
    );

  if (hasExistingCustomerSignal && hasRelatedServiceSignal) {
    matchedSignals.push(
      "existing-customer audience",
      "related-service or upsell language"
    );

    return {
      objective: "CROSS_SELL_UPSELL",
      confidence: "high",
      matchedSignals,
    };
  }

  if (
    includesAny([
      "become known as",
      "first company people think of",
      "build trust",
      "increase trust",
      "improve our reputation",
      "be seen as",
      "establish us as",
      "become the trusted",
      "position us as",
      "known as the best",
      "become the best known",
    ])
  ) {
    matchedSignals.push("explicit positioning or trust-building language");

    return {
      objective: "POSITIONING_TRUST",
      confidence: "high",
      matchedSignals,
    };
  }

  if (lower.includes("review")) {
    matchedSignals.push("review-generation language");

    return {
      objective: "REVIEW_GENERATION",
      confidence: "high",
      matchedSignals,
    };
  }

  return {
    objective: "STANDARD_SERVICE_GROWTH",
    confidence: "default",
    matchedSignals: [],
  };
}

function routePromptIntent(prompt: string): RoutedIntent {
  const lower = normalize(prompt);
  const resolvedOwnerObjective =
    resolveResidentialOwnerObjective(prompt);

    if (
    lower.includes("slow week") ||
    lower.includes("fill the schedule") ||
    lower.includes("fill schedule") ||
    lower.includes("fill my schedule") ||
    lower.includes("fill our schedule") ||
    lower.includes("fill this week's schedule") ||
    lower.includes("fill this week’s schedule") ||
    lower.includes("capacity")
  ) {
    return {
      lane: "CAPACITY_FILL",
      mode: "CAMPAIGN",
      ownerObjective: "STANDARD_SERVICE_GROWTH",
      preferredCampaignType: "MAINTENANCE_PUSH",
      preferredActionType: "CAPACITY_FILL",
      label: "Capacity-fill intent",
    };
  }

  if (lower.includes("review")) {
    return {
      lane: "REVIEWS",
      mode: "CAMPAIGN",
      ownerObjective: "REVIEW_GENERATION",
      preferredCampaignType: "REVIEW_GENERATION",
      preferredActionType: "REVIEW_GENERATION",
      label: "Review intent",
    };
  }

  if (
    resolvedOwnerObjective.objective !==
    "STANDARD_SERVICE_GROWTH"
  ) {
    return {
      lane: "GENERAL",
      mode: "CAMPAIGN",
      ownerObjective: resolvedOwnerObjective.objective,
      preferredCampaignType: "CUSTOM",
      preferredActionType: "CUSTOM",
      label: `${resolvedOwnerObjective.objective
        .toLowerCase()
        .replace(/_/g, " ")} intent`,
    };
  }

  const requestedService = extractRequestedServiceLabel(prompt);

  if (requestedService) {
    return {
      lane: "SERVICE",
      mode: "CAMPAIGN",
      ownerObjective: "STANDARD_SERVICE_GROWTH",
      label: `${requestedService} service intent`,
    };
  }

  return {
    lane: "GENERAL",
    mode: "AUTO",
    ownerObjective: "STANDARD_SERVICE_GROWTH",
    label: "Auto intent",
  };
}

function getStrongMatchThreshold(lane: PromptLane): number {
  switch (lane) {
    case "SERVICE":
      return 65;
    case "CAPACITY_FILL":
      return 65;
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
  ownerObjective: ResidentialOwnerObjective;
  resolvedOpportunity: Pick<
    ResolvedOpportunity,
    "familyKey" | "actionThesis" | "displayMoveLabel" | "imageMode" | "imageKey"
  >;
  serviceArea: string;
}): ActionThesis & { whyThisActionBullets: string[] } {
  const { prompt, ownerObjective, resolvedOpportunity } = params;
  const lower = normalize(prompt);
  const base = resolvedOpportunity.actionThesis;

  if (ownerObjective !== "STANDARD_SERVICE_GROWTH") {
    return {
      ...base,
      whyThisActionBullets: [
        ...(base.title
          ? [`The selected move is "${base.title}".`]
          : []),
        "The action is intentionally aligned to the owner’s stated business objective rather than being forced into a conventional service-promotion campaign.",
        "The audience, message, CTA, and supporting assets should all reflect this objective consistently.",
        "Existing residential service-growth behavior should remain unchanged for ordinary promotional requests.",
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

function getOwnerObjectivePromptGuidance(params: {
  ownerObjective: ResidentialOwnerObjective;
  userPrompt: string;
}): string {
  switch (params.ownerObjective) {
    case "COMPETITIVE_ACQUISITION":
      return `
- Treat competitors as strategic context, not as targets for attack.
- Use truthful and supportable differentiation only.
- Do not invent competitor weaknesses, negative claims, superiority claims, customer lists, or comparative facts.
- Do not impersonate or disparage a competitor.
- The competitor name does not need to appear prominently in consumer-facing assets.
- When verified differentiators are unavailable, help homeowners compare providers using neutral decision criteria.
`.trim();

    case "EDUCATION_PREPAREDNESS":
      return `
- The primary objective is education, prevention, preparedness, safety, or community value.
- Do not convert this into a discount, emergency repair promotion, aggressive sales campaign, or fear-based advertisement.
- Provide practical and specific homeowner guidance.
- Use a restrained CTA such as "Save this guidance", "Prepare your property", "Learn what to look for", or "Contact us if professional help is needed".
- Do not invent weather timing, severity, temperatures, affected locations, damage forecasts, or emergency declarations.
- Treat an approaching event stated by the user as user-provided context without adding unsupported specifics.
`.trim();

    case "POSITIONING_TRUST":
      return `
- Build credibility, recognition, and provider preference.
- Do not repeat unsupported claims such as "best", "number one", or "top-rated".
- Use supportable trust factors or neutral decision criteria.
- When verified proof is unavailable, focus on professionalism, service clarity, responsiveness, communication, and decision confidence without claiming facts not provided.
`.trim();

    case "RETENTION_REACTIVATION":
      return `
- Write for existing or past customers.
- Acknowledge the established customer relationship.
- Do not use cold-acquisition language as though recipients have never used the business.
- Focus on continued care, timely follow-up, convenience, a relevant service reminder, or another credible reason to return.
- An incentive is optional and must not be invented.
`.trim();

    case "REFERRAL_GROWTH":
      return hasExplicitReferralIncentive(params.userPrompt)
        ? `
- The user supplied a referral incentive.
- Use only the incentive and terms explicitly provided.
- Do not invent reward values, eligibility, timing, qualification, or fulfillment rules.
- Make the referral action clear for the existing customer.
- The CTA should be "Refer a friend" or equivalent.
`.trim()
        : `
- The user requested referral growth but did not provide a real incentive.
- Do not invent a referral reward.
- Frame this as defining and preparing a referral offer before customer-facing launch.
- Make the missing dependencies explicit: reward, recipient, qualification event, timing, and fulfillment process.
- Do not imply that the referral campaign is fully launch-ready until these terms are confirmed.
`.trim();

    case "CROSS_SELL_UPSELL":
      return `
- Write for existing or past customers.
- Promote only a logically related service.
- Explain why the additional service is relevant.
- Do not invent a bundle, discount, package savings, or urgency.
- Keep the message useful and relationship-aware rather than opportunistic.
`.trim();

    case "REVIEW_GENERATION":
      return `
- Preserve the existing review-generation behavior.
- Request honest feedback from real recent customers.
- Do not invent review incentives or ask specifically for positive reviews.
`.trim();

    case "STANDARD_SERVICE_GROWTH":
    default:
      return `
- Preserve the current direct, conversion-oriented residential service-growth behavior.
- Keep the existing offer, targeting, CTA, imagery, and campaign framing patterns unless the user explicitly requests otherwise.
`.trim();
  }
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

function getObjectiveTopicLabel(params: {
  prompt: string;
  industry: string;
  requestedService: string | null;
  ownerObjective: ResidentialOwnerObjective;
}): string {
  if (params.requestedService) {
    return params.requestedService;
  }

  const lower = normalize(params.prompt);

  if (params.ownerObjective === "EDUCATION_PREPAREDNESS") {
    if (lower.includes("dangerous tree") || lower.includes("hazardous tree")) {
      return "Dangerous Tree Preparedness";
    }

    if (
      lower.includes("storm") ||
      lower.includes("high wind") ||
      lower.includes("hurricane")
    ) {
      return params.industry === "tree-service"
        ? "Storm Tree Preparedness"
        : "Seasonal Preparedness";
    }

    if (lower.includes("frozen pipe") || lower.includes("freeze")) {
      return "Frozen Pipe Prevention";
    }

    if (lower.includes("sewer backup")) {
      return "Sewer Backup Prevention";
    }

    if (lower.includes("extreme heat")) {
      return "Extreme Heat Preparedness";
    }

    return "Homeowner Preparedness";
  }

  if (params.ownerObjective === "COMPETITIVE_ACQUISITION") {
    switch (params.industry) {
      case "tree-service":
        return "Tree Service";
      case "septic":
        return "Septic Service";
      case "hvac":
        return "HVAC Service";
      default:
        return "Plumbing Service";
    }
  }

  if (params.ownerObjective === "POSITIONING_TRUST") {
    switch (params.industry) {
      case "tree-service":
        return lower.includes("emergency")
          ? "Emergency Tree Service"
          : "Tree Service";
      case "septic":
        return "Septic Service";
      case "hvac":
        return lower.includes("emergency")
          ? "Emergency HVAC Service"
          : "HVAC Service";
      default:
        return lower.includes("emergency")
          ? "Emergency Plumbing"
          : "Plumbing Service";
    }
  }

  if (params.ownerObjective === "RETENTION_REACTIVATION") {
    return "Customer Reactivation";
  }

  if (params.ownerObjective === "REFERRAL_GROWTH") {
    return "Customer Referrals";
  }

  if (params.ownerObjective === "CROSS_SELL_UPSELL") {
    return "Related Service Follow-Up";
  }

  return "Local Service Demand";
}

function buildExpandedObjectiveSyntheticOpportunity(params: {
  prompt: string;
  routedIntent: RoutedIntent;
  profile: {
    businessName: string;
    serviceArea: string;
    averageJobValue: unknown;
    servicePricingJson?: unknown;
  };
}): ResolvedOpportunity {
  const { prompt, routedIntent, profile } = params;
  const lower = normalize(prompt);
  const requestedService = extractRequestedServiceLabel(prompt);

  const inferredIndustry = inferIndustryFromContext({
    prompt,
    familyKey: requestedService ? slugify(requestedService) : null,
    serviceName: requestedService,
  });

  const topicLabel = getObjectiveTopicLabel({
    prompt,
    industry: inferredIndustry,
    requestedService,
    ownerObjective: routedIntent.ownerObjective,
  });

  const familyKey = `${inferredIndustry}-${slugify(
    routedIntent.ownerObjective
  )}`;

  const resolvedJobValue = resolveSyntheticJobValue({
    profile,
    familyKey,
    serviceName: topicLabel,
    primaryService: topicLabel,
  });

  const base = {
    opportunityType: "LOCAL_SEARCH_SPIKE" as OpportunityType,
    recommendedCampaignType: "CUSTOM" as CampaignType,
    jobsLow: 1,
    jobsHigh: 3,
    revenueLow: Math.round(resolvedJobValue * 1),
    revenueHigh: Math.round(resolvedJobValue * 3),
    rawOpportunityScore: 70,
    confidenceLabel: "Medium",
    confidenceScore: 80,
    source: "generated" as const,
    fitScore: 96,
  };

  switch (routedIntent.ownerObjective) {
    case "EDUCATION_PREPAREDNESS": {
      const title =
        inferredIndustry === "tree-service" &&
        (lower.includes("storm") ||
          lower.includes("dangerous tree") ||
          lower.includes("hazardous tree"))
          ? "Create a Storm Tree Safety Advisory"
          : `Create a ${topicLabel} Advisory`;

      return {
        ...base,
        opportunityKey: buildSyntheticOpportunityKey({
          serviceName: topicLabel,
          opportunityType: base.opportunityType,
          bestMove: title,
        }),
        familyKey,
        title: `${topicLabel} Education Opportunity`,
        serviceName: topicLabel,
        bestMove: title,
        displayMoveLabel: title,
        displaySummary:
          "Create useful homeowner guidance centered on prevention, preparedness, safety, and community value.",
        imageKey: "company-logo",
        imageMode: "LOGO",
        actionThesis: {
          familyKey,
          primaryService: topicLabel,
          angle: "homeowner education and preparedness",
          title,
          summary:
            "Provide practical, timely guidance that helps homeowners reduce risk and understand when professional help may be needed.",
          audience: `Homeowners in ${profile.serviceArea} who would benefit from timely prevention and preparedness guidance`,
          offerHint: "",
          ctaHint: "Review the safety guidance",
        imageKey: "company-logo",
        imageMode: "LOGO",
        },
        whyNowBullets: [
          "The owner explicitly requested educational or preparedness content rather than a conventional service promotion.",
          "The action should provide practical homeowner value without manufacturing an offer or aggressive sales urgency.",
          "Useful public-service guidance can strengthen trust, authority, and future consideration.",
        ],
        whyThisMatters:
          "Educational and preparedness requests should remain helpful and restrained instead of being converted into an opportunistic repair advertisement.",
        sourceTags: ["Demand"],
      };
    }

    case "COMPETITIVE_ACQUISITION": {
      const title = `Win More Local ${topicLabel} Comparisons`;

      return {
        ...base,
        opportunityKey: buildSyntheticOpportunityKey({
          serviceName: topicLabel,
          opportunityType: base.opportunityType,
          bestMove: title,
        }),
        familyKey,
        title: `${topicLabel} Competitive Acquisition Opportunity`,
        serviceName: topicLabel,
        bestMove: title,
        displayMoveLabel: title,
        displaySummary:
          "Create a truthful differentiation action for homeowners comparing local providers.",
        imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
        imageMode: "SERVICE_IMAGE",
        actionThesis: {
          familyKey,
          primaryService: topicLabel,
          angle: "truthful provider differentiation",
          title,
          summary:
            "Help homeowners compare providers using credible decision criteria and supportable business strengths.",
          audience: `Homeowners in ${profile.serviceArea} actively comparing local providers for ${topicLabel.toLowerCase()}`,
          offerHint: "",
          ctaHint: "Request an estimate",
          imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
          imageMode: "SERVICE_IMAGE",
        },
        whyNowBullets: [
          "The owner explicitly wants to win consideration from competing local providers.",
          "The action should improve customer preference through truthful differentiation rather than competitor attacks.",
          "The competitor context should guide strategy without forcing competitor names into every consumer-facing asset.",
        ],
        whyThisMatters:
          "Competitive acquisition should help the business become the stronger customer choice without fabricating weaknesses or unsupported superiority claims.",
        sourceTags: ["Competitor", "Demand"],
      };
    }

    case "POSITIONING_TRUST": {
      const title = `Build Trust Around ${topicLabel}`;

      return {
        ...base,
        opportunityKey: buildSyntheticOpportunityKey({
          serviceName: topicLabel,
          opportunityType: base.opportunityType,
          bestMove: title,
        }),
        familyKey,
        title: `${topicLabel} Positioning Opportunity`,
        serviceName: topicLabel,
        bestMove: title,
        displayMoveLabel: title,
        displaySummary:
          "Strengthen customer confidence and provider preference through credible positioning.",
        imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
        imageMode: "SERVICE_IMAGE",
        actionThesis: {
          familyKey,
          primaryService: topicLabel,
          angle: "trust and provider positioning",
          title,
          summary:
            "Build recognition and customer confidence using clear, supportable reasons to choose the business.",
          audience: `Homeowners in ${profile.serviceArea} comparing providers and looking for a trusted local choice`,
          offerHint: "",
          ctaHint: "Request an estimate",
          imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
          imageMode: "SERVICE_IMAGE",
        },
        whyNowBullets: [
          "The owner explicitly wants stronger trust, recognition, or customer preference.",
          "The action should build credibility without repeating unsupported 'best' or 'number one' claims.",
          "Clear provider positioning can improve consideration before a homeowner is ready to book.",
        ],
        whyThisMatters:
          "Trust-building should create believable customer preference rather than relying on vague or unsupported superiority language.",
        sourceTags: ["Demand"],
      };
    }

    case "RETENTION_REACTIVATION": {
      const title = "Reconnect with Past Customers";

      return {
        ...base,
        opportunityKey: buildSyntheticOpportunityKey({
          serviceName: topicLabel,
          opportunityType: base.opportunityType,
          bestMove: title,
        }),
        familyKey,
        title: "Customer Retention Opportunity",
        serviceName: topicLabel,
        bestMove: title,
        displayMoveLabel: title,
        displaySummary:
          "Create a relationship-based follow-up action for existing or past customers.",
        imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
        imageMode: "SERVICE_IMAGE",
        actionThesis: {
          familyKey,
          primaryService: topicLabel,
          angle: "customer retention and reactivation",
          title,
          summary:
            "Reconnect with past customers using timely, useful follow-up instead of cold acquisition language.",
          audience: `Past customers in ${profile.serviceArea} who may reasonably need another service or follow-up`,
          offerHint: "",
          ctaHint: "Schedule service",
          imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
          imageMode: "SERVICE_IMAGE",
        },
        whyNowBullets: [
          "The owner explicitly wants more repeat business from established customer relationships.",
          "Past customers should receive relationship-aware messaging rather than cold prospecting copy.",
          "A timely reminder, continued-care message, or relevant service reason can create repeat business without requiring a discount.",
        ],
        whyThisMatters:
          "Retention actions should acknowledge the existing relationship and give customers a credible reason to return.",
        sourceTags: ["Demand"],
      };
    }

        case "REFERRAL_GROWTH": {
      const title = "Launch a Customer Referral Offer";

      return {
        ...base,

        opportunityKey: buildSyntheticOpportunityKey({
          serviceName: topicLabel,
          opportunityType: base.opportunityType,
          bestMove: title,
        }),

        familyKey,
        title: "Customer Referral Growth Opportunity",
        serviceName: "Customer Referrals",
        bestMove: title,
        displayMoveLabel: title,

        displaySummary:
          "Create a referral action around the real incentive and qualification terms supplied by the owner.",

        imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
        imageMode: "SERVICE_IMAGE",

        actionThesis: {
          familyKey,
          primaryService: "Customer Referrals",
          angle: "incentivized customer referrals",
          title,
          summary:
            "Turn satisfied customers into advocates using the real referral incentive supplied in the request.",
          audience: `Satisfied past customers in ${profile.serviceArea} who may be comfortable referring friends, family, or neighbors`,
          offerHint:
            "Use only the referral incentive explicitly supplied by the owner",
          ctaHint: "Refer a friend",
          imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
          imageMode: "SERVICE_IMAGE",
        },

        whyNowBullets: [
          "The owner explicitly wants customer referrals and supplied a real value exchange.",
          "The action must preserve the provided incentive without inventing additional terms.",
          "Referral messaging should make the reward and qualification rules easy to understand.",
        ],

        whyThisMatters:
          "A referral action can become launch-ready because the owner supplied a real incentive and qualifying terms.",

        sourceTags: ["Demand"],
      };
    }

    case "CROSS_SELL_UPSELL": {
      const title = requestedService
        ? `Promote ${requestedService} to Past Customers`
        : "Promote a Relevant Follow-Up Service";

      return {
        ...base,
        opportunityKey: buildSyntheticOpportunityKey({
          serviceName: topicLabel,
          opportunityType: base.opportunityType,
          bestMove: title,
        }),
        familyKey,
        title: "Customer Cross-Sell Opportunity",
        serviceName: topicLabel,
        bestMove: title,
        displayMoveLabel: title,
        displaySummary:
          "Create a relevant next-service action for customers who already know the business.",
        imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
        imageMode: "SERVICE_IMAGE",
        actionThesis: {
          familyKey,
          primaryService: topicLabel,
          angle: "relevant existing-customer service follow-up",
          title,
          summary:
            "Promote a logically related service to existing customers by clearly explaining why the next service is useful.",
          audience: `Existing or past customers in ${profile.serviceArea} for whom the related service is genuinely relevant`,
          offerHint: "",
          ctaHint: "Schedule the related service",
          imageKey: getFallbackImageKeyForIndustry(inferredIndustry),
          imageMode: "SERVICE_IMAGE",
        },
        whyNowBullets: [
          "The owner explicitly wants to promote an additional service to an existing customer group.",
          "The message should explain why the follow-up service is relevant rather than forcing an unnecessary bundle.",
          "The existing relationship should remain visible in the campaign framing.",
        ],
        whyThisMatters:
          "Cross-sell actions should create useful follow-up opportunities without treating established customers like cold prospects.",
        sourceTags: ["Service Value", "Demand"],
      };
    }

    default:
      throw new Error(
        `Unsupported expanded owner objective: ${routedIntent.ownerObjective}`
      );
  }
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
  ownerObjective: ResidentialOwnerObjective;
  targetService: string;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
}) {
  if (params.isReviewAction) {
    return "Request More Customer Reviews";
  }

  if (params.ownerObjective === "EDUCATION_PREPAREDNESS") {
    return cleanActionTitleForAd(params.actionTitle);
  }

  if (params.ownerObjective === "REFERRAL_GROWTH") {
    return cleanActionTitleForAd(params.actionTitle);
  }

  if (
    params.ownerObjective === "RETENTION_REACTIVATION" ||
    params.ownerObjective === "CROSS_SELL_UPSELL"
  ) {
    return cleanActionTitleForAd(params.actionTitle);
  }

  if (params.isVisibilityAction) {
    return `Improve Visibility for ${params.targetService}`;
  }

  return cleanActionTitleForAd(params.actionTitle);
}

function buildMetaPrimaryTextFromAction(params: {
  actionSummary?: string | null;
  ownerObjective: ResidentialOwnerObjective;
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
  if (params.ownerObjective === "EDUCATION_PREPAREDNESS") {
    const summary = (params.actionSummary ?? "").trim();

    return summary
      ? `${summary} ${cta}.`
      : `Review these practical homeowner preparedness steps. ${cta}.`;
  }

  if (params.ownerObjective === "REFERRAL_GROWTH") {
    const summary = (params.actionSummary ?? "").trim();
    const offerLead = cleanOffer ? `${cleanOffer}. ` : "";

    return `${offerLead}${summary} ${cta}.`.trim();
  }

  if (
    params.ownerObjective === "RETENTION_REACTIVATION" ||
    params.ownerObjective === "CROSS_SELL_UPSELL"
  ) {
    const summary = (params.actionSummary ?? "").trim();

    return summary
      ? `${summary} ${cta}.`
      : `A relevant follow-up service is available for past customers. ${cta}.`;
  }

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
  ownerObjective: ResidentialOwnerObjective;
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
  if (params.ownerObjective === "EDUCATION_PREPAREDNESS") {
    const summary = (params.actionSummary ?? "").trim();

    return summary
      ? `${summary} ${cta}.`
      : `Use this practical guidance to prepare your property and understand when professional help may be needed.`;
  }

  if (params.ownerObjective === "REFERRAL_GROWTH") {
    const summary = (params.actionSummary ?? "").trim();
    const offerLead = cleanOffer ? `${cleanOffer} — ` : "";

    return `${offerLead}${summary} ${cta}.`.trim();
  }

  if (
    params.ownerObjective === "RETENTION_REACTIVATION" ||
    params.ownerObjective === "CROSS_SELL_UPSELL"
  ) {
    const summary = (params.actionSummary ?? "").trim();

    return summary
      ? `${summary} ${cta}.`
      : `A relevant follow-up service is available for past customers. ${cta}.`;
  }

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

function shouldRefineTargetingWithAI(
  ownerObjective: ResidentialOwnerObjective
): boolean {
  return (
    ownerObjective === "STANDARD_SERVICE_GROWTH" ||
    ownerObjective === "COMPETITIVE_ACQUISITION" ||
    ownerObjective === "POSITIONING_TRUST"
  );
}

function getAssetTypesForAction(params: {
  ownerObjective: ResidentialOwnerObjective;
  executionMode: "CAMPAIGN" | "ACTION_PACK";
  actionType: string;
  campaignType: CampaignType;
  routedLane: PromptLane;
  opportunityType: OpportunityType;
}): AssetType[] {
  switch (params.ownerObjective) {
    case "EDUCATION_PREPAREDNESS":
      return [
        "GOOGLE_BUSINESS",
        "META",
        "BLOG",
      ];

    case "REFERRAL_GROWTH":
      return [
        "GOOGLE_BUSINESS",
        "META",
        "EMAIL",
      ];

    case "RETENTION_REACTIVATION":
      return [
        "GOOGLE_BUSINESS",
        "META",
        "EMAIL",
      ];

    case "CROSS_SELL_UPSELL":
      return [
        "GOOGLE_BUSINESS",
        "META",
        "EMAIL",
      ];

    case "COMPETITIVE_ACQUISITION":
      return [
        "GOOGLE_BUSINESS",
        "META",
        "GOOGLE_ADS",
        "YELP",
        "BLOG",
      ];

    case "POSITIONING_TRUST":
      return [
        "GOOGLE_BUSINESS",
        "META",
        "GOOGLE_ADS",
        "YELP",
        "BLOG",
      ];

    case "REVIEW_GENERATION":
      return [
        "GOOGLE_BUSINESS",
        "EMAIL",
      ];

    case "STANDARD_SERVICE_GROWTH":
      return [
        "GOOGLE_BUSINESS",
        "META",
        "GOOGLE_ADS",
        "YELP",
        "EMAIL",
        "BLOG",
      ];

    default:
      break;
  }

  const reviewAction = isReviewActionType({
    actionType: params.actionType,
    campaignType: params.campaignType,
    routedLane: params.routedLane,
  });

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
  ownerObjective: ResidentialOwnerObjective;
  offer?: string | null;
  actionSummary?: string | null;
  cta?: string | null;
  targetService: string;
  serviceArea: string;
  isReviewAction: boolean;
  isVisibilityAction: boolean;
  isOfferAction: boolean;
  generatedSubject?: string | null;
  generatedBody?: string | null;
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

  if (params.ownerObjective === "REFERRAL_GROWTH") {
    const offer = sanitizeCustomerFacingOffer(params.offer);

    return buildStructuredEmailAsset({
      subject: params.actionTitle,
      previewLine:
        offer ?? "A new referral reward is available for past customers.",
      body: [
        params.actionSummary ??
          "We are inviting satisfied past customers to refer friends, family, or neighbors.",
        offer ? `Referral offer: ${offer}.` : null,
        "Use the referral process described in this action and make sure the qualifying terms are clear before sending.",
      ]
        .filter(Boolean)
        .join("\n\n"),
      cta: params.cta ?? "Refer a friend",
      industry: params.industry,
    });
  }

  if (params.ownerObjective === "RETENTION_REACTIVATION") {
    return buildStructuredEmailAsset({
      subject: params.actionTitle,
      previewLine:
        params.actionSummary ??
        "A helpful follow-up from a company you have worked with before.",
      body:
        params.actionSummary ??
        `Thank you for choosing us previously. We are available when you need another service or follow-up.`,
      cta: params.cta ?? "Schedule service",
      industry: params.industry,
    });
  }

  if (params.ownerObjective === "CROSS_SELL_UPSELL") {
    return buildStructuredEmailAsset({
      subject: params.actionTitle,
      previewLine:
        params.actionSummary ??
        `A related ${params.targetService.toLowerCase()} service may be useful.`,
      body:
        params.actionSummary ??
        `Based on your previous service, ${params.targetService.toLowerCase()} may be a useful next step.`,
      cta: params.cta ?? "Learn more",
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

  const generatedSubject =
  params.generatedSubject?.trim() ||
  params.actionTitle;

  const generatedBody =
    params.generatedBody?.trim() ||
    params.actionSummary?.trim() ||
    `We’re currently promoting ${params.targetService.toLowerCase()} in ${params.serviceArea}.`;

  const previewLine =
    params.actionSummary?.trim() ||
    `Learn more about ${params.targetService.toLowerCase()} in ${params.serviceArea}.`;

  if (params.isOfferAction) {
    const cleanOffer =
      sanitizeCustomerFacingOffer(
        params.offer
      );

    const body =
      cleanOffer &&
      !generatedBody
        .toLowerCase()
        .includes(
          cleanOffer.toLowerCase()
        )
        ? `${cleanOffer}.\n\n${generatedBody}`
        : generatedBody;

    return buildStructuredEmailAsset({
      subject:
        generatedSubject,
      previewLine,
      body,
      cta:
        params.cta ??
        "Book now",
      industry:
        params.industry,
    });
  }

  return buildStructuredEmailAsset({
    subject:
      generatedSubject,
    previewLine,
    body:
      generatedBody,
    cta:
      params.cta ??
      "Learn more",
    industry:
      params.industry,
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

function buildFallbackActionSeoStrategy(params: {
  businessName: string;
  serviceName: string;
  serviceArea: string;
  actionTitle: string;
  actionSummary: string;
  offer?: string | null;
}): ActionSeoStrategy {
  const service = params.serviceName.trim();
  const area = params.serviceArea.trim();
  const offer = sanitizeCustomerFacingOffer(params.offer);

  return {
    primarySearchTheme:
      `${service.toLowerCase()} ${area}`,

    secondaryKeywordThemes: [
      `${service.toLowerCase()} near me`,
      `local ${service.toLowerCase()}`,
      `${service.toLowerCase()} service`,
      `${service.toLowerCase()} company`,
    ],

    searchIntent:
      `Homeowners in ${area} looking for ${service.toLowerCase()} service or evaluating whether to hire a local provider.`,

    targetService:
      service,

    targetGeography:
      area,

    offerContext:
      offer,

    recommendedPageFocus:
      `${service} service page or the closest existing commercial service page that matches this action.`,

    titleTag:
      `${service} in ${area} | ${params.businessName}`,

    metaDescription:
      `${params.businessName} provides ${service.toLowerCase()} in ${area}. Learn about the service, common homeowner needs, and how to take the next step.`,

    h1Recommendation:
      `${service} in ${area}`,

    suggestedSlug:
      slugify(`${service}-${area}`),

    internalLinkTargets: [
      `${service} service page`,
      "Relevant service-area or location page",
      "Consumer Article supporting this action",
      "Knowledge / Authority Article supporting this action",
    ],

    supportingQuestions: [
      `When do homeowners need ${service.toLowerCase()}?`,
      `What should homeowners consider before scheduling ${service.toLowerCase()}?`,
      `How do homeowners choose a provider for ${service.toLowerCase()}?`,
    ],

    contentSupportNotes: [
      "Use the Consumer Article to address homeowner decision-making and service need recognition.",
      "Use the Knowledge / Authority Article to deepen topical understanding around the service or problem.",
      "Keep the primary commercial service page as the strongest search target for the revenue action.",
    ],
  };
}

function buildStructuredRevenueArticleAssets(params: {
  generatedPackage: GeneratedRevenueContentPackage | null;
  businessName: string;
  serviceArea: string;
  primaryService: string;
  cta?: string | null;
  imageKey?: string | null;
  imageMode?: "SERVICE_IMAGE" | "LOGO" | null;
  industry?: string | null;
}) {
  const serviceName =
    params.primaryService;

  const businessName =
    params.businessName;

  const serviceArea =
    params.serviceArea;

  const consumerArticle =
    params.generatedPackage?.consumerArticle ?? {
      title:
        `${serviceName} Guide for Homeowners in ${serviceArea}`,

      excerpt:
        `What homeowners in ${serviceArea} should know about ${serviceName.toLowerCase()}.`,

      introduction:
        `If you need ${serviceName.toLowerCase()} in ${serviceArea}, it helps to understand the warning signs, practical considerations, and when professional help may make sense.`,

      sections: [
        {
          heading:
            `Common signs you may need ${serviceName.toLowerCase()}`,

          body:
            `Homeowners often notice recurring issues, reduced performance, unusual sounds, inconsistent operation, or visible warning signs before realizing they may need ${serviceName.toLowerCase()}.`,
        },

        {
          heading:
            "What homeowners should consider",

          body:
            `The right next step depends on the condition of the system or property, how often the problem occurs, and whether the issue is getting worse. Understanding those factors can make it easier to decide when professional help is appropriate.`,
        },

        {
          heading:
            `Getting help with ${serviceName.toLowerCase()} in ${serviceArea}`,

          body:
            `${businessName} helps homeowners in ${serviceArea} evaluate ${serviceName.toLowerCase()} needs and understand practical next steps.`,
        },
      ],

      cta:
        params.cta ?? "Learn more",
    };

  const knowledgeArticle =
    params.generatedPackage?.knowledgeArticle ?? {
      title:
        `Understanding ${serviceName}: What Homeowners Should Know`,

      excerpt:
        `A deeper look at the factors homeowners should understand when evaluating ${serviceName.toLowerCase()}.`,

      introduction:
        `${serviceName} can involve several different conditions, causes, and decision factors. Understanding how those pieces fit together can help homeowners ask better questions and make more informed decisions.`,

      sections: [
        {
          heading:
            `What affects the need for ${serviceName.toLowerCase()}`,

          body:
            `The need for ${serviceName.toLowerCase()} can depend on age, condition, usage, maintenance history, environmental conditions, and the specific symptoms being observed. No single warning sign tells the whole story.`,
        },

        {
          heading:
            "Why professional evaluation can matter",

          body:
            `Some symptoms can have multiple causes, and the appropriate solution depends on what is actually happening. A professional evaluation can help distinguish a minor issue from a condition that requires repair, replacement, or another corrective step.`,
        },

        {
          heading:
            `Making an informed ${serviceName.toLowerCase()} decision`,

          body:
            `Homeowners should consider the condition of the property or system, the frequency and severity of the problem, available options, and the practical consequences of delaying action before deciding what to do next.`,
        },
      ],

      cta:
        "Contact us if you need help evaluating your options.",
    };

  return {
    consumerArticle: JSON.stringify({
      kind: "BLOG",
      articleRole: "CONSUMER_ARTICLE",
      title: consumerArticle.title,
      excerpt: consumerArticle.excerpt,
      introduction: consumerArticle.introduction,
      sections: consumerArticle.sections,
      cta: consumerArticle.cta,
      imageKey:
        params.imageKey ?? "general-service",
      imageMode:
        params.imageMode ?? "SERVICE_IMAGE",
      industry:
        params.industry ?? "plumbing",
    }),

    knowledgeArticle: JSON.stringify({
      kind: "BLOG",
      articleRole: "KNOWLEDGE_AUTHORITY_ARTICLE",
      title: knowledgeArticle.title,
      excerpt: knowledgeArticle.excerpt,
      introduction: knowledgeArticle.introduction,
      sections: knowledgeArticle.sections,
      cta: knowledgeArticle.cta,
      imageKey:
        params.imageKey ?? "general-service",
      imageMode:
        params.imageMode ?? "SERVICE_IMAGE",
      industry:
        params.industry ?? "plumbing",
    }),
  };
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
  const readiness = resolvePromptReadiness(cleanedPrompt);

  if (!readiness.ready) {
    return {
      success: false,
      needsInput: true,
      title: readiness.title,
      message: readiness.message,
      requirements: readiness.requirements,
      examplePrompt: readiness.examplePrompt,
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
  console.log("[nl-owner-objective]", {
    prompt: cleanedPrompt,
    lane: routedIntent.lane,
    mode: routedIntent.mode,
    ownerObjective: routedIntent.ownerObjective,
    label: routedIntent.label,
    matchedSignals:
      resolveResidentialOwnerObjective(cleanedPrompt).matchedSignals,
  });

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
  
  const requiresExpandedObjectiveSyntheticOpportunity =
    routedIntent.ownerObjective !== "STANDARD_SERVICE_GROWTH" &&
    routedIntent.ownerObjective !== "REVIEW_GENERATION";

  const resolvedOpportunity: ResolvedOpportunity =
    forcedOpportunity ??
    (requiresExpandedObjectiveSyntheticOpportunity
      ? buildExpandedObjectiveSyntheticOpportunity({
          prompt: cleanedPrompt,
          routedIntent,
          profile: {
            businessName: profile.businessName,
            serviceArea: profile.serviceArea,
            averageJobValue: profile.averageJobValue,
            servicePricingJson: profile.servicePricingJson,
          },
        })
      : bestExistingMatch &&
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
    ownerObjective: routedIntent.ownerObjective,
    resolvedOpportunity,
    serviceArea: profile.serviceArea,
  });

  const ownerObjectiveGuidance = getOwnerObjectivePromptGuidance({
    ownerObjective: routedIntent.ownerObjective,
    userPrompt: cleanedPrompt,
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
- Use the supplied owner objective to determine whether the output should be promotional, educational, competitive, relationship-based, referral-oriented, or positioning-oriented.
- Do not force every owner objective into immediate demand generation.
- Keep the language direct, commercial, and trustworthy.
- Avoid generic agency language.
- Avoid fake certainty.
- Extract manufacturer, brand, promoted product, supplier incentive, rebate, financing, inventory push, or seasonal promotion context when the user provides it.
- Do not hardcode or limit manufacturers, brands, or promoted products.
- Separate the core service objective from the promotional enhancer.
- The core service objective is the actual job demand being created, such as AC replacement, furnace installation, drain cleaning, tree removal, septic pumping, or generator installation.
- The promotional enhancer is supporting context, such as a manufacturer, rebate, financing option, supplier incentive, inventory push, premium product, or seasonal timing.
- Campaign titles, summaries, CTAs, targeting, and assets should stay service-first.
- Use promotional enhancers to strengthen the offer, trust, urgency, or positioning, not to replace the service objective.
- Do not invent rebate values, financing terms, APRs, payment amounts, expiration dates, eligibility rules, or manufacturer partnership claims.
- If the user mentions an incentive but does not provide exact terms, preserve the context but use cautious wording.

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

Internal owner objective:
${routedIntent.ownerObjective}

Owner-objective guidance:
${ownerObjectiveGuidance}

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

Owner-objective consistency rules:
- The campaign title, action thesis, audience, CTA, offer posture, imagery guidance, and assets must all align to the internal owner objective.
- Do not revert an expanded objective into a conventional service promotion merely because the resolved topic relates to a service.
- When the owner objective is STANDARD_SERVICE_GROWTH, preserve the established residential promotional behavior.
- When the owner objective is not STANDARD_SERVICE_GROWTH, follow the objective-specific guidance above.

Promotional context instructions:
- If the user requested a manufacturer, brand, product, rebate, financing offer, supplier incentive, inventory push, or seasonal promotion, extract it into promotionalContext.
- If the user provided exact incentive value and timing, mark it user_verified.
- If the user only said an incentive exists but did not provide terms, mark it user_claimed_unverified.
- Do not invent specific rebate values, APRs, expiration dates, or eligibility terms.
- customerFacingOffer must be safe to show to homeowners.
- If no promotional context exists, set verificationStatus to "none" and incentiveType to "none".

Campaign framing model:
- Core Service Objective: identify the actual service demand this campaign should create.
- Promotional Enhancer: identify any brand, manufacturer, rebate, financing, supplier incentive, inventory push, premium product, or seasonal angle that supports the campaign.
- The campaign title should usually lead with the Core Service Objective and include the Promotional Enhancer only when it improves clarity or conversion.
- Avoid weak title phrasing such as "general service", "general HVAC", "general plumbing", or "general replacement".
- Prefer commercially realistic service framing such as "HVAC Replacement", "AC Installation", "Drain Cleaning", "Tree Removal", "Furnace Upgrade", or "Generator Installation".
- Good title pattern: "[Service Objective] with [Promotional Enhancer]"
- Good title pattern: "[Seasonal/urgent service need] featuring [brand/product/offer]"
- Avoid title pattern: "Promote [brand] units" unless the user explicitly wants a brand-awareness campaign.
- The CTA should convert the service objective, not just mention the promotion.
- The targeting should prioritize homeowners with service intent first, then layer in brand/product/promotion relevance.

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

  const promotionalContext = await enrichPromotionalContext({
    initialContext: normalizePromotionalContext(parsed.promotionalContext),
    userPrompt: cleanedPrompt,
    businessName: profile.businessName,
    serviceArea: profile.serviceArea,
    city: profile.city ?? null,
    state: profile.state ?? null,
  });

  const effectiveExecutionMode =
    routedIntent.mode === "CAMPAIGN"
      ? "CAMPAIGN"
      : routedIntent.mode === "ACTION_PACK"
        ? "ACTION_PACK"
        : parsed.nextBestAction.executionMode;

  const effectiveActionType =
    routedIntent.preferredActionType ??
    parsed.nextBestAction.actionType;

  const expandedObjective =
    routedIntent.ownerObjective !== "STANDARD_SERVICE_GROWTH" &&
    routedIntent.ownerObjective !== "REVIEW_GENERATION";

  const effectiveActionThesis = {
    ...refinedActionThesis,
    ...parsed.actionThesis,
    ...(expandedObjective
      ? {
          primaryService: refinedActionThesis.primaryService,
          angle: refinedActionThesis.angle,
          title: refinedActionThesis.title,
          summary: refinedActionThesis.summary,
          audience: refinedActionThesis.audience,
          offerHint: refinedActionThesis.offerHint,
          ctaHint: refinedActionThesis.ctaHint,
        }
      : {}),
    familyKey: resolvedOpportunity.familyKey,
    imageKey: refinedActionThesis.imageKey,
    imageMode: refinedActionThesis.imageMode,
    whyThisActionBullets:
      parsed.actionThesis.whyThisActionBullets?.length > 0
        ? parsed.actionThesis.whyThisActionBullets
        : refinedActionThesis.whyThisActionBullets,
  };

  const finalActionThesis = effectiveActionThesis;

    const campaignDraft =
    parsed.campaign ??
    buildFallbackCampaignFromResolvedOpportunity(
      resolvedOpportunity,
      { serviceArea: profile.serviceArea },
      finalActionThesis.title,
      finalActionThesis.summary,
      effectiveActionType,
      finalActionThesis
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
      ? Math.max(
          estimatedBookedJobs * 2,
          estimatedBookedJobs + 2
        )
      : null;

  const campaignName = campaignDraft.title || effectiveActionThesis.title;
  const effectiveCampaignOffer =
    promotionalContext.customerFacingOffer ??
    campaignDraft.offer ??
    finalActionThesis.offerHint ??
    resolvedOpportunity.actionThesis.offerHint;

  const campaignOrigin = options.campaignOrigin ?? "nl_custom";
  const consumesRecommendationSlot =
    options.consumesRecommendationSlot ?? false;

  const structuredIndustry = inferIndustryFromContext({
    prompt: cleanedPrompt,
    familyKey: resolvedOpportunity.familyKey,
    serviceName: finalActionThesis.primaryService,
  });

  const actionSpec = buildActionSpec({
  ownerObjective: routedIntent.ownerObjective,
  actionName: campaignName,
  targetService: campaignDraft.targetService,
  rawOffer: effectiveCampaignOffer,
  promotionalContext: promotionalContext as Record<string, unknown>,
  rawAudience:
    campaignDraft.audience ??
    finalActionThesis.audience ??
    resolvedOpportunity.actionThesis.audience,
  cta: campaignDraft.cta,
  actionSummary: finalActionThesis.summary,
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

if (shouldRefineTargetingWithAI(routedIntent.ownerObjective)) {
  try {
    refinedTargeting = await refineTargetingWithAI({
      ownerObjective: routedIntent.ownerObjective,
      service: actionSpec.targetService,
      serviceArea: profile.serviceArea,
      demandType: actionSpec.targeting.base.service.demandType,
      intentLevel: actionSpec.targeting.intent.level,
      jobValueTier: actionSpec.targeting.economics.jobValueTier,
      existingKeywordThemes:
        actionSpec.targeting.platforms.googleAds.keywordThemes,
      existingNegativeKeywords:
        actionSpec.targeting.wasteControls.negativeKeywordThemes,
      promotionalContext,
    });
  } catch (e) {
    console.error("Targeting AI refinement failed", e);
  }
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

  const includedAssetTypes: AssetType[] = getAssetTypesForAction({
    ownerObjective: routedIntent.ownerObjective,
    executionMode: effectiveExecutionMode,
    actionType: effectiveActionType,
    campaignType: campaignDraft.campaignType,
    routedLane: routedIntent.lane,
    opportunityType: resolvedOpportunity.opportunityType,
  });

  const revenueContentPackage =
  includedAssetTypes.includes("BLOG")
    ? await generateRevenueContentPackageWithAI({
        ownerObjective:
          routedIntent.ownerObjective,

        businessName:
          profile.businessName,

        serviceName:
          finalActionThesis.primaryService,

        serviceArea:
          profile.serviceArea,

        actionTitle:
          finalActionThesis.title,

        actionSummary:
          finalActionThesis.summary,

        targetAudience:
          actionSpec.targetAudience,

        offer:
          sanitizeCustomerFacingOffer(
            actionSpec.offerLabel
          ),

        cta:
          finalActionThesis.ctaHint,
      })
    : null;

  const actionSeoStrategy =
    includedAssetTypes.includes("BLOG")
      ? revenueContentPackage?.actionSeoStrategy ??
        buildFallbackActionSeoStrategy({
          businessName:
            profile.businessName,

          serviceName:
            finalActionThesis.primaryService,

          serviceArea:
            profile.serviceArea,

          actionTitle:
            finalActionThesis.title,

          actionSummary:
            finalActionThesis.summary,

          offer:
            actionSpec.offerLabel,
        })
      : null;

  const generatedAdCopy = await generateAdCopyWithAI({
    ownerObjective: routedIntent.ownerObjective,
    businessName: profile.businessName,
    serviceArea: profile.serviceArea,
    targetService: finalActionThesis.primaryService,
    actionTitle: finalActionThesis.title,
    actionSummary: finalActionThesis.summary,
    targetAudience: actionSpec.targetAudience,
    offer: actionSpec.offerLabel,
    cta: finalActionThesis.ctaHint,
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
        ownerObjective: routedIntent.ownerObjective,

        objectiveSignals:
          resolveResidentialOwnerObjective(cleanedPrompt).matchedSignals,

        launchReadiness: "READY_FOR_REVIEW",

        referralIncentiveProvided:
          routedIntent.ownerObjective === "REFERRAL_GROWTH"
            ? hasExplicitReferralIncentive(cleanedPrompt)
            : null,
        promotionalContext: toPrismaJsonValue(promotionalContext),
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
        actionThesis: finalActionThesis,
        nextBestAction: {
          ...parsed.nextBestAction,
          executionMode: effectiveExecutionMode,
          actionType: effectiveActionType,
          title: finalActionThesis.title,
          summary: finalActionThesis.summary,
        },
        actionPack: parsed.actionPack,
        actionSpec: toPrismaJsonValue(actionSpec),

        actionSeoStrategy:
          actionSeoStrategy
            ? toPrismaJsonValue(
                actionSeoStrategy
              )
            : null,

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
        imageKey: finalActionThesis.imageKey,
        imageMode: finalActionThesis.imageMode,
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

  const googleBusinessImage =
    includedAssetTypes.includes("GOOGLE_BUSINESS") &&
    shouldGenerateAiImage({
    assetType: "GOOGLE_BUSINESS",
    imageMode: finalActionThesis.imageMode,
    isReviewAction: reviewAction,
    isVisibilityAction: visibilityAction,
  })
    ? await generateAndStoreCampaignImage({
        campaignId: campaign.id,
        assetType: "GOOGLE_BUSINESS",
        businessName: profile.businessName,
        serviceArea: profile.serviceArea,
        targetService: finalActionThesis.primaryService,
        actionTitle: finalActionThesis.title,
        actionSummary: finalActionThesis.summary,
        audience: actionSpec.targetAudience,
        offer: actionSpec.offerLabel,
        cta: actionSpec.cta,
      })
    : {
        url: null,
        prompt: null,
        status: "skipped" as const,
        mimeType: null,
      };

  const metaImage =
    includedAssetTypes.includes("META") &&
    shouldGenerateAiImage({
    assetType: "META",
    imageMode: finalActionThesis.imageMode,
    isReviewAction: reviewAction,
    isVisibilityAction: visibilityAction,
  })
    ? await generateAndStoreCampaignImage({
        campaignId: campaign.id,
        assetType: "META",
        businessName: profile.businessName,
        serviceArea: profile.serviceArea,
        targetService: finalActionThesis.primaryService,
        actionTitle: finalActionThesis.title,
        actionSummary: finalActionThesis.summary,
        audience: actionSpec.targetAudience,
        offer: actionSpec.offerLabel,
        cta: actionSpec.cta,
      })
    : {
        url: null,
        prompt: null,
        status: "skipped" as const,
        mimeType: null,
      };

  const googleAdsImage =
    includedAssetTypes.includes("GOOGLE_ADS") &&
    shouldGenerateAiImage({
    assetType: "GOOGLE_ADS",
    imageMode: finalActionThesis.imageMode,
    isReviewAction: reviewAction,
    isVisibilityAction: visibilityAction,
  })
    ? await generateAndStoreCampaignImage({
        campaignId: campaign.id,
        assetType: "GOOGLE_ADS",
        businessName: profile.businessName,
        serviceArea: profile.serviceArea,
        targetService: finalActionThesis.primaryService,
        actionTitle: finalActionThesis.title,
        actionSummary: finalActionThesis.summary,
        audience: actionSpec.targetAudience,
        offer: actionSpec.offerLabel,
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
        title: generatedAdCopy?.googleBusiness?.title ?? finalActionThesis.title,
        summary:
          generatedAdCopy?.googleBusiness?.description ??
          buildGoogleBusinessDescriptionFromAction({
            ownerObjective: routedIntent.ownerObjective,
            actionSummary: finalActionThesis.summary,
            serviceArea: profile.serviceArea,
            cta: finalActionThesis.ctaHint,
            offer: actionSpec.offerLabel,
            isReviewAction: reviewAction,
            isVisibilityAction: visibilityAction,
            targetService: finalActionThesis.primaryService,
          }),
        cta: generatedAdCopy?.googleBusiness?.cta ?? finalActionThesis.ctaHint,
        offer: sanitizeCustomerFacingOffer(actionSpec.offerLabel),
        imageKey: finalActionThesis.imageKey,
        imageMode: finalActionThesis.imageMode,
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
            actionTitle: finalActionThesis.title,
            ownerObjective: routedIntent.ownerObjective,
            targetService: finalActionThesis.primaryService,
            isReviewAction: reviewAction,
            isVisibilityAction: visibilityAction,
          }),
        primaryText:
          generatedAdCopy?.meta?.primaryText ??
          buildMetaPrimaryTextFromAction({
            ownerObjective: routedIntent.ownerObjective,
            actionSummary: finalActionThesis.summary,
            serviceArea: profile.serviceArea,
            cta: finalActionThesis.ctaHint,
            offer: actionSpec.offerLabel,
            isReviewAction: reviewAction,
            isVisibilityAction: visibilityAction,
            targetService: finalActionThesis.primaryService,
          }),
        cta: generatedAdCopy?.meta?.cta ?? finalActionThesis.ctaHint,
        offer: sanitizeCustomerFacingOffer(actionSpec.offerLabel),
        imageKey: finalActionThesis.imageKey,
        imageMode: finalActionThesis.imageMode,
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
        campaignId:
          campaign.id,

        assetType:
          "EMAIL",

        title:
          reviewAction
            ? "Review Request Email"
            : parsed.assets.emailCampaign
                .subjectLine ??
              "Email Campaign",

        content:
          buildEmailAssetFromAction({
            ownerObjective:
              routedIntent.ownerObjective,

            offer:
              actionSpec.offerLabel,

            actionTitle:
              finalActionThesis.title,

            actionSummary:
              finalActionThesis.summary,

            cta:
              finalActionThesis.ctaHint,

            targetService:
              finalActionThesis.primaryService,

            serviceArea:
              profile.serviceArea,

            isReviewAction:
              reviewAction,

            isVisibilityAction:
              visibilityAction,

            isOfferAction,

            generatedSubject:
              parsed.assets.emailCampaign
                .subjectLine,

            generatedBody:
              parsed.assets.emailCampaign
                .body,

            industry:
              structuredIndustry,
          }),
      });
    }

  if (includedAssetTypes.includes("BLOG")) {
    const articlePackage =
      buildStructuredRevenueArticleAssets({
        generatedPackage:
          revenueContentPackage,

        businessName:
          profile.businessName,

        serviceArea:
          profile.serviceArea,

        primaryService:
          finalActionThesis.primaryService,

        cta:
          finalActionThesis.ctaHint,

        imageKey:
          finalActionThesis.imageKey,

        imageMode:
          finalActionThesis.imageMode,

        industry:
          structuredIndustry,
      });

    assetData.push({
      campaignId:
        campaign.id,

      assetType:
        "BLOG",

      title:
        "Consumer Article",

      content:
        articlePackage.consumerArticle,
    });

    assetData.push({
      campaignId:
        campaign.id,

      assetType:
        "BLOG",

      title:
        "Knowledge / Authority Article",

      content:
        articlePackage.knowledgeArticle,
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

  if (assetData.length > 0) {
    await prisma.campaignAsset.createMany({
      data: assetData,
    });
  }

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