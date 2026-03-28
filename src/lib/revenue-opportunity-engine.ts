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
  getGuaranteedFamilyKeys,
  getBlueprintForFamily,
} from "@/lib/industry-service-map";
import {
  buildCanonicalServices,
  getProfileIndustry,
  hasStrongAeoBaseline,
  type CanonicalService,
} from "@/lib/canonical-services";
import {
  deriveWorkspaceReputationSignal,
  getReputationVariantAdjustment,
} from "@/lib/reputation-signals";

import { getSeasonalityTiming } from "@/lib/seasonality";

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

type RevenueVariantKind =
  | "primary"
  | "urgent"
  | "capacity"
  | "trust"
  | "premium";

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

function getStaticSeasonalityBias(level: InferredSignalLevel): number {
  if (level === "HIGH") return 3;
  if (level === "MEDIUM") return 1;
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

  let availableJobsEstimate = Math.max(Math.round(weeklyCapacity * 0.18), 2);

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
  if ((profile.preferredServices?.length ?? 0) >= 3) score += 6;
  if ((profile.servicePageUrls?.length ?? 0) >= 3) score += 5;
  if (competitors.length >= 3) score += 8;
  if (profile.website) score += 4;
  if (profile.city) score += 3;
  if (profile.state) score += 3;
  if (profile.hasGoogleBusinessPage) score += 3;
  if (profile.hasServicePages) score += 3;
  if (profile.googleRating) score += 4;
  if (profile.googleReviewCount) score += 4;

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
  serviceName: string,
  competitors: Competitor[]
): { score: number; narrative: string } {
  const normalized = normalize(serviceName);
  const tokens = normalized.split(" ");

  let overlapCount = 0;

  for (const competitor of competitors) {
    const overlap = (competitor.serviceFocus ?? []).some((focus) => {
      const normalizedFocus = normalize(focus);
      return tokens.some(
        (token) => token.length > 2 && normalizedFocus.includes(token)
      );
    });

    if (overlap) overlapCount += 1;
  }

  let score = 62;

  if (overlapCount === 0) score += 12;
  if (overlapCount === 1) score += 8;
  if (overlapCount === 2) score += 2;
  if (overlapCount >= 4) score -= 8;
  if (overlapCount >= 6) score -= 10;

  score = clamp(score, 28, 86);

  if (score >= 74) {
    return {
      score,
      narrative:
        "Local competitor overlap appears relatively light for this service lane.",
    };
  }

  if (score <= 45) {
    return {
      score,
      narrative:
        "This service lane looks crowded locally, so sharper positioning matters more.",
    };
  }

  return {
    score,
    narrative: "Local competitor overlap appears balanced for this service lane.",
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

  const highTrust = pool
    .filter(
      (competitor) =>
        (competitor.rating ?? 0) >= 4.5 && (competitor.reviewCount ?? 0) >= 40
    )
    .slice(0, 2);

  highTrust.forEach((competitor) => {
    signals.push(`${competitor.name} has strong review credibility in this lane`);
  });

  if (signals.length === 0 && pool.length >= 4) {
    signals.push(
      "This service lane looks crowded locally, so sharper positioning can create the edge."
    );
  }

  if (signals.length === 0 && pool.length > 0) {
    signals.push(
      "Local competitor overlap appears manageable, which creates a credible opening here."
    );
  }

  if (signals.length === 0) {
    signals.push(
      "Competitor data is still limited, so this opportunity is driven more by demand and timing signals."
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
    return {
      displayMoveLabel: "Improve AI Search Visibility",
      displaySummary: `Strengthen answer-engine visibility for the most commercially important services in ${area}.`,
      imageKey: "company-logo",
      imageMode: "LOGO",
      actionThesis: {
        familyKey,
        primaryService: prettyService,
        angle: "AI search visibility",
        title: bestMove,
        summary: `Improve AI search visibility for important services in ${area}.`,
        audience: `Homeowners searching for trusted local providers in ${area}`,
        offerHint: "Stronger answer-engine coverage",
        ctaHint: "Improve AI visibility",
        imageKey: "company-logo",
        imageMode: "LOGO",
      },
    };
  }

  const framingSummaryMap: Record<ActionFraming, string> = {
    PAID_CAMPAIGN: `Drive more high-intent bookings for ${prettyService.toLowerCase()} in ${area}.`,
    SCHEDULE_FILL: `Use open capacity to generate more ${prettyService.toLowerCase()} bookings in ${area}.`,
    REPUTATION: `Improve trust and conversion for ${prettyService.toLowerCase()} leads in ${area}.`,
    PROMOTION: `Promote a stronger commercial offer for ${prettyService.toLowerCase()} in ${area}.`,
    LOCAL_VISIBILITY: `Improve local visibility for ${prettyService.toLowerCase()} in ${area}.`,
    AEO_CONTENT: `Improve AI search visibility for ${prettyService.toLowerCase()} in ${area}.`,
    MIXED: `Use a blended growth move for ${prettyService.toLowerCase()} in ${area}.`,
  };

  return {
    displayMoveLabel: bestMove,
    displaySummary:
      framingSummaryMap[actionFraming] ??
      `Generate more ${prettyService.toLowerCase()} demand in ${area}.`,
    imageKey:
      familyKey === "general-plumbing"
        ? "general-plumbing"
        : slugify(serviceName),
    imageMode: "SERVICE_IMAGE",
    actionThesis: {
      familyKey,
      primaryService: prettyService,
      angle: bestMove,
      title: bestMove,
      summary:
        framingSummaryMap[actionFraming] ??
        `Generate more ${prettyService.toLowerCase()} demand in ${area}.`,
      audience: `Homeowners in ${area} who need ${prettyService.toLowerCase()}`,
      offerHint: `Relevant ${prettyService.toLowerCase()} offer`,
      ctaHint: `Book ${prettyService.toLowerCase()}`,
      imageKey:
        familyKey === "general-plumbing"
          ? "general-plumbing"
          : slugify(serviceName),
      imageMode: "SERVICE_IMAGE",
    },
  };
}

function getFamilyRangeProfile(familyKey: string) {
  switch (familyKey) {
    case "burst-pipe-repair":
    case "emergency-plumbing":
    case "storm-cleanup":
      return { minHigh: 1, maxHigh: 4, conversionFloor: 0.92 };
    case "water-heater-repair-replacement":
    case "tankless-water-heater":
    case "repiping":
    case "slab-leak-repair":
    case "water-softener":
    case "custom-home-plumbing-installation":
      return { minHigh: 1, maxHigh: 3, conversionFloor: 0.9 };
    case "water-heater-service":
      return { minHigh: 3, maxHigh: 6, conversionFloor: 0.88 };
    case "ai-search-visibility":
      return { minHigh: 1, maxHigh: 2, conversionFloor: 0.8 };
    default:
      return { minHigh: 1, maxHigh: 4, conversionFloor: 0.88 };
  }
}

function getSeasonalityVariantAdjustment(params: {
  kind: RevenueVariantKind;
  timing: ReturnType<typeof getSeasonalityTiming>;
  familyKey: string;
}): number {
  const { kind, timing, familyKey } = params;

  if (familyKey === "ai-search-visibility") {
    if (timing.timing === "SLOW") return 6;
    if (timing.timing === "SHOULDER") return 3;
    if (timing.timing === "BUSY" || timing.timing === "PEAK") return -6;
    return 0;
  }

  if (kind === "capacity") {
    if (timing.timing === "SLOW") return 24;
    if (timing.timing === "SHOULDER") return 10;
    if (timing.timing === "BUSY" || timing.timing === "PEAK") return -22;
    return 0;
  }

  if (kind === "urgent") {
    if (timing.timing === "PEAK") return 14;
    if (timing.timing === "BUSY") return 10;
    if (timing.timing === "SHOULDER") return 2;
    if (timing.timing === "SLOW") return -8;
    return 0;
  }

  if (kind === "premium") {
    if (timing.timing === "PEAK") return 12;
    if (timing.timing === "BUSY") return 10;
    if (timing.timing === "SHOULDER") return 2;
    if (timing.timing === "SLOW") return -10;
    return 0;
  }

  if (kind === "trust") {
    if (timing.timing === "SLOW") return 10;
    if (timing.timing === "SHOULDER") return 7;
    if (timing.timing === "BUSY" || timing.timing === "PEAK") return -4;
    return 0;
  }

  if (timing.timing === "PEAK") return 8;
  if (timing.timing === "BUSY") return 5;
  if (timing.timing === "SHOULDER") return 2;
  if (timing.timing === "SLOW") return -4;
  return 0;
}

function getSeasonalBestMove(params: {
  canonicalService: CanonicalService;
  kind: RevenueVariantKind;
  seasonalityTiming: ReturnType<typeof getSeasonalityTiming>;
}): string {
  const { canonicalService, kind, seasonalityTiming } = params;
  const prettyName = prettyServiceName(canonicalService.canonicalName);

  if (seasonalityTiming.timing === "SLOW") {
    if (kind === "capacity") {
      return `Fill Schedule with ${prettyName} This Month`;
    }

    if (kind === "trust") {
      return `Build Trust for ${prettyName} During a Slower Month`;
    }
  }

  if (seasonalityTiming.timing === "BUSY") {
    if (kind === "urgent") {
      return `Capture High-Intent ${prettyName} Demand`;
    }

    if (kind === "premium") {
      return `Promote ${prettyName} Premium Offer`;
    }
  }

  if (seasonalityTiming.timing === "PEAK") {
    if (kind === "urgent") {
      return `Capture Peak ${prettyName} Demand`;
    }

    if (kind === "premium") {
      return `Promote ${prettyName} Peak-Season Offer`;
    }
  }

  if (seasonalityTiming.timing === "SHOULDER") {
    if (kind === "trust") {
      return `Build Trust Before ${prettyName} Demand Peaks`;
    }

    if (kind === "capacity") {
      return `Fill Schedule Ahead of ${prettyName} Season`;
    }
  }

  return getVariantBestMove({ canonicalService, kind });
}

function inferBaseOpportunityType(params: {
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
    familyKey === "burst-pipe-repair" ||
    familyKey === "emergency-plumbing" ||
    enrichment.urgencyRelevance === "HIGH"
  ) {
    return "COMPETITOR_INACTIVE";
  }

  if (
    canonicalService.blueprint.nicheLongCycle ||
    canonicalService.blueprint.valueBias >= 10
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

function getVariantCampaignType(params: {
  canonicalService: CanonicalService;
  kind: RevenueVariantKind;
}): CampaignType {
  const { canonicalService, kind } = params;
  const familyKey = canonicalService.familyKey;

  if (
    familyKey === "water-heater-repair-replacement" ||
    familyKey === "tankless-water-heater"
  ) {
    if (kind === "capacity") {
      return "MAINTENANCE_PUSH";
    }

    return "WATER_HEATER";
  }

  if (kind === "urgent" || familyKey === "burst-pipe-repair") {
    return "EMERGENCY_SERVICE";
  }

  if (kind === "capacity") {
    return "MAINTENANCE_PUSH";
  }

  if (familyKey === "drain-cleaning") {
    return "DRAIN_SPECIAL";
  }

  return "CUSTOM";
}

function getVariantOpportunityType(params: {
  canonicalService: CanonicalService;
  enrichment: SignalEnrichment;
  kind: RevenueVariantKind;
}): OpportunityType {
  const { canonicalService, enrichment, kind } = params;

  if (kind === "urgent") {
    return "COMPETITOR_INACTIVE";
  }

  if (kind === "capacity") {
    return "CAPACITY_GAP";
  }

  if (kind === "premium") {
    return "HIGH_VALUE_SERVICE";
  }

  if (kind === "trust") {
    return "LOCAL_SEARCH_SPIKE";
  }

  return inferBaseOpportunityType({ canonicalService, enrichment });
}

function getVariantActionFraming(kind: RevenueVariantKind): ActionFraming {
  switch (kind) {
    case "urgent":
      return "PAID_CAMPAIGN";
    case "capacity":
      return "SCHEDULE_FILL";
    case "trust":
      return "REPUTATION";
    case "premium":
      return "PROMOTION";
    default:
      return "PAID_CAMPAIGN";
  }
}

function getVariantBestMove(params: {
  canonicalService: CanonicalService;
  kind: RevenueVariantKind;
}): string {
  const { canonicalService, kind } = params;
  const prettyName = prettyServiceName(canonicalService.canonicalName);

  switch (kind) {
    case "primary":
      return canonicalService.blueprint.defaultBestMove;
    case "urgent":
      return `Promote Fast ${prettyName} Response`;
    case "capacity":
      return `Fill Schedule with ${prettyName} Jobs`;
    case "trust":
      return `Promote Review-Backed ${prettyName} Offer`;
    case "premium":
      return `Promote ${prettyName} Premium Offer`;
    default:
      return canonicalService.blueprint.defaultBestMove;
  }
}

function getVariantTitle(params: {
  canonicalService: CanonicalService;
  kind: RevenueVariantKind;
}): string {
  const { canonicalService, kind } = params;
  const prettyName = prettyServiceName(canonicalService.canonicalName);

  switch (kind) {
    case "primary":
      return canonicalService.blueprint.title;
    case "urgent":
      return `${prettyName} Fast Response Opportunity`;
    case "capacity":
      return `${prettyName} Schedule Fill Opportunity`;
    case "trust":
      return `${prettyName} Trust & Conversion Opportunity`;
    case "premium":
      return `${prettyName} Premium Revenue Opportunity`;
    default:
      return canonicalService.blueprint.title;
  }
}

function getVariantScoreAdjustment(params: {
  kind: RevenueVariantKind;
  enrichment: SignalEnrichment;
  canonicalService: CanonicalService;
  capacityFit: CapacityFit;
}): number {
  const { kind, enrichment, canonicalService, capacityFit } = params;

  switch (kind) {
    case "primary":
      return 6;

    case "urgent":
      return enrichment.urgencyRelevance === "HIGH"
        ? 10
        : enrichment.urgencyRelevance === "MEDIUM"
          ? 5
          : -2;

    case "capacity":
      return capacityFit === "HIGH" ? 3 : capacityFit === "MEDIUM" ? 1 : -2;

    case "trust":
      return 4;

    case "premium":
      return canonicalService.blueprint.valueBias >= 10 ? 6 : 2;

    default:
      return 0;
  }
}

function getVariantTags(params: {
  canonicalService: CanonicalService;
  kind: RevenueVariantKind;
}): OpportunitySourceTag[] {
  const { canonicalService, kind } = params;

  return uniqueTags([
    "Demand",
    "Competitor",
    ...(kind === "capacity" ? (["Capacity"] as OpportunitySourceTag[]) : []),
    ...(kind === "premium" ||
    canonicalService.blueprint.valueBias >= 10 ||
    canonicalService.isHighestMargin
      ? (["Service Value"] as OpportunitySourceTag[])
      : []),
  ]);
}

function normalizeStrengthGapToScore(gap: number | null): number {
  if (gap === null) return 50;

  // Trailing the market should matter more in the base score
  if (gap <= -18) return 90;
  if (gap <= -10) return 82;
  if (gap <= -4) return 72;

  // Near parity
  if (gap < 4) return 60;

  // Leading still matters, but less aggressively than lagging
  if (gap < 10) return 68;
  if (gap < 18) return 74;
  return 78;
}

function normalizeReviewDepthGapToScore(
  businessReviewCount: number | null,
  competitorMedianReviewCount: number | null
): number {
  if (
    businessReviewCount === null ||
    competitorMedianReviewCount === null
  ) {
    return 50;
  }

  const ratio =
    (businessReviewCount + 1) / (competitorMedianReviewCount + 1);

  if (ratio <= 0.35) return 86;
  if (ratio <= 0.6) return 76;
  if (ratio <= 0.9) return 66;
  if (ratio <= 1.15) return 58;
  if (ratio <= 1.6) return 70;
  return 80;
}

function getPlaceholderCompetitivePressureScore(): number {
  return 50;
}

function scoreRevenueValue(params: {
  serviceDemandScore: number;
  serviceValueScore: number;
  preferredServiceBoost: number;
  marginBoost: number;
}) {
  const score =
    params.serviceDemandScore * 0.4 +
    params.serviceValueScore * 0.35 +
    params.preferredServiceBoost * 0.15 +
    params.marginBoost * 0.1;

  return clamp(score, 20, 95);
}

function scoreCompetitivePosition(params: {
  competitorGapScore: number;
  reputationSignal: ReturnType<typeof deriveWorkspaceReputationSignal>;
}) {
  const reputationStrengthScore = normalizeStrengthGapToScore(
    params.reputationSignal.strengthGap
  );

  const reviewDepthScore = normalizeReviewDepthGapToScore(
    params.reputationSignal.businessReviewCount,
    params.reputationSignal.competitorMedianReviewCount
  );

  const saturationScore = params.competitorGapScore;
  const placeholderPressureScore = getPlaceholderCompetitivePressureScore();

  const score =
    reputationStrengthScore * 0.55 +
    reviewDepthScore * 0.2 +
    saturationScore * 0.2 +
    placeholderPressureScore * 0.05;

  return clamp(score, 20, 95);
}

function scoreMarketTimingIntent(params: {
  seasonalityRelevance: InferredSignalLevel;
  urgencyRelevance: InferredSignalLevel;
  homeownerIntentStrength: InferredSignalLevel;
  seasonalityTimingAdjustment: number;
}) {
  const seasonalityScore =
    52 +
    levelToScore(params.seasonalityRelevance) +
    params.seasonalityTimingAdjustment;

  const urgencyScore = 50 + levelToScore(params.urgencyRelevance);
  const intentScore = 50 + levelToScore(params.homeownerIntentStrength);

  const score =
    seasonalityScore * 0.4 +
    urgencyScore * 0.3 +
    intentScore * 0.3;

  return clamp(score, 20, 95);
}

function scoreOperationalFit(capacityScore: number) {
  return clamp(capacityScore, 20, 95);
}

// 🔴 NOTE: Only showing the UPDATED / CRITICAL SECTION
// DO NOT DELETE YOUR FILE — replace ONLY the function below

// FIND THIS FUNCTION IN YOUR FILE:
// function buildWhyNowBullets(...)

// REPLACE IT WITH THIS:

function buildWhyNowBullets(params: {
  canonicalService: CanonicalService;
  kind: RevenueVariantKind;
  availableJobsEstimate: number;
  competitorNarrative: string;
  enrichment: SignalEnrichment;
  profile: BusinessProfile;
  performanceSignal: CampaignPerformanceSignal | null;
  seasonalityTiming: ReturnType<typeof getSeasonalityTiming>;
  reputationSignal: ReturnType<typeof deriveWorkspaceReputationSignal>;
  revenueValueScore: number;
  competitivePositionScore: number;
  marketTimingIntentScore: number;
}): string[] {
  const {
    canonicalService,
    kind,
    availableJobsEstimate,
    competitorNarrative,
    enrichment,
    seasonalityTiming,
    reputationSignal,
    revenueValueScore,
    competitivePositionScore,
    marketTimingIntentScore,
  } = params;

  const service = prettyServiceName(canonicalService.canonicalName);

  // ----------------------------------------
  // BULLET 1 — COMMERCIAL VALUE
  // ----------------------------------------
  let commercialBullet = "";

  if (revenueValueScore >= 80) {
    commercialBullet = `${service} is one of the stronger revenue-producing services in your mix and supports higher-value jobs.`;
  } else if (revenueValueScore >= 65) {
    commercialBullet = `${service} represents a solid revenue opportunity with consistent job value potential.`;
  } else {
    commercialBullet = `${service} can contribute incremental revenue and help support overall job volume.`;
  }

  if (canonicalService.isPreferred) {
    commercialBullet += ` This is also a preferred service for your business.`;
  }

  if (canonicalService.isHighestMargin) {
    commercialBullet += ` It also carries strong margin potential.`;
  }

  // ----------------------------------------
  // BULLET 2 — COMPETITIVE POSITION
  // ----------------------------------------
  let competitiveBullet = "";

  if (reputationSignal.position === "LAGGING") {
    competitiveBullet = `Your Google reputation is currently behind competing providers in this service lane, which creates a real risk of losing jobs at the decision stage.`;
  } else if (reputationSignal.position === "LEADING") {
    competitiveBullet = `Your Google reputation is currently stronger than many competitors, which gives you an advantage when homeowners are choosing who to hire.`;
  } else {
    competitiveBullet = competitorNarrative;
  }

  if (competitivePositionScore >= 75 && reputationSignal.position === "LEADING") {
    competitiveBullet += ` This is a good opportunity to press that advantage.`;
  }

  if (competitivePositionScore <= 50 && reputationSignal.position === "LAGGING") {
    competitiveBullet += ` Strengthening trust and positioning here should improve win rates.`;
  }

  // ----------------------------------------
  // BULLET 3 — TIMING / ACTION
  // ----------------------------------------
  let timingBullet = "";

  if (kind === "capacity") {
    timingBullet = `You have available capacity that can support roughly ${availableJobsEstimate} additional jobs, making this a good opportunity to fill schedule.`;
  } else if (kind === "urgent") {
    timingBullet = `This service is driven by high-intent demand, so acting now increases the likelihood of capturing immediate bookings.`;
  } else if (kind === "premium") {
    timingBullet = `Market conditions support a stronger offer here, making this a good moment to push higher-value work.`;
  } else if (kind === "trust") {
    timingBullet = `Improving trust and proof right now can increase conversion on existing demand.`;
  } else {
    // primary
    if (marketTimingIntentScore >= 75) {
      timingBullet = `Current demand, timing, and homeowner intent signals make this a strong moment to prioritize this service.`;
    } else if (marketTimingIntentScore >= 60) {
      timingBullet = `Market timing and homeowner demand are supportive enough to justify action here.`;
    } else {
      timingBullet = seasonalityTiming.explanation;
    }
  }

  return [commercialBullet, competitiveBullet, timingBullet];
}

function buildRevenueVariantCandidates(params: {
  profile: BusinessProfile;
  canonicalService: CanonicalService;
  availableJobsEstimate: number;
  capacityFit: CapacityFit;
  capacityScore: number;
  visibilityGapScore: number;
  performanceSignals?: CampaignPerformanceSignalMap;
  enrichment: SignalEnrichment;
  competitors: Competitor[];
}): OpportunityCandidate[] {
  const {
    profile,
    canonicalService,
    availableJobsEstimate,
    capacityFit,
    capacityScore,
    performanceSignals,
    enrichment,
    competitors,
  } = params;

  const { score: competitorGapScore, narrative: competitorNarrative } =
    inferCompetitorGap(canonicalService.canonicalName, competitors);

  const reputationSignal = deriveWorkspaceReputationSignal(profile, competitors);

  const preferenceBoost = canonicalService.isPreferred
    ? 16
    : canonicalService.isHighestMargin
      ? 8
      : 0;

  const marginBoost = canonicalService.isHighestMargin ? 85 : 50;

  const deprioritizedPenalty =
    canonicalService.isDeprioritized || canonicalService.isLowestPriority ? 36 : 0;

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

  const seasonalityTiming = getSeasonalityTiming({
    familyKey: canonicalService.familyKey,
    busyMonths: profile.busyMonths ?? [],
    slowMonths: profile.slowMonths ?? [],
  });

  const seasonalityTimingAdjustment =
    getStaticSeasonalityBias(enrichment.seasonalityRelevance) +
    seasonalityTiming.demandScoreAdjustment;

  const revenueValueScore = scoreRevenueValue({
    serviceDemandScore,
    serviceValueScore,
    preferredServiceBoost: canonicalService.isPreferred ? 85 : 50,
    marginBoost,
  });

  const competitivePositionScore = scoreCompetitivePosition({
    competitorGapScore,
    reputationSignal,
  });

  const marketTimingIntentScore = scoreMarketTimingIntent({
    seasonalityRelevance: enrichment.seasonalityRelevance,
    urgencyRelevance: enrichment.urgencyRelevance,
    homeownerIntentStrength: enrichment.homeownerIntentStrength,
    seasonalityTimingAdjustment,
  });

  const operationalFitScore = scoreOperationalFit(capacityScore);

  const serviceBaseScore = clamp(
  revenueValueScore * 0.36 +
    competitivePositionScore * 0.27 +
    marketTimingIntentScore * 0.27 +
    operationalFitScore * 0.05 -
    (canonicalService.blueprint.nicheLongCycle ? 12 : 0) -
    deprioritizedPenalty,
  1,
  100
);

  const variantKinds: RevenueVariantKind[] =
    seasonalityTiming.timing === "SLOW"
      ? ["capacity", "trust", "primary", "premium", "urgent"]
      : seasonalityTiming.timing === "BUSY"
        ? ["urgent", "premium", "primary", "trust", "capacity"]
        : seasonalityTiming.timing === "PEAK"
          ? ["urgent", "primary", "premium", "trust", "capacity"]
          : seasonalityTiming.timing === "SHOULDER"
            ? ["trust", "capacity", "primary", "premium", "urgent"]
            : ["primary", "urgent", "capacity", "trust", "premium"];

  return variantKinds.map((kind) => {
    const campaignType = getVariantCampaignType({ canonicalService, kind });
    const opportunityType = getVariantOpportunityType({
      canonicalService,
      enrichment,
      kind,
    });
    const actionFraming = getVariantActionFraming(kind);
    const bestMove = getSeasonalBestMove({
      canonicalService,
      kind,
      seasonalityTiming,
    });
    const title = getVariantTitle({ canonicalService, kind });
    const performanceSignal = getPerformanceSignal(performanceSignals, campaignType);

    const displayContract = buildDisplayContract({
      familyKey: canonicalService.familyKey,
      serviceName: canonicalService.canonicalName,
      bestMove,
      actionFraming,
      serviceArea: profile.serviceArea,
    });

    const variantScore =
      serviceBaseScore +
      getVariantScoreAdjustment({
        kind,
        enrichment,
        canonicalService,
        capacityFit,
      }) +
      getSeasonalityVariantAdjustment({
        kind,
        timing: seasonalityTiming,
        familyKey: canonicalService.familyKey,
      }) +
      getReputationVariantAdjustment({
        position: reputationSignal.position,
        kind,
      }) +
      (performanceSignal?.scoreBoost ?? 0);

    return {
      familyKey: canonicalService.familyKey,
      title,
      serviceName: canonicalService.canonicalName,
      opportunityType,
      bestMove,
      displayMoveLabel: displayContract.displayMoveLabel,
      displaySummary: displayContract.displaySummary,
      imageKey: displayContract.imageKey,
      imageMode: displayContract.imageMode,
      actionThesis: {
        ...displayContract.actionThesis,
        angle:
          kind === "urgent"
            ? "fast response"
            : kind === "capacity"
              ? "schedule fill"
              : kind === "trust"
                ? "trust & proof"
                : kind === "premium"
                  ? "premium offer"
                  : "core revenue",
      },
      recommendedCampaignType: campaignType,
      sourceTags: getVariantTags({ canonicalService, kind }),
      whyNowBullets: buildWhyNowBullets({
        canonicalService,
        kind,
        availableJobsEstimate,
        competitorNarrative,
        enrichment,
        profile,
        performanceSignal,
        seasonalityTiming,
        reputationSignal,
        revenueValueScore,
        competitivePositionScore,
        marketTimingIntentScore,
      }),
      whyThisMatters:
        kind === "trust"
          ? reputationSignal.position === "LAGGING"
            ? `${prettyServiceName(
                canonicalService.canonicalName
              )} is commercially important, and your Google reputation currently trails the local market, so stronger proof and trust-building should carry more weight before harder demand capture.`
            : `${prettyServiceName(
                canonicalService.canonicalName
              )} can convert more efficiently when the trust story is stronger and easier for homeowners to believe.`
          : kind === "capacity"
            ? `${prettyServiceName(
                canonicalService.canonicalName
              )} can help create more booked work without changing the core revenue lane the business should be pursuing.`
            : kind === "premium"
              ? reputationSignal.position === "LEADING"
                ? `${prettyServiceName(
                    canonicalService.canonicalName
                  )} is commercially important, and your reputation strength supports a stronger premium-positioning move in this lane.`
                : `${prettyServiceName(
                    canonicalService.canonicalName
                  )} is commercially important enough to justify a higher-value positioning move when market conditions support it.`
              : reputationSignal.position === "LAGGING"
                ? `${prettyServiceName(
                    canonicalService.canonicalName
                  )} matters because it combines revenue potential with a real local competitive gap that the business should close.`
                : reputationSignal.position === "LEADING"
                  ? `${prettyServiceName(
                      canonicalService.canonicalName
                    )} matters because it combines revenue potential with a real local competitive advantage the business can press harder.`
                  : `${prettyServiceName(
                      canonicalService.canonicalName
                    )} matters because it combines revenue potential, live market demand, and a credible local competitive opening.`,
      rawOpportunityScore: Math.round(clamp(variantScore, 1, 100)),
      seasonalityRelevance: enrichment.seasonalityRelevance,
      seasonalityReason: enrichment.seasonalityReason,
      urgencyRelevance: enrichment.urgencyRelevance,
      urgencyReason: enrichment.urgencyReason,
      homeownerIntentStrength: enrichment.homeownerIntentStrength,
      homeownerIntentReason: enrichment.homeownerIntentReason,
      actionFraming,
      actionFramingReason:
        kind === "capacity"
          ? "This variant is designed to turn open capacity into bookings."
          : kind === "trust"
            ? "This variant is designed to improve conversion with stronger proof."
            : kind === "premium"
              ? "This variant is designed to create a stronger commercial offer."
              : kind === "urgent"
                ? "This variant is designed to capture urgent booking intent."
                : "This variant is the core revenue move for the service family.",
      eligibleForBacklog: !canonicalService.isDeprioritized,
      eligibleForHero:
        !canonicalService.isDeprioritized &&
        (kind === "primary" || kind === "urgent" || kind === "premium"),
      isDeprioritized: canonicalService.isDeprioritized,
    };
  });
}

function shouldGenerateVisibilityCandidate(params: {
  profile: BusinessProfile;
  visibilityGapScore: number;
}): boolean {
  const { profile, visibilityGapScore } = params;

  if (hasStrongAeoBaseline(profile)) {
    return false;
  }

  return (
    visibilityGapScore >= 55 ||
    !profile.hasFaqContent ||
    !profile.hasServicePages ||
    (profile.servicePageUrls?.length ?? 0) < 3 ||
    (profile.aeoReadinessScore ?? 0) < 70
  );
}

function buildVisibilityCandidate(params: {
  profile: BusinessProfile;
  canonicalServices: CanonicalService[];
  visibilityGapScore: number;
}): OpportunityCandidate | null {
  const { profile, canonicalServices, visibilityGapScore } = params;

  if (!shouldGenerateVisibilityCandidate({ profile, visibilityGapScore })) {
    return null;
  }

  const focusServices = canonicalServices
    .filter((service) => !service.isDeprioritized)
    .sort((a, b) => {
      const aScore =
        a.blueprint.demandBias + a.blueprint.valueBias + (a.isPreferred ? 6 : 0);
      const bScore =
        b.blueprint.demandBias + b.blueprint.valueBias + (b.isPreferred ? 6 : 0);

      return bScore - aScore;
    })
    .slice(0, 3)
    .map((service) => prettyServiceName(service.canonicalName));

  if (focusServices.length === 0) {
    return null;
  }

  const serviceSummary =
    focusServices.length === 1
      ? focusServices[0]
      : focusServices.length === 2
        ? `${focusServices[0]} and ${focusServices[1]}`
        : `${focusServices[0]}, ${focusServices[1]}, and ${focusServices[2]}`;

  const bestMove = `Improve AI Search Visibility for ${serviceSummary}`;

  const displayContract = buildDisplayContract({
    familyKey: "ai-search-visibility",
    serviceName: serviceSummary,
    bestMove,
    actionFraming: "AEO_CONTENT",
    serviceArea: profile.serviceArea,
  });

  return {
    familyKey: "ai-search-visibility",
    title: "AI Search Visibility Opportunity",
    serviceName: serviceSummary,
    opportunityType: "AI_SEARCH_VISIBILITY",
    bestMove,
    displayMoveLabel: displayContract.displayMoveLabel,
    displaySummary: `Improve AI search visibility for ${serviceSummary} so the strongest service lanes are easier to discover organically.`,
    imageKey: displayContract.imageKey,
    imageMode: displayContract.imageMode,
    actionThesis: {
      ...displayContract.actionThesis,
      primaryService: serviceSummary,
      summary: `Improve AI search visibility for ${serviceSummary} in ${
        profile.serviceArea?.trim() || "your service area"
      }.`,
    },
    recommendedCampaignType: "AEO_FAQ",
    sourceTags: uniqueTags(["Demand", "AEO"]),
    whyNowBullets: [
      "AEO readiness is still below the threshold where AI search visibility should be considered strong.",
      `The best visibility upside is currently tied to ${serviceSummary}.`,
      "This should appear as one consolidated visibility lane, not one filler action per service family.",
    ],
    whyThisMatters:
      "AI search visibility should only surface when the baseline is genuinely weak and the opportunity can improve discovery for important services.",
    rawOpportunityScore: Math.round(clamp(32 + visibilityGapScore * 0.7, 35, 78)),
    seasonalityRelevance: "MEDIUM",
    seasonalityReason: "Visibility improvements compound over time across important service lanes.",
    urgencyRelevance: "LOW",
    urgencyReason: "This is a strategic visibility move, not an emergency demand capture lane.",
    homeownerIntentStrength: "MEDIUM",
    homeownerIntentReason:
      "AI search visibility matters when homeowners are comparing trusted local providers.",
    actionFraming: "AEO_CONTENT",
    actionFramingReason:
      "This is a single consolidated visibility lane for the most commercially important services.",
    eligibleForBacklog: true,
    eligibleForHero: false,
    isDeprioritized: false,
  };
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
  if (candidate.rawOpportunityScore >= 84) {
    scoreDrivenHigh = rangeProfile.maxHigh;
  } else if (candidate.rawOpportunityScore >= 74) {
    scoreDrivenHigh = Math.max(rangeProfile.minHigh + 1, rangeProfile.minHigh);
  } else if (candidate.rawOpportunityScore >= 64) {
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
    rawOpportunityScore: candidate.rawOpportunityScore,
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

function applyOpportunityScoreIndex(
  opportunities: RankedOpportunity[]
): RankedOpportunity[] {
  if (opportunities.length === 0) {
    return opportunities;
  }

  const mean =
    opportunities.reduce(
      (sum, opportunity) => sum + opportunity.rawOpportunityScore,
      0
    ) / opportunities.length;

  return opportunities.map((opportunity) => ({
    ...opportunity,
    rawOpportunityScore: Math.round(
      clamp(100 + (opportunity.rawOpportunityScore - mean) * 0.9, 50, 200)
    ),
  }));
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
    },
    serviceNames: enrichmentRequestNames,
  });

  const candidateBuckets = servicesForEngine.flatMap((canonicalService) => {
    const enrichment =
      enrichmentMap.get(normalize(canonicalService.canonicalName)) ??
      enrichmentMap.get(canonicalService.familyKey);

    if (!enrichment) {
      return [];
    }

    return buildRevenueVariantCandidates({
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

  const visibilityCandidate = buildVisibilityCandidate({
    profile,
    canonicalServices: servicesForEngine,
    visibilityGapScore,
  });

  const candidates = [...candidateBuckets, ...(visibilityCandidate ? [visibilityCandidate] : [])]
    .sort((a, b) => b.rawOpportunityScore - a.rawOpportunityScore);

  const defaultAvgJobValue = Number(profile.averageJobValue ?? 450);

  const rankedOpportunities = applyOpportunityScoreIndex(
  candidates.map((candidate) =>
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
  )
);

const top =
  rankedOpportunities.find(
      (opportunity) =>
        opportunity.eligibleForHero &&
        !opportunity.isDeprioritized &&
        opportunity.opportunityType !== "AI_SEARCH_VISIBILITY"
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