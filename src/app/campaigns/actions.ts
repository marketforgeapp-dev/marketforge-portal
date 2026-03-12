"use server";

import { auth } from "@clerk/nextjs/server";
import { zodResponseFormat } from "openai/helpers/zod";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { nlCampaignSchema } from "@/lib/nl-campaign-schema";
import { buildRevenueOpportunityEngine } from "@/lib/revenue-opportunity-engine";
import { getCampaignPerformanceSignals } from "@/lib/campaign-performance-signals";
import type {
  CampaignObjective,
  CampaignType,
  OpportunityType,
} from "@/generated/prisma";

type CreateCampaignResult =
  | { success: true; campaignId: string; campaignName: string }
  | { success: false; error: string };

type EngineOpportunity = ReturnType<
  typeof buildRevenueOpportunityEngine
>["rankedOpportunities"][number];

type PromptLane =
  | "DRAIN"
  | "EMERGENCY"
  | "WATER_HEATER"
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
  title: string;
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
  recommendedCampaignType: CampaignType;
  jobsLow: number;
  jobsHigh: number;
  revenueLow: number;
  revenueHigh: number;
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
    case "CAMPAIGN_LAUNCH":
      return "CUSTOM";
    case "GBP_OPTIMIZATION":
      return "CUSTOM";
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

  if (lower.includes("drain")) {
    return {
      lane: "DRAIN",
      mode: "CAMPAIGN",
      preferredCampaignType: "DRAIN_SPECIAL",
      preferredActionType: "CAMPAIGN_LAUNCH",
      label: "Drain intent",
    };
  }

  if (lower.includes("emergency")) {
    return {
      lane: "EMERGENCY",
      mode: "CAMPAIGN",
      preferredCampaignType: "EMERGENCY_SERVICE",
      preferredActionType: "CAMPAIGN_LAUNCH",
      label: "Emergency intent",
    };
  }

  if (lower.includes("water heater") || lower.includes("hot water")) {
    return {
      lane: "WATER_HEATER",
      mode: "CAMPAIGN",
      preferredCampaignType: "WATER_HEATER",
      preferredActionType: "HIGH_VALUE_SERVICE_PUSH",
      label: "Water heater intent",
    };
  }

  if (lower.includes("slow week") || lower.includes("fill the schedule")) {
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

  return {
    lane: "GENERAL",
    mode: "AUTO",
    label: "Auto intent",
  };
}

