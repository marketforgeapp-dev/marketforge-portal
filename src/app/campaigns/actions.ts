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
import { getCampaignPerformanceSignals } from "@/lib/campaign-performance-signals";
import { invalidateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";
import type {
  CampaignObjective,
  CampaignType,
  OpportunityType,
} from "@/generated/prisma";

type CreateCampaignResult =
  | { success: true; campaignId: string; campaignName: string }
  | { success: false; error: string };

type EngineOpportunity = Awaited<
  ReturnType<typeof buildRevenueOpportunityEngine>
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

  if (
    lower.includes("water heater") ||
    lower.includes("hot water") ||
    lower.includes("tankless")
  ) {
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
    case "REVIEWS":
      return 65;
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
    (service.includes("drain") ||
      title.includes("drain") ||
      bestMove.includes("drain") ||
      displayMove.includes("drain"))
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "EMERGENCY" &&
    (service.includes("emergency") ||
      title.includes("emergency") ||
      bestMove.includes("emergency") ||
      displayMove.includes("emergency"))
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "WATER_HEATER" &&
    (service.includes("water heater") ||
      service.includes("tankless") ||
      title.includes("water heater") ||
      bestMove.includes("water heater") ||
      displayMove.includes("water heater") ||
      displayMove.includes("tankless"))
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
    opportunity.recommendedCampaignType === "REVIEW_GENERATION"
  ) {
    score += 35;
  }

  if (lowerPrompt.includes("tankless") && displayMove.includes("tankless")) {
    score += 20;
  }

  if (lowerPrompt.includes("install") && displayMove.includes("install")) {
    score += 10;
  }

  if (lowerPrompt.includes("upgrade") && displayMove.includes("upgrade")) {
    score += 10;
  }

  if (
    service.length > 0 &&
    (lowerPrompt.includes(service) ||
      lowerPrompt.includes(service.replace(/\s+/g, "-")) ||
      lowerPrompt.includes(service.replace(/\s+/g, " ")))
  ) {
    score += 40;
  }

  if (
    routedIntent.lane === "GENERAL" &&
    lowerPrompt.includes("sump pump") &&
    service.includes("sump pump")
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "GENERAL" &&
    lowerPrompt.includes("leak") &&
    service.includes("leak")
  ) {
    score += 35;
  }

  if (
    routedIntent.lane === "GENERAL" &&
    lowerPrompt.includes("toilet") &&
    service.includes("toilet")
  ) {
    score += 35;
  }

  return Math.max(0, Math.round(score));
}

