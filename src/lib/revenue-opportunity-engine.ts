import {
  BusinessProfile,
  Competitor,
  CampaignType,
  CapacityFit,
  OpportunityType,
} from "@/generated/prisma";
import {
  CampaignPerformanceSignal,
  CampaignPerformanceSignalMap,
} from "@/lib/campaign-performance-signals";
import {
  ActionFraming,
  InferredSignalLevel,
  getOpportunitySignalEnrichment,
} from "@/lib/opportunity-signal-enrichment";
import { resolveServiceJobValue } from "@/lib/service-pricing";
import {
  type ServiceBlueprint,
  getGuaranteedFamilyKeys,
} from "@/lib/industry-service-map";
import {
  buildCanonicalServices,
  getProfileIndustry,
  hasStrongAeoBaseline,
  type CanonicalService,
} from "@/lib/canonical-services";
import { getBlueprintForFamily } from "@/lib/industry-service-map";

export type OpportunitySourceTag =
  | "Demand"
  | "Competitor"
  | "Capacity"
  | "Service Value"
  | "AEO";

export type OpportunityConfidenceLabel = "Low" | "Medium" | "High";
export type OpportunityImageMode = "SERVICE_IMAGE" | "LOGO";

export type ActionThesis = {
  familyKey: string;
  primaryService: string;
  angle: string;
  title: string;
  summary: string;
  audience: string;
  offerHint: string;
  ctaHint: string;
  imageKey: string;
  imageMode: OpportunityImageMode;
};

export type RankedOpportunity = {
  opportunityKey: string;
  familyKey: string;
  title: string;
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
  displayMoveLabel: string;
  displaySummary: string;
  imageKey: string;
  imageMode: OpportunityImageMode;
  actionThesis: ActionThesis;
  recommendedCampaignType: CampaignType;
  jobsLow: number;
  jobsHigh: number;
  revenueLow: number;
  revenueHigh: number;
  rawOpportunityScore: number;
  confidenceScore: number;
  confidenceLabel: OpportunityConfidenceLabel;
  capacityFit: CapacityFit;
  sourceTags: OpportunitySourceTag[];
  whyNowBullets: string[];
  whyThisMatters: string;
  performanceLabel: "Strong" | "Promising" | "New";
  performanceDetail: string;
  historicalCampaignCount: number;
  seasonalityRelevance: InferredSignalLevel;
  seasonalityReason: string;
  urgencyRelevance: InferredSignalLevel;
  urgencyReason: string;
  homeownerIntentStrength: InferredSignalLevel;
  homeownerIntentReason: string;
  actionFraming: ActionFraming;
  actionFramingReason: string;
  eligibleForBacklog: boolean;
  eligibleForHero: boolean;
  isDeprioritized: boolean;
};

export type RevenueOpportunityHero = {
  title: string;
  opportunityTitle: string;
  opportunityType: OpportunityType;
  familyKey: string;
  jobsLow: number;
  jobsHigh: number;
  revenueLow: number;
  revenueHigh: number;
  rawOpportunityScore: number;
  headlineJobsText: string;
  headlineRevenueText: string;
  bestMove: string;
  displayMoveLabel: string;
  displaySummary: string;
  imageKey: string;
  imageMode: OpportunityImageMode;
  actionThesis: ActionThesis;
  recommendedCampaignType: CampaignType;
  whyNowBullets: string[];
  whyThisMatters: string;
  confidenceScore: number;
  confidenceLabel: OpportunityConfidenceLabel;
  sourceTags: OpportunitySourceTag[];
  capacityFit: CapacityFit;
  availableJobsEstimate: number;
  competitorSignal: string[];
  performanceLabel: "Strong" | "Promising" | "New";
  performanceDetail: string;
  historicalCampaignCount: number;
  seasonalityRelevance: InferredSignalLevel;
  seasonalityReason: string;
  urgencyRelevance: InferredSignalLevel;
  urgencyReason: string;
  homeownerIntentStrength: InferredSignalLevel;
  homeownerIntentReason: string;
  actionFraming: ActionFraming;
  actionFramingReason: string;
  opportunityKey: string;
};

export type RevenueOpportunityEngineResult = {
  hero: RevenueOpportunityHero;
  rankedOpportunities: RankedOpportunity[];
  availableJobsEstimate: number;
};

type SignalEnrichment = Awaited<
  ReturnType<typeof getOpportunitySignalEnrichment>
> extends Map<string, infer T>
  ? T
  : never;