function getStrongMatchThreshold(lane: PromptLane): number {
  switch (lane) {
    case "DRAIN":
    case "EMERGENCY":
    case "WATER_HEATER":
      return 70;
    case "CAPACITY_FILL":
      return 68;
    case "AEO_SEO":
      return 65;
    case "REVIEWS":
      return 65;
    case "GENERAL":
    default:
      return 58;
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

  let score = 0;

  score += Math.min(opportunity.rawOpportunityScore * 0.35, 35);

  if (
    routedIntent.preferredCampaignType &&
    opportunity.recommendedCampaignType === routedIntent.preferredCampaignType
  ) {
    score += 30;
  }

  if (
    routedIntent.lane === "DRAIN" &&
    (service.includes("drain") || title.includes("drain") || bestMove.includes("drain"))
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "EMERGENCY" &&
    (service.includes("emergency") ||
      title.includes("emergency") ||
      bestMove.includes("emergency"))
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "WATER_HEATER" &&
    (service.includes("water heater") ||
      title.includes("water heater") ||
      bestMove.includes("water heater"))
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "CAPACITY_FILL" &&
    (opportunity.opportunityType === "CAPACITY_GAP" ||
      opportunity.recommendedCampaignType === "MAINTENANCE_PUSH" ||
      service.includes("maintenance") ||
      bestMove.includes("checkup"))
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
    (opportunity.opportunityType === "REVIEW_SENTIMENT_SHIFT" ||
      opportunity.recommendedCampaignType === "REVIEW_GENERATION")
  ) {
    score += 35;
  }

  if (lowerPrompt.includes("drain") && service.includes("drain")) score += 12;
  if (lowerPrompt.includes("emergency") && service.includes("emergency")) score += 12;
  if (
    (lowerPrompt.includes("water heater") || lowerPrompt.includes("hot water")) &&
    service.includes("water heater")
  ) {
    score += 12;
  }

  if (
    routedIntent.lane === "CAPACITY_FILL" &&
    (service.includes("pipe repair") || title.includes("pipe repair"))
  ) {
    score -= 25;
  }

  if (
    routedIntent.lane === "DRAIN" &&
    (service.includes("water heater") || title.includes("water heater"))
  ) {
    score -= 30;
  }

  if (
    routedIntent.lane === "EMERGENCY" &&
    (service.includes("water heater") || title.includes("water heater"))
  ) {
    score -= 30;
  }

  if (
    routedIntent.lane === "AEO_SEO" &&
    opportunity.recommendedCampaignType !== "AEO_FAQ" &&
    opportunity.recommendedCampaignType !== "SEO_CONTENT"
  ) {
    score -= 18;
  }

  return Math.max(0, Math.round(score));
}

function buildSyntheticOpportunity(params: {
  prompt: string;
  routedIntent: RoutedIntent;
  profile: {
    businessName: string;
    serviceArea: string;
    averageJobValue: unknown;
    hasFaqContent: boolean;
    servicePageUrls: string[];
  };
}): ResolvedOpportunity {
  const { prompt, routedIntent, profile } = params;
  const averageJobValue = Number(profile.averageJobValue ?? 450);
  const lowerPrompt = normalize(prompt);

  if (routedIntent.lane === "DRAIN") {
    return {
      title: "Drain Cleaning Demand Opportunity",
      serviceName: "Drain Cleaning",
      opportunityType: "SEASONAL_DEMAND",
      bestMove: "Drain Cleaning Special",
      recommendedCampaignType: "DRAIN_SPECIAL",
      jobsLow: 2,
      jobsHigh: 4,
      revenueLow: Math.round(averageJobValue * 2),
      revenueHigh: Math.round(averageJobValue * 4),
      confidenceLabel: "Medium",
      confidenceScore: 72,
      whyNowBullets: [
        "The request is explicitly focused on drain cleaning demand.",
        "Drain-focused offers are usually a practical fast-conversion service line.",
        "This is a better fit than reusing an unrelated existing opportunity.",
      ],
      whyThisMatters:
        `A drain-focused push is the most direct match to the request and should produce a more believable execution plan for ${profile.serviceArea}.`,
      sourceTags: ["Demand", "Capacity"],
      source: "generated",
      fitScore: 92,
    };
  }

  if (routedIntent.lane === "EMERGENCY") {
    return {
      title: "Emergency Plumbing Response Opportunity",
      serviceName: "Emergency Plumbing",
      opportunityType: "COMPETITOR_INACTIVE",
      bestMove: "Emergency Plumbing Response Campaign",
      recommendedCampaignType: "EMERGENCY_SERVICE",
      jobsLow: 1,
      jobsHigh: 3,
      revenueLow: Math.round(averageJobValue * 1.2),
      revenueHigh: Math.round(averageJobValue * 3.2),
      confidenceLabel: "Medium",
      confidenceScore: 70,
      whyNowBullets: [
        "The request is explicitly for emergency plumbing promotion.",
        "Emergency-response messaging should be routed into an urgency-based action lane.",
        "This is more relevant than borrowing a non-emergency opportunity.",
      ],
      whyThisMatters:
        `An emergency-service action is the strongest direct match to the prompt and should feel more trustworthy than forcing an unrelated opportunity.`,
      sourceTags: ["Demand", "Competitor"],
      source: "generated",
      fitScore: 91,
    };
  }

  if (routedIntent.lane === "WATER_HEATER") {
    return {
      title: "Water Heater Install Opportunity",
      serviceName: "Water Heater Replacement",
      opportunityType: "HIGH_VALUE_SERVICE",
      bestMove: "Water Heater Upgrade Push",
      recommendedCampaignType: "WATER_HEATER",
      jobsLow: 1,
      jobsHigh: 3,
      revenueLow: Math.round(averageJobValue * 2.5),
      revenueHigh: Math.round(averageJobValue * 5),
      confidenceLabel: "Medium",
      confidenceScore: 76,
      whyNowBullets: [
        "The request is explicitly for more water heater installs.",
        "This is a high-value service lane with clear commercial relevance.",
        "The opportunity is being synthesized because prompt relevance is stronger than existing-match quality.",
      ],
      whyThisMatters:
        "A dedicated water-heater opportunity is more credible here than attaching the prompt to a weaker existing match.",
      sourceTags: ["Service Value", "Demand"],
      source: "generated",
      fitScore: 93,
    };
  }

  if (routedIntent.lane === "CAPACITY_FILL") {
    return {
      title: "Schedule-Fill Maintenance Opportunity",
      serviceName: "Preventative Plumbing Maintenance",
      opportunityType: "CAPACITY_GAP",
      bestMove: "Plumbing Maintenance Checkup",
      recommendedCampaignType: "MAINTENANCE_PUSH",
      jobsLow: 2,
      jobsHigh: 5,
      revenueLow: Math.round(averageJobValue * 1.5),
      revenueHigh: Math.round(averageJobValue * 3.5),
      confidenceLabel: "Medium",
      confidenceScore: 74,
      whyNowBullets: [
        "The request is to fill schedule capacity, not to chase the largest-ticket work.",
        "Lower-friction maintenance offers are a more natural schedule-fill move.",
        "This avoids mismatching the prompt to heavy repair work.",
      ],
      whyThisMatters:
        "A capacity-fill action should prioritize easier-to-book work rather than large pipe-repair style jobs.",
      sourceTags: ["Capacity", "Demand"],
      source: "generated",
      fitScore: 94,
    };
  }

  if (routedIntent.lane === "AEO_SEO") {
    return {
      title: "AI Search Visibility Opportunity",
      serviceName: "AI Search Visibility",
      opportunityType: "AI_SEARCH_VISIBILITY",
      bestMove: "AI Answer Visibility FAQs",
      recommendedCampaignType: "AEO_FAQ",
      jobsLow: 1,
      jobsHigh: 2,
      revenueLow: Math.round(averageJobValue * 1),
      revenueHigh: Math.round(averageJobValue * 2),
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
        "This is the most direct match to an AEO-oriented request and should not be forced through an unrelated service opportunity.",
      sourceTags: ["AEO", "Demand"],
      source: "generated",
      fitScore: 95,
    };
  }

  if (routedIntent.lane === "REVIEWS") {
    return {
      title: "Review Recovery Opportunity",
      serviceName: "Review Generation",
      opportunityType: "REVIEW_SENTIMENT_SHIFT",
      bestMove: "Review Recovery Push",
      recommendedCampaignType: "REVIEW_GENERATION",
      jobsLow: 1,
      jobsHigh: 2,
      revenueLow: Math.round(averageJobValue * 0.8),
      revenueHigh: Math.round(averageJobValue * 1.6),
      confidenceLabel: "Medium",
      confidenceScore: 68,
      whyNowBullets: [
        "The request is explicitly focused on reviews.",
        "Review velocity supports trust and local conversion over time.",
        "A review-specific opportunity is more credible than reusing an unrelated action lane.",
      ],
      whyThisMatters:
        "A review-focused request should resolve to a review-focused opportunity.",
      sourceTags: ["Competitor", "Demand"],
      source: "generated",
      fitScore: 90,
    };
  }

  return {
    title: "Prompt-Aligned Revenue Opportunity",
    serviceName: lowerPrompt.includes("plumb") ? "General Plumbing" : "Local Service Demand",
    opportunityType: "LOCAL_SEARCH_SPIKE",
    bestMove: "Custom Revenue Opportunity",
    recommendedCampaignType: "CUSTOM",
    jobsLow: 1,
    jobsHigh: 3,
    revenueLow: Math.round(averageJobValue * 1),
    revenueHigh: Math.round(averageJobValue * 3),
    confidenceLabel: "Low",
    confidenceScore: 60,
    whyNowBullets: [
      "No strong existing opportunity matched the prompt cleanly.",
      "A prompt-aligned opportunity was synthesized to avoid a misleading pairing.",
      "This keeps the execution plan grounded in the request instead of forcing a stale match.",
    ],
    whyThisMatters:
      "When existing opportunities do not fit well enough, the system should build a better prompt-specific opportunity rather than guessing.",
    sourceTags: ["Demand"],
    source: "generated",
    fitScore: 80,
  };
}
function buildFallbackCampaignDraft(params: {
  actionTitle: string;
  actionSummary: string;
  targetService: string;
  serviceArea: string;
  campaignType: CampaignType;
  objective: CampaignObjective;
}) {
  const {
    actionTitle,
    actionSummary,
    targetService,
    serviceArea,
    campaignType,
    objective,
  } = params;

  const offer =
    campaignType === "AEO_FAQ"
      ? "Improve answer visibility for high-intent local searches"
      : campaignType === "SEO_CONTENT"
        ? "Strengthen service-page visibility and local search performance"
        : campaignType === "REVIEW_GENERATION"
          ? "Increase review velocity and local trust"
          : campaignType === "DRAIN_SPECIAL"
            ? "$79 Drain Cleaning Special"
            : campaignType === "WATER_HEATER"
              ? "Free Water Heater Replacement Estimate"
              : campaignType === "EMERGENCY_SERVICE"
                ? "Fast Emergency Plumbing Response"
                : campaignType === "MAINTENANCE_PUSH"
                  ? "Seasonal Plumbing Checkup"
                  : "Generate more qualified local demand";

  const audience =
    campaignType === "AEO_FAQ" || campaignType === "SEO_CONTENT"
      ? `Local homeowners searching for ${targetService.toLowerCase()} help in ${serviceArea}`
      : `Local homeowners in ${serviceArea}`;

  const cta =
    campaignType === "AEO_FAQ" || campaignType === "SEO_CONTENT"
      ? "Improve visibility and capture more inbound demand"
      : campaignType === "EMERGENCY_SERVICE"
        ? "Call now for fast service"
        : "Book now";

  return {
    title: actionTitle,
    description: actionSummary,
    campaignType,
    objective,
    targetService,
    offer,
    audience,
    cta,
    landingIntent:
      campaignType === "AEO_FAQ" || campaignType === "SEO_CONTENT"
        ? "Improve local search and answer-engine visibility"
        : "Convert local demand into booked jobs",
    creativeGuidance: {
      recommendedImage:
        campaignType === "AEO_FAQ" || campaignType === "SEO_CONTENT"
          ? "Use clean branded service imagery, local trust visuals, and educational problem-solution scenes."
          : "Use real service imagery that shows the technician, problem context, and trustworthy local service execution.",
      avoidImagery:
        "Avoid stock-looking generic imagery, exaggerated before/after visuals, and anything that feels fake or overly salesy.",
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
  actionType: string
) {
  const campaignType =
    resolvedOpportunity.recommendedCampaignType ??
    toCampaignTypeFromAction(actionType);

  const objective = toCampaignObjectiveFromAction(actionType);

  return buildFallbackCampaignDraft({
    actionTitle,
    actionSummary,
    targetService: resolvedOpportunity.serviceName,
    serviceArea: profile.serviceArea,
    campaignType,
    objective,
  });
}

export async function createCampaignFromPrompt(
  prompt: string
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
        error: "Complete onboarding before generating execution plans.",
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

    const engine = buildRevenueOpportunityEngine({
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
      .sort((a, b) => b.fitScore - a.fitScore || b.opportunity.rawOpportunityScore - a.opportunity.rawOpportunityScore);

    const bestExistingMatch = scoredExistingMatches[0] ?? null;
    const strongMatchThreshold = getStrongMatchThreshold(routedIntent.lane);

    const resolvedOpportunity: ResolvedOpportunity =
      bestExistingMatch && bestExistingMatch.fitScore >= strongMatchThreshold
        ? {
            title: bestExistingMatch.opportunity.title,
            serviceName: bestExistingMatch.opportunity.serviceName,
            opportunityType: bestExistingMatch.opportunity.opportunityType,
            bestMove: bestExistingMatch.opportunity.bestMove,
            recommendedCampaignType:
              bestExistingMatch.opportunity.recommendedCampaignType,
            jobsLow: bestExistingMatch.opportunity.jobsLow,
            jobsHigh: bestExistingMatch.opportunity.jobsHigh,
            revenueLow: bestExistingMatch.opportunity.revenueLow,
            revenueHigh: bestExistingMatch.opportunity.revenueHigh,
            confidenceLabel: bestExistingMatch.opportunity.confidenceLabel,
            confidenceScore: bestExistingMatch.opportunity.confidenceScore,
            whyNowBullets: bestExistingMatch.opportunity.whyNowBullets,
            whyThisMatters: bestExistingMatch.opportunity.whyThisMatters,
            sourceTags: bestExistingMatch.opportunity.sourceTags,
            source: "existing",
            fitScore: bestExistingMatch.fitScore,
          }
        : buildSyntheticOpportunity({
            prompt: cleanedPrompt,
            routedIntent,
            profile: {
              businessName: profile.businessName,
              serviceArea: profile.serviceArea,
              averageJobValue: profile.averageJobValue,
              hasFaqContent: profile.hasFaqContent,
              servicePageUrls: profile.servicePageUrls,
            },
          });

    const systemPrompt = `
You are the MarketForge next-best-action planner for local home-service businesses.

Your job is to:
1. Parse the user's request.
2. Use the resolved opportunity provided below as the primary anchor.
3. Generate the best next action for that opportunity.
4. Generate execution-ready assets and guidance.

Critical rules:
- The resolved opportunity has already been selected by the product control layer.
- Do not switch to a different opportunity family unless the resolved opportunity is obviously invalid.
- Respect explicit user intent.
- Keep the language trustworthy, local, direct, and practical.
- Never sound like a generic marketing agency.
- Avoid hype or fake certainty.

Output rules:
- Always populate nextBestAction.
- Always populate actionPack.
- If the request is campaign-like, populate campaign.
- If the request is AEO/SEO-like, campaign may be null.
- matchedOpportunityTitle should align to the resolved opportunity title.
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
Service: ${resolvedOpportunity.serviceName}
Type: ${resolvedOpportunity.opportunityType}
Recommended Action: ${resolvedOpportunity.bestMove}
Campaign Type: ${resolvedOpportunity.recommendedCampaignType}
Jobs: ${resolvedOpportunity.jobsLow}-${resolvedOpportunity.jobsHigh}
Revenue: ${resolvedOpportunity.revenueLow}-${resolvedOpportunity.revenueHigh}
Confidence: ${resolvedOpportunity.confidenceLabel} (${resolvedOpportunity.confidenceScore}%)
Signals: ${resolvedOpportunity.sourceTags.join(" | ")}
Why Now: ${resolvedOpportunity.whyNowBullets.join(" | ")}
Why This Matters: ${resolvedOpportunity.whyThisMatters}

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
        error: "The AI response could not be parsed into an execution plan.",
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

    const campaignDraft =
      parsed.campaign ??
      buildFallbackCampaignFromResolvedOpportunity(
        resolvedOpportunity,
        { serviceArea: profile.serviceArea },
        parsed.nextBestAction.title,
        parsed.nextBestAction.summary,
        effectiveActionType
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

    const campaign = await prisma.campaign.create({
      data: {
        workspaceId: workspace.id,
        recommendationId: null,
        revenueOpportunityId: null,
        name: campaignDraft.title,
        campaignType: campaignDraft.campaignType,
        objective: campaignDraft.objective,
        targetService: campaignDraft.targetService,
        offer: campaignDraft.offer,
        audience: campaignDraft.audience,
        serviceArea: profile.serviceArea,
        estimatedLeads,
        estimatedBookedJobs,
        estimatedRevenue,
        status: "READY",
        qualityReviewStatus: "PENDING",
        briefJson: {
          userPrompt: cleanedPrompt,
          parsedIntent: parsed.parsedIntent,
          opportunityCheck: {
            ...parsed.opportunityCheck,
            matchedOpportunityTitle: resolvedOpportunity.title,
          },
          nextBestAction: {
            ...parsed.nextBestAction,
            executionMode: effectiveExecutionMode,
            actionType: effectiveActionType,
          },
          actionPack: parsed.actionPack,
          campaignDraft,
          creativeGuidance: campaignDraft.creativeGuidance,
          matchedOpportunityTitle: resolvedOpportunity.title,
          matchedOpportunitySource: resolvedOpportunity.source,
          matchedOpportunityFitScore: resolvedOpportunity.fitScore,
          routedIntent: routedIntent.label,
          routedLane: routedIntent.lane,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    await prisma.campaignAsset.createMany({
      data: [
        {
          campaignId: campaign.id,
          assetType: "GOOGLE_BUSINESS",
          title:
            effectiveExecutionMode === "ACTION_PACK"
              ? "Google Business Action Draft"
              : "Google Business Post",
          content: parsed.assets.googleBusinessPost,
        },
        {
          campaignId: campaign.id,
          assetType: "META",
          title:
            effectiveExecutionMode === "ACTION_PACK"
              ? "Meta Action Draft"
              : "Meta Ad Copy",
          content: parsed.assets.metaAdCopy,
        },
        {
          campaignId: campaign.id,
          assetType: "GOOGLE_ADS",
          title: "Google Ads Copy",
          content: formatGoogleAds(parsed.assets.googleAds),
        },
        {
          campaignId: campaign.id,
          assetType: "YELP",
          title: "Yelp Ad Copy",
          content: formatYelp(parsed.assets.yelpAd),
        },
        {
          campaignId: campaign.id,
          assetType: "EMAIL",
          title: parsed.assets.emailCampaign.subjectLine,
          content: parsed.assets.emailCampaign.body,
        },
        {
          campaignId: campaign.id,
          assetType: "BLOG",
          title:
            effectiveExecutionMode === "ACTION_PACK"
              ? parsed.actionPack.actionTitle
              : "Blog Outline",
          content: parsed.assets.blogOutline,
        },
        {
          campaignId: campaign.id,
          assetType: "AEO_FAQ",
          title: "AEO FAQ",
          content: formatFaq(parsed.assets.aeoFaq),
        },
        {
          campaignId: campaign.id,
          assetType: "ANSWER_SNIPPET",
          title: "Answer Snippet",
          content: parsed.assets.answerSnippet,
        },
      ],
    });

    return {
      success: true,
      campaignId: campaign.id,
      campaignName: campaign.name,
    };
}