function buildPromptRefinedActionThesis(params: {
  prompt: string;
  resolvedOpportunity: Pick<
    ResolvedOpportunity,
    "familyKey" | "actionThesis" | "displayMoveLabel"
  >;
  serviceArea: string;
}): ActionThesis & { whyThisActionBullets: string[] } {
  const { prompt, resolvedOpportunity, serviceArea } = params;
  const lower = normalize(prompt);
  const base = resolvedOpportunity.actionThesis;

  if (resolvedOpportunity.familyKey === "water-heater") {
    const isTankless = lower.includes("tankless");
    const isInstall = lower.includes("install");
    const isUpgrade = lower.includes("upgrade");
    const isReplacement = lower.includes("replacement") && !isTankless;

    if (isTankless) {
      return {
        familyKey: base.familyKey,
        primaryService: "Tankless water heater",
        angle: "tankless install and upgrade",
        title: "Promote Tankless Water Heater Installs",
        summary:
          "Generate tankless water heater install and upgrade jobs with a high-intent local offer.",
        audience: `Homeowners in ${serviceArea} considering a tankless upgrade, conversion, or installation`,
        offerHint: "Tankless install offer or estimate-led upgrade push",
        ctaHint: "Schedule your tankless estimate",
        imageKey: "tankless-water-heater-install",
        imageMode: "SERVICE_IMAGE",
        whyThisActionBullets: [
          "The request is explicitly focused on tankless water heater jobs.",
          "Tankless demand usually comes from upgrade, efficiency, and modernization intent rather than only emergency replacement.",
          "This action is framed around install and upgrade positioning so the messaging matches the requested service.",
          "This is a strong fit for a high-value local action if capacity exists this week.",
        ],
      };
    }

    if (isReplacement) {
      return {
        ...base,
        primaryService: "Water heater replacement",
        angle: "replacement demand capture",
        title: "Promote Water Heater Replacement Jobs",
        summary:
          "Capture high-intent replacement demand from homeowners dealing with aging or failed systems.",
        audience: `Homeowners in ${serviceArea} evaluating water heater replacement`,
        offerHint: "Estimate-led replacement offer",
        ctaHint: "Schedule your replacement estimate",
        imageKey: "water-heater-install",
        imageMode: "SERVICE_IMAGE",
        whyThisActionBullets: [
          "The request points to water heater replacement demand.",
          "Replacement intent usually sits close to booking behavior because homeowners want hot water restored quickly.",
          "This action is framed around replacement messaging rather than a generic plumbing promotion.",
          "The service has strong revenue potential relative to everyday repair work.",
        ],
      };
    }

    if (isInstall || isUpgrade) {
      return {
        ...base,
        primaryService: "Water heater installation",
        angle: "install and upgrade",
        title: "Promote Water Heater Install & Upgrade Jobs",
        summary:
          "Generate local install and upgrade demand with messaging built around higher-value booked jobs.",
        audience: `Homeowners in ${serviceArea} considering a water heater install, upgrade, or replacement`,
        offerHint: "Installation offer or estimate-led promotion",
        ctaHint: "Book your estimate",
        imageKey: "water-heater-install",
        imageMode: "SERVICE_IMAGE",
        whyThisActionBullets: [
          "The request is focused on installation or upgrade demand.",
          "This action is positioned around install and upgrade jobs instead of broad plumbing language.",
          "Water heater work is commercially valuable and can convert well with clear local positioning.",
          "The action stays aligned to the requested service angle all the way through the assets.",
        ],
      };
    }
  }

  if (resolvedOpportunity.familyKey === "drain-cleaning") {
    return {
      ...base,
      whyThisActionBullets: [
        "The request maps cleanly to drain-service demand capture.",
        "Drain issues usually create strong near-booking intent when homeowners are dealing with backups, clogs, or slow flow.",
        "This action is designed to turn urgent local demand into booked jobs quickly.",
        "The offer and copy should stay direct-response and easy to approve fast.",
      ],
    };
  }

  if (resolvedOpportunity.familyKey === "ai-search-visibility") {
    return {
      ...base,
      whyThisActionBullets: [
        "The request is focused on answer-engine and local visibility improvements.",
        "This action is better handled through content and service-page improvements than a paid promotion.",
        "The company logo is the right visual anchor for this type of action.",
        "This work improves future discovery and trust rather than only immediate lead capture.",
      ],
    };
  }

  return {
    ...base,
    whyThisActionBullets: [
      "This action is the clearest match to the requested service and commercial goal.",
      "It is framed to be easy to review, approve, and execute quickly.",
      "The messaging stays aligned to the displayed move instead of drifting into a generic category.",
      "The goal is to generate believable local demand, not generic marketing copy.",
    ],
  };
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
    const bestMove = "Promote Drain Cleaning Service";
    const serviceName = "Drain cleaning";
    const opportunityType: OpportunityType = "SEASONAL_DEMAND";

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove,
      }),
      familyKey: "drain-cleaning",
      title: "Drain Cleaning Revenue Opportunity",
      serviceName,
      opportunityType,
      bestMove,
      displayMoveLabel: "Promote Drain Cleaning Service",
      displaySummary: `Capture urgent, high-intent drain demand in ${profile.serviceArea}.`,
      imageKey: "drain-cleaning",
      imageMode: "SERVICE_IMAGE",
      actionThesis: {
        familyKey: "drain-cleaning",
        primaryService: "Drain cleaning",
        angle: "direct-response demand capture",
        title: "Promote Drain Cleaning Service",
        summary:
          "Drive fast-turn drain cleaning bookings with a direct-response local push.",
        audience: `Homeowners in ${profile.serviceArea} dealing with clogs, backups, or slow drains`,
        offerHint: "Fast-response service offer",
        ctaHint: "Book service now",
        imageKey: "drain-cleaning",
        imageMode: "SERVICE_IMAGE",
      },
      recommendedCampaignType: "DRAIN_SPECIAL",
      jobsLow: 2,
      jobsHigh: 4,
      revenueLow: Math.round(averageJobValue * 2),
      revenueHigh: Math.round(averageJobValue * 4),
      rawOpportunityScore: 78,
      confidenceLabel: "Medium",
      confidenceScore: 72,
      whyNowBullets: [
        "The request is explicitly focused on drain cleaning demand.",
        "Drain-focused offers are usually practical, high-intent, and fast to approve.",
        "This is a better fit than reusing an unrelated existing opportunity.",
      ],
      whyThisMatters: `A drain-focused push is the most direct match to the request and should produce a more believable execution plan for ${profile.serviceArea}.`,
      sourceTags: ["Demand", "Capacity"],
      source: "generated",
      fitScore: 92,
    };
  }

  if (routedIntent.lane === "EMERGENCY") {
    const bestMove = "Push Emergency Plumbing Response";
    const serviceName = "Emergency plumbing";
    const opportunityType: OpportunityType = "COMPETITOR_INACTIVE";

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove,
      }),
      familyKey: "emergency-plumbing",
      title: "Emergency Plumbing Revenue Opportunity",
      serviceName,
      opportunityType,
      bestMove,
      displayMoveLabel: "Push Emergency Plumbing Response",
      displaySummary: `Capture urgent calls from homeowners who need immediate help in ${profile.serviceArea}.`,
      imageKey: "emergency-plumbing",
      imageMode: "SERVICE_IMAGE",
      actionThesis: {
        familyKey: "emergency-plumbing",
        primaryService: "Emergency plumbing",
        angle: "urgent response",
        title: "Push Emergency Plumbing Response",
        summary:
          "Capture urgent same-day demand with fast-response emergency positioning.",
        audience: `Homeowners in ${profile.serviceArea} needing immediate plumbing help`,
        offerHint: "Fast response and availability",
        ctaHint: "Call now",
        imageKey: "emergency-plumbing",
        imageMode: "SERVICE_IMAGE",
      },
      recommendedCampaignType: "EMERGENCY_SERVICE",
      jobsLow: 1,
      jobsHigh: 3,
      revenueLow: Math.round(averageJobValue * 1.2),
      revenueHigh: Math.round(averageJobValue * 3.2),
      rawOpportunityScore: 76,
      confidenceLabel: "Medium",
      confidenceScore: 70,
      whyNowBullets: [
        "The request is explicitly for emergency plumbing promotion.",
        "Emergency-response messaging should stay in an urgency-based action lane.",
        "This is more relevant than borrowing a non-emergency opportunity.",
      ],
      whyThisMatters:
        "An emergency-service action is the strongest direct match to the prompt and should feel more trustworthy than forcing an unrelated opportunity.",
      sourceTags: ["Demand", "Competitor"],
      source: "generated",
      fitScore: 91,
    };
  }

  if (routedIntent.lane === "WATER_HEATER") {
    const bestMove = "Promote Water Heater Install & Upgrade Jobs";
    const serviceName = lowerPrompt.includes("tankless")
      ? "Tankless water heater"
      : "Water heater service";
    const opportunityType: OpportunityType = "HIGH_VALUE_SERVICE";

    const thesis = lowerPrompt.includes("tankless")
      ? {
          familyKey: "water-heater",
          primaryService: "Tankless water heater",
          angle: "tankless install and upgrade",
          title: "Promote Tankless Water Heater Installs",
          summary:
            "Generate tankless install and upgrade jobs with a high-intent local offer.",
          audience: `Homeowners in ${profile.serviceArea} considering a tankless upgrade, conversion, or installation`,
          offerHint: "Tankless install offer or estimate-led upgrade push",
          ctaHint: "Schedule your tankless estimate",
          imageKey: "tankless-water-heater-install",
          imageMode: "SERVICE_IMAGE" as const,
        }
      : {
          familyKey: "water-heater",
          primaryService: "Water heater service",
          angle: "install and upgrade",
          title: "Promote Water Heater Install & Upgrade Jobs",
          summary:
            "Generate local install and upgrade demand with messaging built around higher-value booked jobs.",
          audience: `Homeowners in ${profile.serviceArea} considering a water heater install, upgrade, or replacement`,
          offerHint: "Installation offer or estimate-led promotion",
          ctaHint: "Book your estimate",
          imageKey: "water-heater-install",
          imageMode: "SERVICE_IMAGE" as const,
        };

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove,
      }),
      familyKey: "water-heater",
      title: "Water Heater Revenue Opportunity",
      serviceName,
      opportunityType,
      bestMove,
      displayMoveLabel: thesis.title,
      displaySummary: thesis.summary,
      imageKey: thesis.imageKey,
      imageMode: thesis.imageMode,
      actionThesis: thesis,
      recommendedCampaignType: "WATER_HEATER",
      jobsLow: 1,
      jobsHigh: 3,
      revenueLow: Math.round(averageJobValue * 2.5),
      revenueHigh: Math.round(averageJobValue * 5),
      rawOpportunityScore: 82,
      confidenceLabel: "Medium",
      confidenceScore: 76,
      whyNowBullets: [
        "The request is explicitly focused on water heater demand.",
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
    const bestMove = "Fill This Week’s Schedule with Checkups";
    const serviceName = "Service checkup";
    const opportunityType: OpportunityType = "CAPACITY_GAP";

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove,
      }),
      familyKey: "maintenance",
      title: "Open Capacity Revenue Opportunity",
      serviceName,
      opportunityType,
      bestMove,
      displayMoveLabel: "Fill This Week’s Schedule with Checkups",
      displaySummary:
        "Use lower-friction service work to turn open capacity into booked jobs.",
      imageKey: "service-checkup",
      imageMode: "SERVICE_IMAGE",
      actionThesis: {
        familyKey: "maintenance",
        primaryService: "Service checkup",
        angle: "schedule fill",
        title: "Fill This Week’s Schedule with Checkups",
        summary:
          "Fill open technician capacity with easier-to-book preventative or checkup work.",
        audience: `Homeowners in ${profile.serviceArea} open to proactive service and seasonal checkups`,
        offerHint: "Simple entry offer",
        ctaHint: "Book now",
        imageKey: "service-checkup",
        imageMode: "SERVICE_IMAGE",
      },
      recommendedCampaignType: "MAINTENANCE_PUSH",
      jobsLow: 2,
      jobsHigh: 5,
      revenueLow: Math.round(averageJobValue * 1.5),
      revenueHigh: Math.round(averageJobValue * 3.5),
      rawOpportunityScore: 74,
      confidenceLabel: "Medium",
      confidenceScore: 74,
      whyNowBullets: [
        "The request is to fill schedule capacity, not to chase the largest-ticket work.",
        "Lower-friction maintenance offers are a more natural schedule-fill move.",
        "This avoids mismatching the prompt to heavy repair work.",
      ],
      whyThisMatters:
        "A capacity-fill action should prioritize easier-to-book work rather than large repair jobs.",
      sourceTags: ["Capacity", "Demand"],
      source: "generated",
      fitScore: 94,
    };
  }

  if (routedIntent.lane === "AEO_SEO") {
    const bestMove = "Improve AI Search Visibility";
    const serviceName = "AI search visibility";
    const opportunityType: OpportunityType = "AI_SEARCH_VISIBILITY";

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove,
      }),
      familyKey: "ai-search-visibility",
      title: "AI Search Visibility Opportunity",
      serviceName,
      opportunityType,
      bestMove,
      displayMoveLabel: "Improve AI Search Visibility",
      displaySummary: `Strengthen local answer-engine visibility for key service searches in ${profile.serviceArea}.`,
      imageKey: "company-logo",
      imageMode: "LOGO",
      actionThesis: {
        familyKey: "ai-search-visibility",
        primaryService: "AI search visibility",
        angle: "answer-engine visibility",
        title: "Improve AI Search Visibility",
        summary:
          "Improve discoverability through FAQ, GBP, and service-page upgrades.",
        audience: `Homeowners searching for service help in ${profile.serviceArea}`,
        offerHint: "Clear answers and stronger local visibility",
        ctaHint: "Improve visibility",
        imageKey: "company-logo",
        imageMode: "LOGO",
      },
      recommendedCampaignType: "AEO_FAQ",
      jobsLow: 1,
      jobsHigh: 2,
      revenueLow: Math.round(averageJobValue * 1),
      revenueHigh: Math.round(averageJobValue * 2),
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
        "This is the most direct match to an AEO-oriented request and should not be forced through an unrelated service opportunity.",
      sourceTags: ["AEO", "Demand"],
      source: "generated",
      fitScore: 95,
    };
  }

  if (routedIntent.lane === "REVIEWS") {
    const bestMove = "Improve Review Generation";
    const serviceName = "Review generation";
    const opportunityType: OpportunityType = "LOCAL_SEARCH_SPIKE";

    return {
      opportunityKey: buildSyntheticOpportunityKey({
        serviceName,
        opportunityType,
        bestMove,
      }),
      familyKey: "general-plumbing",
      title: "Review Generation Opportunity",
      serviceName,
      opportunityType,
      bestMove,
      displayMoveLabel: "Improve Review Generation",
      displaySummary: `Strengthen local trust and conversion with a focused review-generation action in ${profile.serviceArea}.`,
      imageKey: "general-plumbing",
      imageMode: "SERVICE_IMAGE",
      actionThesis: {
        familyKey: "general-plumbing",
        primaryService: "Review generation",
        angle: "trust building",
        title: "Improve Review Generation",
        summary:
          "Generate more recent customer reviews to support local conversion and trust.",
        audience: `Recent customers in ${profile.serviceArea}`,
        offerHint: "Simple follow-up review request",
        ctaHint: "Request review",
        imageKey: "general-plumbing",
        imageMode: "SERVICE_IMAGE",
      },
      recommendedCampaignType: "REVIEW_GENERATION",
      jobsLow: 1,
      jobsHigh: 2,
      revenueLow: Math.round(averageJobValue * 1),
      revenueHigh: Math.round(averageJobValue * 2),
      rawOpportunityScore: 64,
      confidenceLabel: "Medium",
      confidenceScore: 68,
      whyNowBullets: [
        "The request is explicitly about reviews.",
        "Fresh reviews improve trust and local conversion over time.",
        "This is more credible than forcing the request into a service-promotion lane.",
      ],
      whyThisMatters:
        "A review-focused request should produce a review-focused action.",
      sourceTags: ["Demand"],
      source: "generated",
      fitScore: 88,
    };
  }

  const bestMove = "Promote Local Service Demand";
  const serviceName = lowerPrompt.includes("plumb")
    ? "General plumbing"
    : "Local service demand";
  const opportunityType: OpportunityType = "LOCAL_SEARCH_SPIKE";

  return {
    opportunityKey: buildSyntheticOpportunityKey({
      serviceName,
      opportunityType,
      bestMove,
    }),
    familyKey: "general-plumbing",
    title: "Prompt-Aligned Revenue Opportunity",
    serviceName,
    opportunityType,
    bestMove,
    displayMoveLabel: "Promote Local Service Demand",
    displaySummary: `Build a prompt-aligned local action for ${profile.serviceArea}.`,
    imageKey: "general-plumbing",
    imageMode: "SERVICE_IMAGE",
    actionThesis: {
      familyKey: "general-plumbing",
      primaryService: serviceName,
      angle: "local demand capture",
      title: "Promote Local Service Demand",
      summary:
        "Generate more local demand with a prompt-aligned action instead of forcing a weak category match.",
      audience: `Homeowners in ${profile.serviceArea}`,
      offerHint: "Compelling local service offer",
      ctaHint: "Book now",
      imageKey: "general-plumbing",
      imageMode: "SERVICE_IMAGE",
    },
    recommendedCampaignType: "CUSTOM",
    jobsLow: 1,
    jobsHigh: 3,
    revenueLow: Math.round(averageJobValue * 1),
    revenueHigh: Math.round(averageJobValue * 3),
    rawOpportunityScore: 60,
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
  actionThesis: ActionThesis & { whyThisActionBullets?: string[] };
}) {
  const {
    actionTitle,
    actionSummary,
    targetService,
    serviceArea,
    campaignType,
    objective,
    actionThesis,
  } = params;

  const offer =
    campaignType === "AEO_FAQ"
      ? actionThesis.offerHint
      : campaignType === "DRAIN_SPECIAL"
        ? "$79 Drain Cleaning Special"
        : campaignType === "WATER_HEATER"
          ? actionThesis.offerHint
          : campaignType === "EMERGENCY_SERVICE"
            ? "Fast Emergency Service"
            : campaignType === "MAINTENANCE_PUSH"
              ? "Seasonal Checkup Offer"
              : actionThesis.offerHint;

  const cta =
    campaignType === "AEO_FAQ" || campaignType === "SEO_CONTENT"
      ? actionThesis.ctaHint
      : campaignType === "EMERGENCY_SERVICE"
        ? "Call now"
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

  const resolvedOpportunity: ResolvedOpportunity =
    bestExistingMatch && bestExistingMatch.fitScore >= strongMatchThreshold
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
- Do not drift back to a broader service category if the action thesis is more specific.
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
    imageKey: parsed.actionThesis.imageKey || refinedActionThesis.imageKey,
    imageMode: parsed.actionThesis.imageMode || refinedActionThesis.imageMode,
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

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: workspace.id,
      recommendationId: null,
      revenueOpportunityId: null,
      name: campaignName,
      campaignType: campaignDraft.campaignType,
      objective: campaignDraft.objective,
      targetService: campaignDraft.targetService,
      offer: campaignDraft.offer,
      audience: campaignDraft.audience,
      serviceArea: profile.serviceArea,
      estimatedLeads,
      estimatedBookedJobs,
      estimatedRevenue,
      status: "DRAFT",
      qualityReviewStatus: "PENDING",
      briefJson: {
        userPrompt: cleanedPrompt,
        parsedIntent: parsed.parsedIntent,
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
        campaignDraft,
        creativeGuidance: campaignDraft.creativeGuidance,
        matchedOpportunityKey: resolvedOpportunity.opportunityKey,
        matchedOpportunityTitle: resolvedOpportunity.title,
        matchedOpportunitySource: resolvedOpportunity.source,
        matchedOpportunityFitScore: resolvedOpportunity.fitScore,
        matchedFamilyKey: resolvedOpportunity.familyKey,
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

  await invalidateWorkspaceOpportunitySnapshot(workspace.id);

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

  return createCampaignFromPrompt(prompt);
}