type OpportunityCandidate = {
  familyKey: string;
  title: string;
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
  displayMoveLabel: string;
  displaySummary: string;
  imageKey: string;
  imageMode: OpportunityImageMode;
  actionThesis: ActionThesis;
  recommendedCampaignType: CampaignType;
  sourceTags: OpportunitySourceTag[];
  whyNowBullets: string[];
  whyThisMatters: string;
  rawOpportunityScore: number;
  seasonalityRelevance: InferredSignalLevel;
  seasonalityReason: string;
  urgencyRelevance: InferredSignalLevel;
  urgencyReason: string;
  homeownerIntentStrength: InferredSignalLevel;
  homeownerIntentReason: string;
  actionFraming: ActionFraming;
  actionFramingReason: string;
  eligibleForBacklog: boolean;
  eligibleForHero: boolean;
  isDeprioritized: boolean;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function slugify(value: string): string {
  return normalize(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function uniqueTags(tags: OpportunitySourceTag[]): OpportunitySourceTag[] {
  return Array.from(new Set(tags));
}

function levelToScore(level: InferredSignalLevel): number {
  if (level === "HIGH") return 12;
  if (level === "MEDIUM") return 6;
  return 0;
}

function confidenceLabelFromScore(score: number): OpportunityConfidenceLabel {
  return score >= 78 ? "High" : score >= 58 ? "Medium" : "Low";
}

function prettyServiceName(service: string): string {
  return service
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildOpportunityKey(params: {
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
}): string {
  return [
    slugify(params.serviceName),
    params.opportunityType,
    slugify(params.bestMove),
  ].join("::");
}

function inferCapacity(profile: BusinessProfile): {
  availableJobsEstimate: number;
  capacityScore: number;
  capacityFit: CapacityFit;
} {
  const weeklyCapacity =
    profile.weeklyCapacity ??
    (profile.technicians && profile.jobsPerTechnicianPerDay
      ? profile.technicians * profile.jobsPerTechnicianPerDay * 5
      : 0);

  if (!weeklyCapacity || weeklyCapacity <= 0) {
    return {
      availableJobsEstimate: 2,
      capacityScore: 45,
      capacityFit: "LOW",
    };
  }

  const targetBookedJobs = profile.targetBookedJobsPerWeek;
  let availableJobsEstimate = 0;

  if (
    typeof targetBookedJobs === "number" &&
    Number.isFinite(targetBookedJobs)
  ) {
    availableJobsEstimate = Math.max(weeklyCapacity - targetBookedJobs, 0);
  } else {
    availableJobsEstimate = Math.max(Math.round(weeklyCapacity * 0.18), 2);
  }

  availableJobsEstimate = clamp(availableJobsEstimate, 1, 10);

  if (availableJobsEstimate >= 6) {
    return {
      availableJobsEstimate,
      capacityScore: 80,
      capacityFit: "HIGH",
    };
  }

  if (availableJobsEstimate >= 3) {
    return {
      availableJobsEstimate,
      capacityScore: 64,
      capacityFit: "MEDIUM",
    };
  }

  return {
    availableJobsEstimate,
    capacityScore: 44,
    capacityFit: "LOW",
  };
}

function inferConfidence(profile: BusinessProfile, competitors: Competitor[]) {
  let score = 42;

  if (profile.averageJobValue) score += 8;
  if (profile.technicians) score += 6;
  if (profile.jobsPerTechnicianPerDay) score += 6;
  if (profile.weeklyCapacity) score += 6;
  if (profile.targetBookedJobsPerWeek) score += 5;
  if ((profile.preferredServices?.length ?? 0) >= 3) score += 6;
  if ((profile.servicePageUrls?.length ?? 0) >= 3) score += 5;
  if (competitors.length >= 3) score += 8;
  if (profile.website) score += 4;
  if (profile.city) score += 3;
  if (profile.state) score += 3;
  if (profile.hasGoogleBusinessPage) score += 3;
  if (profile.hasServicePages) score += 3;

  return clamp(score, 38, 92);
}

function inferVisibilityGap(profile: BusinessProfile): number {
  let score = 30;

  if (!profile.hasFaqContent) score += 24;
  if (!profile.hasServicePages) score += 16;
  if ((profile.servicePageUrls?.length ?? 0) < 3) score += 12;
  if (!profile.hasGoogleBusinessPage) score += 8;
  if ((profile.aeoReadinessScore ?? 0) < 70) score += 16;

  return clamp(score, 20, 95);
}

function inferCompetitorGap(
  blueprint: ServiceBlueprint,
  competitors: Competitor[]
): { score: number; narrative: string } {
  const normalized = normalize(blueprint.serviceName);
  const tokens = normalized.split(" ");

  let overlapCount = 0;
  let activeCount = 0;
  let promoCount = 0;
  let inactiveCount = 0;

  for (const competitor of competitors) {
    const overlap = (competitor.serviceFocus ?? []).some((focus) => {
      const normalizedFocus = normalize(focus);
      return tokens.some(
        (token) => token.length > 2 && normalizedFocus.includes(token)
      );
    });

    if (overlap) overlapCount += 1;

    const active = Boolean(competitor.isPostingActively || competitor.isRunningAds);
    const promo = Boolean(competitor.hasActivePromo);

    if (active) activeCount += 1;
    if (promo) promoCount += 1;
    if (!active && !promo) inactiveCount += 1;
  }

  let score = 50;

  if (overlapCount <= 1) score += 10;
  if (inactiveCount >= 2) score += 8;
  if (activeCount <= 2) score += 6;
  if (promoCount === 0) score += 6;
  if (activeCount >= 4) score -= 8;
  if (overlapCount >= 4) score -= 8;

  score = clamp(score, 24, 88);

  if (score >= 70) {
    return {
      score,
      narrative: "Competitor activity appears softer than normal for this service.",
    };
  }

  if (score <= 40) {
    return {
      score,
      narrative: "Competitors look active here, so sharper positioning matters more.",
    };
  }

  return {
    score,
    narrative: "Competition appears balanced for this service.",
  };
}

function getPerformanceSignal(
  performanceSignals: CampaignPerformanceSignalMap | undefined,
  campaignType: CampaignType
): CampaignPerformanceSignal | null {
  return performanceSignals?.[campaignType] ?? null;
}

function buildCompetitorSignal(
  serviceName: string,
  competitors: Competitor[]
): string[] {
  const normalized = normalize(serviceName);
  const tokens = normalized.split(" ");

  const overlappingCompetitors = competitors.filter((competitor) =>
    (competitor.serviceFocus ?? []).some((focus) => {
      const normalizedFocus = normalize(focus);
      return tokens.some(
        (token) => token.length > 2 && normalizedFocus.includes(token)
      );
    })
  );

  const pool = overlappingCompetitors.length > 0 ? overlappingCompetitors : competitors;
  const signals: string[] = [];

  const inactive = pool.filter(
    (competitor) =>
      !competitor.isRunningAds &&
      !competitor.isPostingActively &&
      !competitor.hasActivePromo
  );

  const lowPromo = pool.filter((competitor) => !competitor.hasActivePromo);

  inactive.slice(0, 2).forEach((competitor) => {
    signals.push(`${competitor.name} appears less active right now`);
  });

  lowPromo
    .filter(
      (competitor) =>
        !inactive.some((inactiveCompetitor) => inactiveCompetitor.id === competitor.id)
    )
    .slice(0, 2)
    .forEach((competitor) => {
      signals.push(`${competitor.name} is not promoting this service heavily`);
    });

  if (signals.length === 0 && pool.length > 0) {
    signals.push(
      "Competitor activity appears balanced, so sharper positioning can create an edge"
    );
  }

  if (signals.length === 0) {
    signals.push(
      "Competitor data is still limited, so this opportunity is driven more by demand and capacity signals"
    );
  }

  return signals.slice(0, 3);
}

function buildDisplayContract(params: {
  familyKey: string;
  serviceName: string;
  bestMove: string;
  actionFraming: ActionFraming;
  serviceArea?: string | null;
}): {
  displayMoveLabel: string;
  displaySummary: string;
  imageKey: string;
  imageMode: OpportunityImageMode;
  actionThesis: ActionThesis;
} {
  const { familyKey, serviceName, bestMove, actionFraming, serviceArea } = params;
  const area = serviceArea?.trim() || "your service area";
  const prettyService = prettyServiceName(serviceName);

  if (familyKey === "ai-search-visibility" || actionFraming === "AEO_CONTENT") {
    const title = "Improve AI Search Visibility";

    return {
      displayMoveLabel: title,
      displaySummary: `Strengthen answer-engine visibility for high-intent service searches in ${area}.`,
      imageKey: "company-logo",
      imageMode: "LOGO",
      actionThesis: {
        familyKey,
        primaryService: prettyService,
        angle: "AI search visibility",
        title,
        summary: `Improve discoverability through FAQ, service-page, and GBP improvements for ${area}.`,
        audience: `Homeowners searching for local service help in ${area}`,
        offerHint: "Answer-ready coverage and stronger local visibility",
        ctaHint: "Improve visibility",
        imageKey: "company-logo",
        imageMode: "LOGO",
      },
    };
  }

  return {
    displayMoveLabel: bestMove,
    displaySummary: `Promote ${prettyService.toLowerCase()} demand in ${area} with a practical local action.`,
    imageKey:
      familyKey === "water-heater"
        ? "water-heater-install"
        : familyKey === "drain-cleaning"
          ? "drain-cleaning"
          : familyKey === "emergency-plumbing"
            ? "emergency-plumbing"
            : familyKey === "leak-repair"
              ? "leak-repair"
              : familyKey === "toilet-repair"
                ? "toilet-repair"
                : familyKey === "sump-pump"
                  ? "sump-pump"
                  : familyKey === "general-plumbing"
                    ? "general-plumbing"
                    : "fallback",
    imageMode: "SERVICE_IMAGE",
    actionThesis: {
      familyKey,
      primaryService: prettyService,
      angle: actionFraming === "SCHEDULE_FILL" ? "schedule fill" : "local demand capture",
      title: bestMove,
      summary: `Generate more local demand for ${prettyService.toLowerCase()} with a commercially credible next-best action.`,
      audience: `Homeowners in ${area}`,
      offerHint: "Clear local service offer",
      ctaHint: actionFraming === "SCHEDULE_FILL" ? "Book now" : "Request service",
      imageKey:
        familyKey === "water-heater"
          ? "water-heater-install"
          : familyKey === "drain-cleaning"
            ? "drain-cleaning"
            : familyKey === "emergency-plumbing"
              ? "emergency-plumbing"
              : familyKey === "leak-repair"
                ? "leak-repair"
                : familyKey === "toilet-repair"
                  ? "toilet-repair"
                  : familyKey === "sump-pump"
                    ? "sump-pump"
                    : familyKey === "general-plumbing"
                      ? "general-plumbing"
                      : "fallback",
      imageMode: "SERVICE_IMAGE",
    },
  };
}

function buildAction(params: {
  canonicalService: CanonicalService;
  opportunityType: OpportunityType;
  enrichment: SignalEnrichment;
}): {
  campaignType: CampaignType;
  bestMove: string;
  actionFraming: ActionFraming;
} {
  const { canonicalService, opportunityType, enrichment } = params;
  const familyKey = canonicalService.familyKey;
  const prettyName = prettyServiceName(canonicalService.canonicalName);

  if (familyKey === "ai-search-visibility") {
    return {
      campaignType: "AEO_FAQ",
      bestMove: "Improve AI Search Visibility",
      actionFraming: "AEO_CONTENT",
    };
  }

  if (familyKey === "drain-cleaning") {
    return {
      campaignType: "DRAIN_SPECIAL",
      bestMove: "Promote Drain Cleaning Service",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (familyKey === "water-heater") {
    return {
      campaignType: "WATER_HEATER",
      bestMove: "Promote Water Heater Service",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (familyKey === "emergency-plumbing" || familyKey === "storm-cleanup") {
    return {
      campaignType: "EMERGENCY_SERVICE",
      bestMove:
        familyKey === "storm-cleanup"
          ? "Promote Emergency Storm Cleanup"
          : "Push Emergency Plumbing Response",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (familyKey === "maintenance" || familyKey === "hvac-maintenance") {
    return {
      campaignType: "MAINTENANCE_PUSH",
      bestMove:
        familyKey === "hvac-maintenance"
          ? "Fill Schedule with HVAC Checkups"
          : "Fill Schedule with Service Checkups",
      actionFraming: "SCHEDULE_FILL",
    };
  }

  if (opportunityType === "AI_SEARCH_VISIBILITY") {
    return {
      campaignType: "AEO_FAQ",
      bestMove: `Improve ${prettyName} AI Search Visibility`,
      actionFraming: "AEO_CONTENT",
    };
  }

  return {
    campaignType: canonicalService.blueprint.defaultCampaignType,
    bestMove: canonicalService.blueprint.defaultBestMove,
    actionFraming:
      canonicalService.blueprint.defaultActionFraming ?? enrichment.actionFraming,
  };
}

function inferOpportunityType(params: {
  canonicalService: CanonicalService;
  enrichment: SignalEnrichment;
}): OpportunityType {
  const { canonicalService, enrichment } = params;
  const familyKey = canonicalService.familyKey;

  if (familyKey === "ai-search-visibility") {
    return "AI_SEARCH_VISIBILITY";
  }

  if (canonicalService.blueprint.defaultActionFraming === "SCHEDULE_FILL") {
    return "CAPACITY_GAP";
  }

  if (
    familyKey === "emergency-plumbing" ||
    familyKey === "storm-cleanup" ||
    enrichment.urgencyRelevance === "HIGH"
  ) {
    return "COMPETITOR_INACTIVE";
  }

  if (
    canonicalService.blueprint.nicheLongCycle ||
    canonicalService.blueprint.valueBias >= 12
  ) {
    return "HIGH_VALUE_SERVICE";
  }

  if (
    canonicalService.blueprint.demandBias >= 12 ||
    enrichment.seasonalityRelevance === "HIGH"
  ) {
    return "SEASONAL_DEMAND";
  }

  return canonicalService.blueprint.defaultOpportunityType;
}

function buildWhyNowBullets(params: {
  canonicalService: CanonicalService;
  availableJobsEstimate: number;
  competitorNarrative: string;
  enrichment: SignalEnrichment;
  profile: BusinessProfile;
  performanceSignal: CampaignPerformanceSignal | null;
}): string[] {
  const {
    canonicalService,
    availableJobsEstimate,
    competitorNarrative,
    enrichment,
    profile,
    performanceSignal,
  } = params;

  const prettyName = prettyServiceName(canonicalService.canonicalName);
  const bullets: string[] = [];

  if (canonicalService.familyKey === "ai-search-visibility") {
    bullets.push(
      !profile.hasFaqContent
        ? "Your site still lacks enough structured FAQ coverage for strong answer-engine visibility."
        : "There is still room to improve answer-ready content depth across the site."
    );
    bullets.push(
      (profile.servicePageUrls?.length ?? 0) < 4
        ? "Service-page coverage is still thinner than it should be for broader visibility."
        : "Local visibility can still improve with stronger service-page clarity and structure."
    );
    bullets.push(
      (profile.aeoReadinessScore ?? 0) < 70
        ? "Current AEO readiness is below where it should be for a polished local leader."
        : "This remains a leverageable visibility lane when core gaps still exist."
    );
    return bullets;
  }

  bullets.push(`${prettyName} is a credible revenue lane based on current service mix and market fit.`);
  bullets.push(competitorNarrative);

  if (canonicalService.blueprint.defaultActionFraming === "SCHEDULE_FILL") {
    bullets.push(
      `Current capacity suggests room for roughly ${availableJobsEstimate} additional jobs this week.`
    );
  } else if (enrichment.urgencyRelevance === "HIGH") {
    bullets.push("Urgent homeowner intent can push faster booking behavior here.");
  } else if (enrichment.homeownerIntentStrength === "HIGH") {
    bullets.push("Homeowner intent for this service looks commercially actionable right now.");
  } else {
    bullets.push(enrichment.urgencyReason);
  }

  if (performanceSignal?.performanceLabel === "Strong") {
    bullets.push(performanceSignal.performanceDetail);
  }

  return bullets.slice(0, 4);
}

function buildOpportunityCandidate(params: {
  profile: BusinessProfile;
  canonicalService: CanonicalService;
  availableJobsEstimate: number;
  capacityFit: CapacityFit;
  capacityScore: number;
  visibilityGapScore: number;
  performanceSignals?: CampaignPerformanceSignalMap;
  enrichment: SignalEnrichment;
  competitors: Competitor[];
}): OpportunityCandidate {
  const {
    profile,
    canonicalService,
    availableJobsEstimate,
    capacityFit,
    capacityScore,
    visibilityGapScore,
    performanceSignals,
    enrichment,
    competitors,
  } = params;

  const opportunityType = inferOpportunityType({
    canonicalService,
    enrichment,
  });

  const action = buildAction({
    canonicalService,
    opportunityType,
    enrichment,
  });

  const performanceSignal = getPerformanceSignal(
    performanceSignals,
    action.campaignType
  );

  const { score: competitorGapScore, narrative: competitorNarrative } =
    inferCompetitorGap(canonicalService.blueprint, competitors);

  const preferenceBoost = canonicalService.isPreferred
    ? 16
    : canonicalService.isHighestMargin
      ? 8
      : 0;

  const deprioritizedPenalty =
    canonicalService.isDeprioritized || canonicalService.isLowestPriority ? 36 : 0;

  const capacityBias =
    action.actionFraming === "SCHEDULE_FILL"
      ? canonicalService.blueprint.capacityBias
      : capacityFit === "HIGH"
        ? Math.round(canonicalService.blueprint.capacityBias * 0.75)
        : Math.round(canonicalService.blueprint.capacityBias * 0.35);

  const serviceDemandScore = clamp(
    50 + canonicalService.blueprint.demandBias + preferenceBoost,
    28,
    96
  );

  const serviceValueScore = clamp(
    44 +
      canonicalService.blueprint.valueBias +
      (profile.averageJobValue ? 6 : 0) +
      (canonicalService.isHighestMargin ? 6 : 0),
    28,
    92
  );

  const rawOpportunityScore =
    0.28 * serviceDemandScore +
    0.18 * competitorGapScore +
    0.18 * capacityScore +
    0.1 * serviceValueScore +
    levelToScore(enrichment.seasonalityRelevance) +
    levelToScore(enrichment.urgencyRelevance) +
    levelToScore(enrichment.homeownerIntentStrength) +
    (performanceSignal?.scoreBoost ?? 0) +
    capacityBias +
    (canonicalService.familyKey === "ai-search-visibility"
      ? Math.round(visibilityGapScore * 0.16) + canonicalService.blueprint.aeoBias
      : 0) -
    (canonicalService.blueprint.nicheLongCycle ? 14 : 0) -
    deprioritizedPenalty;

  const displayContract = buildDisplayContract({
    familyKey: canonicalService.familyKey,
    serviceName: canonicalService.canonicalName,
    bestMove: action.bestMove,
    actionFraming: action.actionFraming,
    serviceArea: profile.serviceArea,
  });

  const whyNowBullets = buildWhyNowBullets({
    canonicalService,
    availableJobsEstimate,
    competitorNarrative,
    enrichment,
    profile,
    performanceSignal,
  });

  return {
    familyKey: canonicalService.familyKey,
    title: canonicalService.blueprint.title,
    serviceName: canonicalService.canonicalName,
    opportunityType,
    bestMove: action.bestMove,
    displayMoveLabel: displayContract.displayMoveLabel,
    displaySummary: displayContract.displaySummary,
    imageKey: displayContract.imageKey,
    imageMode: displayContract.imageMode,
    actionThesis: displayContract.actionThesis,
    recommendedCampaignType: action.campaignType,
    sourceTags: uniqueTags([
      "Demand",
      "Competitor",
      ...(action.actionFraming === "SCHEDULE_FILL"
        ? (["Capacity"] as OpportunitySourceTag[])
        : capacityFit !== "LOW"
          ? (["Capacity"] as OpportunitySourceTag[])
          : []),
      ...(canonicalService.familyKey === "ai-search-visibility"
        ? (["AEO"] as OpportunitySourceTag[])
        : []),
      ...(opportunityType === "HIGH_VALUE_SERVICE"
        ? (["Service Value"] as OpportunitySourceTag[])
        : []),
    ]),
    whyNowBullets,
    whyThisMatters:
      canonicalService.familyKey === "ai-search-visibility"
        ? "MarketForge sees a real answer-engine visibility gap. Fixing it can improve organic discovery and future demand capture."
        : `${prettyServiceName(
            canonicalService.canonicalName
          )} stands out because it matches current demand, capacity, and commercial fit.`,
    rawOpportunityScore: rawOpportunityScore,
    seasonalityRelevance: enrichment.seasonalityRelevance,
    seasonalityReason: enrichment.seasonalityReason,
    urgencyRelevance: enrichment.urgencyRelevance,
    urgencyReason: enrichment.urgencyReason,
    homeownerIntentStrength: enrichment.homeownerIntentStrength,
    homeownerIntentReason: enrichment.homeownerIntentReason,
    actionFraming: action.actionFraming,
    actionFramingReason: enrichment.actionFramingReason,
    eligibleForBacklog:
      !canonicalService.isDeprioritized &&
      canonicalService.blueprint.backlogEligibleByDefault,
    eligibleForHero:
      !canonicalService.isDeprioritized &&
      canonicalService.familyKey !== "ai-search-visibility",
    isDeprioritized: canonicalService.isDeprioritized,
  };
}

function getFamilyRangeProfile(familyKey: string) {
  switch (familyKey) {
    case "drain-cleaning":
      return { minHigh: 2, maxHigh: 5, conversionFloor: 0.95 };
    case "emergency-plumbing":
    case "storm-cleanup":
      return { minHigh: 1, maxHigh: 4, conversionFloor: 0.92 };
    case "water-heater":
    case "tree-removal":
    case "system-replacement":
    case "repiping":
    case "sewer-line":
    case "septic-installation":
      return { minHigh: 1, maxHigh: 3, conversionFloor: 0.9 };
    case "maintenance":
    case "hvac-maintenance":
      return { minHigh: 3, maxHigh: 6, conversionFloor: 0.88 };
    case "ai-search-visibility":
      return { minHigh: 1, maxHigh: 2, conversionFloor: 0.8 };
    default:
      return { minHigh: 1, maxHigh: 4, conversionFloor: 0.88 };
  }
}

function buildRankedOpportunity(params: {
  candidate: OpportunityCandidate;
  profile: BusinessProfile;
  defaultAvgJobValue: number;
  availableJobsEstimate: number;
  baseConfidenceScore: number;
  capacityFit: CapacityFit;
  performanceSignal: CampaignPerformanceSignal | null;
}): RankedOpportunity {
  const {
    candidate,
    profile,
    defaultAvgJobValue,
    availableJobsEstimate,
    baseConfidenceScore,
    capacityFit,
    performanceSignal,
  } = params;

  const avgJobValue = resolveServiceJobValue({
    profile,
    candidate: {
      familyKey: candidate.familyKey,
      serviceName: candidate.serviceName,
      actionThesisPrimaryService: candidate.actionThesis.primaryService,
      industry: getProfileIndustry(profile),
    },
    fallbackJobValue: defaultAvgJobValue,
  });

  const adjustedConfidenceScore = clamp(
    baseConfidenceScore + (performanceSignal?.confidenceBoost ?? 0),
    38,
    92
  );

  const adjustedConfidenceLabel = confidenceLabelFromScore(adjustedConfidenceScore);
  const rangeProfile = getFamilyRangeProfile(candidate.familyKey);

  let scoreDrivenHigh = 2;
  if (candidate.rawOpportunityScore >= 82) {
    scoreDrivenHigh = rangeProfile.maxHigh;
  } else if (candidate.rawOpportunityScore >= 74) {
    scoreDrivenHigh = Math.max(rangeProfile.minHigh + 1, rangeProfile.minHigh);
  } else if (candidate.rawOpportunityScore >= 66) {
    scoreDrivenHigh = rangeProfile.minHigh;
  } else {
    scoreDrivenHigh = Math.max(1, rangeProfile.minHigh - 1);
  }

  const jobsHigh = clamp(
    Math.min(Math.max(availableJobsEstimate, 1), scoreDrivenHigh),
    1,
    rangeProfile.maxHigh
  );

  const jobsLow = clamp(
    Math.max(1, jobsHigh - (candidate.actionFraming === "SCHEDULE_FILL" ? 2 : 1)),
    1,
    jobsHigh
  );

  const confidenceAdjustment =
    adjustedConfidenceLabel === "High"
      ? 1
      : adjustedConfidenceLabel === "Medium"
        ? rangeProfile.conversionFloor
        : Math.max(0.76, rangeProfile.conversionFloor - 0.1);

  const revenueLow = Math.round(jobsLow * avgJobValue * confidenceAdjustment);
  const revenueHigh = Math.round(jobsHigh * avgJobValue * confidenceAdjustment);

  return {
    opportunityKey: buildOpportunityKey({
      serviceName: candidate.serviceName,
      opportunityType: candidate.opportunityType,
      bestMove: candidate.bestMove,
    }),
    familyKey: candidate.familyKey,
    title: candidate.title,
    serviceName: prettyServiceName(candidate.serviceName),
    opportunityType: candidate.opportunityType,
    bestMove: candidate.bestMove,
    displayMoveLabel: candidate.displayMoveLabel,
    displaySummary: candidate.displaySummary,
    imageKey: candidate.imageKey,
    imageMode: candidate.imageMode,
    actionThesis: candidate.actionThesis,
    recommendedCampaignType: candidate.recommendedCampaignType,
    jobsLow,
    jobsHigh,
    revenueLow,
    revenueHigh,
    rawOpportunityScore: Math.round(candidate.rawOpportunityScore),
    confidenceScore: adjustedConfidenceScore,
    confidenceLabel: adjustedConfidenceLabel,
    capacityFit,
    sourceTags: candidate.sourceTags,
    whyNowBullets: candidate.whyNowBullets.slice(0, 4),
    whyThisMatters: candidate.whyThisMatters,
    performanceLabel: performanceSignal?.performanceLabel ?? "New",
    performanceDetail:
      performanceSignal?.performanceDetail ??
      "No campaign history yet for this action type.",
    historicalCampaignCount: performanceSignal?.launchedCampaigns ?? 0,
    seasonalityRelevance: candidate.seasonalityRelevance,
    seasonalityReason: candidate.seasonalityReason,
    urgencyRelevance: candidate.urgencyRelevance,
    urgencyReason: candidate.urgencyReason,
    homeownerIntentStrength: candidate.homeownerIntentStrength,
    homeownerIntentReason: candidate.homeownerIntentReason,
    actionFraming: candidate.actionFraming,
    actionFramingReason: candidate.actionFramingReason,
    eligibleForBacklog: candidate.eligibleForBacklog,
    eligibleForHero: candidate.eligibleForHero,
    isDeprioritized: candidate.isDeprioritized,
  };
}

export function buildRevenueOpportunityHero(params: {
  opportunity: RankedOpportunity;
  availableJobsEstimate: number;
  competitors: Competitor[];
}): RevenueOpportunityHero {
  const { opportunity, availableJobsEstimate, competitors } = params;

  return {
    title: "Jobs You Can Capture This Week",
    opportunityTitle: opportunity.title,
    opportunityType: opportunity.opportunityType,
    familyKey: opportunity.familyKey,
    jobsLow: opportunity.jobsLow,
    jobsHigh: opportunity.jobsHigh,
    revenueLow: opportunity.revenueLow,
    revenueHigh: opportunity.revenueHigh,
    rawOpportunityScore: opportunity.rawOpportunityScore,
    headlineJobsText: `${opportunity.jobsLow}–${opportunity.jobsHigh} jobs`,
    headlineRevenueText: `$${opportunity.revenueLow.toLocaleString()}–$${opportunity.revenueHigh.toLocaleString()}`,
    bestMove: opportunity.bestMove,
    displayMoveLabel: opportunity.displayMoveLabel,
    displaySummary: opportunity.displaySummary,
    imageKey: opportunity.imageKey,
    imageMode: opportunity.imageMode,
    actionThesis: opportunity.actionThesis,
    recommendedCampaignType: opportunity.recommendedCampaignType,
    whyNowBullets: opportunity.whyNowBullets,
    whyThisMatters: opportunity.whyThisMatters,
    confidenceScore: opportunity.confidenceScore,
    confidenceLabel: opportunity.confidenceLabel,
    sourceTags: opportunity.sourceTags,
    capacityFit: opportunity.capacityFit,
    availableJobsEstimate,
    competitorSignal: buildCompetitorSignal(opportunity.serviceName, competitors),
    performanceLabel: opportunity.performanceLabel,
    performanceDetail: opportunity.performanceDetail,
    historicalCampaignCount: opportunity.historicalCampaignCount,
    seasonalityRelevance: opportunity.seasonalityRelevance,
    seasonalityReason: opportunity.seasonalityReason,
    urgencyRelevance: opportunity.urgencyRelevance,
    urgencyReason: opportunity.urgencyReason,
    homeownerIntentStrength: opportunity.homeownerIntentStrength,
    homeownerIntentReason: opportunity.homeownerIntentReason,
    actionFraming: opportunity.actionFraming,
    actionFramingReason: opportunity.actionFramingReason,
    opportunityKey: opportunity.opportunityKey,
  };
}

export async function buildRevenueOpportunityEngine(params: {
  profile: BusinessProfile;
  competitors: Competitor[];
  performanceSignals?: CampaignPerformanceSignalMap;
}): Promise<RevenueOpportunityEngineResult> {
  const { profile, competitors, performanceSignals } = params;

  const canonicalServices = buildCanonicalServices(profile);
  const industry = getProfileIndustry(profile);

  const fallbackServices =
    canonicalServices.length > 0
      ? canonicalServices
      : getGuaranteedFamilyKeys(industry)
          .filter((familyKey) => familyKey !== "ai-search-visibility")
          .slice(0, 6)
          .map((familyKey) => {
            const blueprint = getBlueprintForFamily(familyKey, industry);

            return {
              rawName: blueprint.serviceName,
              canonicalName: blueprint.serviceName,
              familyKey,
              industry,
              blueprint,
              isPreferred: true,
              isDeprioritized: false,
              isHighestMargin: false,
              isLowestPriority: false,
            } satisfies CanonicalService;
          });

  const servicesForEngine = [...fallbackServices];

  if (!hasStrongAeoBaseline(profile)) {
    const aeoBlueprint = getBlueprintForFamily("ai-search-visibility", industry);

    servicesForEngine.push({
      rawName: aeoBlueprint.serviceName,
      canonicalName: aeoBlueprint.serviceName,
      familyKey: "ai-search-visibility",
      industry,
      blueprint: aeoBlueprint,
      isPreferred: false,
      isDeprioritized: false,
      isHighestMargin: false,
      isLowestPriority: false,
    });
  }

  const { availableJobsEstimate, capacityScore, capacityFit } = inferCapacity(profile);
  const baseConfidenceScore = inferConfidence(profile, competitors);
  const visibilityGapScore = inferVisibilityGap(profile);

  const enrichmentRequestNames = uniqueStrings([
    ...servicesForEngine.map((service) => service.canonicalName),
    ...servicesForEngine.map((service) => service.familyKey),
  ]);

  const enrichmentMap = await getOpportunitySignalEnrichment({
    profile: {
      businessName: profile.businessName,
      city: profile.city,
      state: profile.state,
      preferredServices: profile.preferredServices,
      deprioritizedServices: profile.deprioritizedServices,
      averageJobValue: profile.averageJobValue,
      highestMarginService: profile.highestMarginService,
      hasFaqContent: profile.hasFaqContent,
      hasServicePages: profile.hasServicePages,
      hasGoogleBusinessPage: profile.hasGoogleBusinessPage,
      aeoReadinessScore: profile.aeoReadinessScore,
      technicians: profile.technicians,
      weeklyCapacity: profile.weeklyCapacity,
      targetBookedJobsPerWeek: profile.targetBookedJobsPerWeek,
    },
    serviceNames: enrichmentRequestNames,
  });

  const rawCandidates = servicesForEngine.map((canonicalService) => {
    const enrichment =
      enrichmentMap.get(normalize(canonicalService.canonicalName)) ??
      enrichmentMap.get(canonicalService.familyKey);

    if (!enrichment) {
      return null;
    }

    return buildOpportunityCandidate({
      profile,
      canonicalService,
      availableJobsEstimate,
      capacityFit,
      capacityScore,
      visibilityGapScore,
      performanceSignals,
      enrichment,
      competitors,
    });
  });

  const candidates = rawCandidates
    .filter((candidate): candidate is OpportunityCandidate => Boolean(candidate))
    .sort((a, b) => b.rawOpportunityScore - a.rawOpportunityScore);

  const defaultAvgJobValue = Number(profile.averageJobValue ?? 450);

  const rankedOpportunities = candidates.map((candidate) =>
    buildRankedOpportunity({
      candidate,
      profile,
      defaultAvgJobValue,
      availableJobsEstimate,
      baseConfidenceScore,
      capacityFit,
      performanceSignal: getPerformanceSignal(
        performanceSignals,
        candidate.recommendedCampaignType
      ),
    })
  );

  const top =
    rankedOpportunities.find(
      (opportunity) => opportunity.eligibleForHero && !opportunity.isDeprioritized
    ) ??
    rankedOpportunities.find((opportunity) => !opportunity.isDeprioritized) ??
    rankedOpportunities[0];

  if (!top) {
    throw new Error("Revenue opportunity engine produced no opportunities.");
  }

  return {
    hero: buildRevenueOpportunityHero({
      opportunity: top,
      availableJobsEstimate,
      competitors,
    }),
    rankedOpportunities,
    availableJobsEstimate,
  };
}