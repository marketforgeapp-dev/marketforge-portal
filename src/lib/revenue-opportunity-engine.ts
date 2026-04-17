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
import {
  type OpportunitySurfaceDecision,
  getServiceContextProfile,
  evaluateDeterministicContext,
  getAiContextFitBatch,
} from "@/lib/opportunity-context-fit";

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
  baseDeterministicScore: number;
  deterministicContextAdjustment: number;
  deterministicContextMultiplier: number;
  aiContextFitScore: number | null;
  aiContextAdjustment: number;
  finalRecommendationScore: number;
  finalSurface: OpportunitySurfaceDecision;
  heroEligibleFinal: boolean;
  decisionRationale: string;
  variantKind: RevenueVariantKind | "visibility";
  contextType: string;
  demandShape: DemandShape;

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
  sourceTags: OpportunitySourceTag[];
  whyNowBullets: string[];
  whyThisMatters: string;

  rawOpportunityScore: number;
  baseDeterministicScore: number;
  variantKind: RevenueVariantKind | "visibility";

  deterministicContextAdjustment: number;
  deterministicContextMultiplier: number;
  aiContextFitScore: number | null;
  aiContextAdjustment: number;
  finalRecommendationScore: number;
  finalSurface: OpportunitySurfaceDecision;
  heroEligibleFinal: boolean;
  decisionRationale: string;
  contextType: string;
  demandShape: DemandShape;

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

export type DemandShape =
  | "everyday-core"
  | "urgent-problem"
  | "high-value-narrow"
  | "schedule-fill"
  | "trust-build"
  | "visibility";

function toOpportunityKey(params: {
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
}) {
  return buildOpportunityKey(params);
}

function clampAiAdjustment(contextFitScore: number | null): number {
  if (contextFitScore === null) return 0;
  return clamp((contextFitScore - 50) * 0.24, -12, 12);
}

function mergeSurfaceDecision(params: {
  deterministicSurface: OpportunitySurfaceDecision;
  aiSurface: OpportunitySurfaceDecision | null;
  heroEligibleDeterministic: boolean;
  heroEligibleAi: boolean | null;
}): {
  finalSurface: OpportunitySurfaceDecision;
  heroEligibleFinal: boolean;
} {
  if (params.deterministicSurface === "suppress") {
    return {
      finalSurface: "suppress",
      heroEligibleFinal: false,
    };
  }

  let finalSurface: OpportunitySurfaceDecision = params.deterministicSurface;

  if (params.aiSurface) {
  if (params.aiSurface === "suppress") {
    finalSurface = "suppress";
  } else if (params.aiSurface === "reserve") {
    finalSurface = "reserve";
  } else if (params.aiSurface === "surface" && finalSurface === "hero") {
    finalSurface = "surface";
  } else if (
    params.aiSurface === "hero" &&
    params.deterministicSurface !== "reserve" &&
    params.heroEligibleDeterministic
  ) {
    finalSurface = "hero";
  }
}

  const heroEligibleFinal =
    params.heroEligibleDeterministic &&
    params.heroEligibleAi !== false &&
    finalSurface === "hero";

  return {
    finalSurface,
    heroEligibleFinal,
  };
}

function limitCandidatesPerFamily(
  candidates: OpportunityCandidate[]
): OpportunityCandidate[] {
  const byFamily = new Map<string, OpportunityCandidate[]>();

  for (const candidate of candidates) {
    const existing = byFamily.get(candidate.familyKey) ?? [];
    existing.push(candidate);
    byFamily.set(candidate.familyKey, existing);
  }

  const limited: OpportunityCandidate[] = [];

  for (const [familyKey, familyCandidates] of byFamily.entries()) {
    const contextProfile = getServiceContextProfile(familyKey);
    const ordered = [...familyCandidates].sort(
      (a, b) => b.rawOpportunityScore - a.rawOpportunityScore
    );

    limited.push(...ordered.slice(0, contextProfile.maxVisiblePerFamily + 1));
  }

  return limited.sort((a, b) => b.rawOpportunityScore - a.rawOpportunityScore);
}

function getDemandShape(params: {
  familyKey: string;
  kind: RevenueVariantKind | "visibility";
}): DemandShape {
  if (params.familyKey === "ai-search-visibility" || params.kind === "visibility") {
    return "visibility";
  }

  if (params.kind === "capacity") {
    return "schedule-fill";
  }

  if (params.kind === "trust") {
    return "trust-build";
  }

  if (params.kind === "urgent") {
    return "urgent-problem";
  }

  const lowFrequencyFamilies = new Set([
    "slab-leak-repair",
    "gas-line",
    "tankless-water-heater",
    "water-softener",
    "sewer-line",
    "sewer-line-septic",
    "repiping",
    "custom-home-plumbing-installation",
    "system-replacement",
    "lot-clearing",
    "arborist-consultation",
    "septic-installation",
    "drain-field-repair",
  ]);

  if (lowFrequencyFamilies.has(params.familyKey) || params.kind === "premium") {
    return "high-value-narrow";
  }

  return "everyday-core";
}

function buildCompetitorSummaryForAi(params: {
  serviceName: string;
  competitors: Competitor[];
  profile: BusinessProfile;
}): string {
  const normalizedService = normalize(params.serviceName);
  const serviceTokens = normalizedService.split(" ").filter((token) => token.length > 2);

  const overlappingCompetitors = params.competitors.filter((competitor) =>
    (competitor.serviceFocus ?? []).some((focus) => {
      const normalizedFocus = normalize(focus);
      return serviceTokens.some((token) => normalizedFocus.includes(token));
    })
  );

  const competitorPool =
    overlappingCompetitors.length > 0 ? overlappingCompetitors : params.competitors;

  const strongCompetitors = competitorPool.filter(
    (competitor) =>
      (competitor.rating ?? 0) >= 4.5 && (competitor.reviewCount ?? 0) >= 40
  ).length;

  const overlapCount = overlappingCompetitors.length;

  const businessRating = params.profile.googleRating ?? null;
const businessReviewCount = params.profile.googleReviewCount ?? null;

  return [
    `Matched competitor count for this lane: ${overlapCount}.`,
    `Competitor pool size considered: ${competitorPool.length}.`,
    `Strong review competitors in this lane: ${strongCompetitors}.`,
    `Business Google rating: ${businessRating ?? "unknown"}.`,
    `Business Google review count: ${businessReviewCount ?? "unknown"}.`,
  ].join(" ");
}

function shouldAllowUrgentVariant(params: {
  canonicalService: CanonicalService;
  enrichment: SignalEnrichment;
}): boolean {
  const emergencyFamilies = new Set([
    "burst-pipe-repair",
    "emergency-plumbing",
    "emergency-septic",
    "storm-cleanup",
  ]);

  if (emergencyFamilies.has(params.canonicalService.familyKey)) {
    return true;
  }

  return (
    params.enrichment.urgencyRelevance === "HIGH" &&
    params.enrichment.homeownerIntentStrength === "HIGH"
  );
}

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

function isGeneralServiceFamily(familyKey: string): boolean {
  return new Set([
    "general-plumbing",
    "general-hvac-service",
    "general-septic-service",
    "general-tree-service",
    "maintenance",
    "hvac-maintenance",
    "septic-maintenance",
  ]).has(familyKey);
}

function shouldSuppressGeneralServiceFamily(params: {
  profile: BusinessProfile;
  familyKey: string;
}): boolean {
  if (!isGeneralServiceFamily(params.familyKey)) {
    return false;
  }

  if (params.profile.generalServiceHandledByPartner) {
    return true;
  }

  if (!params.profile.promoteGeneralServiceActions) {
    return true;
  }

  return false;
}

function cleanServiceStyleDisplayLabel(params: {
  familyKey: string;
  displayMoveLabel: string;
}): string {
  if (isGeneralServiceFamily(params.familyKey)) {
    return params.displayMoveLabel;
  }

  return params.displayMoveLabel
    .replace(/\bRepair Service\b/gi, "Repair")
    .replace(/\bReplacement Service\b/gi, "Replacement")
    .replace(/\bInstallation Service\b/gi, "Installation")
    .replace(/\bService Service\b/gi, "Service")
    .replace(/\s+/g, " ")
    .trim();
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
      displayMoveLabel: "Make It Easier for Homeowners to Find You Online",
      displaySummary: `Make it easier for homeowners in ${area} to find your most important services online.`,
      imageKey: "company-logo",
      imageMode: "LOGO",
      actionThesis: {
        familyKey,
        primaryService: prettyService,
        angle: "online visibility",
        title: bestMove,
        summary: `Make it easier for homeowners in ${area} to find your most important services online.`,
        audience: `Homeowners in ${area} searching online for trusted local providers`,
        offerHint: "",
        ctaHint: "Review visibility action",
        imageKey: "company-logo",
        imageMode: "LOGO",
      },
    };
  }

  const framingSummaryMap: Record<ActionFraming, string> = {
    PAID_CAMPAIGN: `Create more booked ${prettyService.toLowerCase()} jobs in ${area}.`,
    SCHEDULE_FILL: `Use open capacity to book more ${prettyService.toLowerCase()} work in ${area}.`,
    REPUTATION: `Show homeowners why your business is a strong choice for ${prettyService.toLowerCase()} in ${area}.`,
    PROMOTION: `Promote a higher-value ${prettyService.toLowerCase()} option in ${area}.`,
    LOCAL_VISIBILITY: `Help more homeowners in ${area} find your ${prettyService.toLowerCase()} services.`,
    AEO_CONTENT: `Make it easier for homeowners in ${area} to find your services online.`,
    MIXED: `Create more booked ${prettyService.toLowerCase()} jobs in ${area}.`,
  };

  const audienceMap: Record<ActionFraming, string> = {
    PAID_CAMPAIGN: `Homeowners in ${area} who need ${prettyService.toLowerCase()}`,
    SCHEDULE_FILL: `Homeowners in ${area} with service needs that are easier to book this week`,
    REPUTATION: `Homeowners in ${area} comparing providers for ${prettyService.toLowerCase()} and looking for a company they can trust`,
    PROMOTION: `Homeowners in ${area} considering ${prettyService.toLowerCase()} and likely to respond to a stronger high-value option`,
    LOCAL_VISIBILITY: `Homeowners in ${area} searching for ${prettyService.toLowerCase()} help`,
    AEO_CONTENT: `Homeowners in ${area} searching online for trusted local providers`,
    MIXED: `Homeowners in ${area} who need ${prettyService.toLowerCase()}`,
  };

  const ctaMap: Record<ActionFraming, string> = {
    PAID_CAMPAIGN: `Book ${prettyService.toLowerCase()}`,
    SCHEDULE_FILL: "Book now",
    REPUTATION: "See why homeowners choose us",
    PROMOTION: `Book ${prettyService.toLowerCase()}`,
    LOCAL_VISIBILITY: "Review visibility action",
    AEO_CONTENT: "Review visibility action",
    MIXED: `Book ${prettyService.toLowerCase()}`,
  };

  return {
    displayMoveLabel: bestMove,
    displaySummary:
      framingSummaryMap[actionFraming] ??
      `Create more ${prettyService.toLowerCase()} jobs in ${area}.`,
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
        `Create more ${prettyService.toLowerCase()} jobs in ${area}.`,
      audience:
        audienceMap[actionFraming] ??
        `Homeowners in ${area} who need ${prettyService.toLowerCase()}`,
      offerHint: "",
      ctaHint:
        ctaMap[actionFraming] ?? `Book ${prettyService.toLowerCase()}`,
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
      return `Show Homeowners Why Your ${prettyName} Service Is the Right Choice`;
    }
  }

  if (seasonalityTiming.timing === "BUSY") {
    if (kind === "urgent") {
      return `Get More ${prettyName} Jobs Now`;
    }

    if (kind === "premium") {
      return `Promote Higher-Value ${prettyName} Service`;
    }
  }

  if (seasonalityTiming.timing === "PEAK") {
    if (kind === "urgent") {
      return `Get More ${prettyName} Jobs During Peak Demand`;
    }

    if (kind === "premium") {
      return `Promote Higher-Value ${prettyName} Service`;
    }
  }

  if (seasonalityTiming.timing === "SHOULDER") {
    if (kind === "trust") {
      return `Show Homeowners Why Your ${prettyName} Service Is the Right Choice`;
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
      return `Get More ${prettyName} Jobs Now`;
    case "capacity":
      return `Fill Schedule with ${prettyName}`;
    case "trust":
      return `Show Homeowners Why Your ${prettyName} Service Is the Right Choice`;
    case "premium":
      return `Promote Higher-Value ${prettyName} Service`;
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
      return `${prettyName} Immediate Revenue Opportunity`;
    case "capacity":
      return `${prettyName} Schedule Fill Opportunity`;
    case "trust":
      return `${prettyName} Credibility Opportunity`;
    case "premium":
      return `${prettyName} Higher-Value Service Opportunity`;
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
    seasonalityTiming,
    reputationSignal,
    revenueValueScore,
    competitivePositionScore,
    marketTimingIntentScore,
  } = params;

  const service = prettyServiceName(canonicalService.canonicalName);

  let bulletOne = "";
  if (revenueValueScore >= 80) {
    bulletOne = `${service} is one of the clearest ways for you to generate meaningful revenue right now.`;
  } else if (revenueValueScore >= 65) {
    bulletOne = `${service} is a solid revenue opportunity and can help create dependable job flow.`;
  } else {
    bulletOne = `${service} can still help create incremental revenue without needing a major strategic shift.`;
  }

  if (canonicalService.isPreferred) {
    bulletOne += ` It is also one of the services your business most wants to grow.`;
  }

  if (canonicalService.isHighestMargin) {
    bulletOne += ` It also has stronger profit potential than many of your other service lines.`;
  }

  let bulletTwo = "";
  if (reputationSignal.position === "LAGGING") {
    bulletTwo = `Homeowners are likely comparing you against competitors here, and your Google reputation is currently giving them less confidence than it should.`;
  } else if (reputationSignal.position === "LEADING") {
    bulletTwo = `Your Google reputation is already stronger than many competitors in this lane, which gives you a real advantage when homeowners are deciding who to hire.`;
  } else if (competitivePositionScore >= 70) {
    bulletTwo = `There is a real opening here because this service is valuable and the local competitive pressure looks manageable.`;
  } else {
    bulletTwo = `This service is important enough that even a modest improvement in visibility or conversion can turn into real booked work.`;
  }

  let bulletThree = "";
  if (kind === "capacity") {
    bulletThree = `You have room in the schedule for roughly ${availableJobsEstimate} more jobs, so this is one of the easiest places to create revenue without overloading the team.`;
  } else if (kind === "urgent") {
    bulletThree = `Homeowners usually do not wait long to act on this kind of need, so this is a strong opportunity to win jobs quickly.`;
  } else if (kind === "premium") {
    bulletThree = `This is the kind of service where better positioning can help you win higher-value work instead of only competing on price.`;
  } else if (kind === "trust") {
    bulletThree = `This is a service where homeowners want to feel confident before they book, so clearer proof and credibility can directly improve conversion.`;
  } else if (marketTimingIntentScore >= 75) {
    bulletThree = `The timing is supportive right now, so this is a strong moment to put real attention behind this service.`;
  } else if (marketTimingIntentScore >= 60) {
    bulletThree = `There is enough demand and timing support here to justify action now instead of waiting.`;
  } else {
    bulletThree = seasonalityTiming.explanation;
  }

  return [bulletOne, bulletTwo, bulletThree];
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
    if (
    shouldSuppressGeneralServiceFamily({
      profile,
      familyKey: canonicalService.familyKey,
    })
  ) {
    return [];
  }

  const { score: competitorGapScore, narrative: competitorNarrative } =
    inferCompetitorGap(canonicalService.canonicalName, competitors);

  const reputationSignal = deriveWorkspaceReputationSignal(profile, competitors);

    const preferenceBoost = canonicalService.isPreferred ? 6 : 0;

  const marginBoost = canonicalService.isHighestMargin ? 72 : 50;

  const deprioritizedPenalty = canonicalService.isDeprioritized
    ? 14
    : canonicalService.isLowestPriority
      ? 6
      : 0;

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
    preferredServiceBoost: canonicalService.isPreferred ? 62 : 50,
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

  const seasonalPriority: RevenueVariantKind[] =
    seasonalityTiming.timing === "SLOW"
      ? ["capacity", "trust", "primary", "premium", "urgent"]
      : seasonalityTiming.timing === "BUSY"
        ? ["urgent", "premium", "primary", "trust", "capacity"]
        : seasonalityTiming.timing === "PEAK"
          ? ["urgent", "primary", "premium", "trust", "capacity"]
          : seasonalityTiming.timing === "SHOULDER"
            ? ["trust", "capacity", "primary", "premium", "urgent"]
            : ["primary", "urgent", "capacity", "trust", "premium"];

  const enabledVariantKinds = new Set<RevenueVariantKind>(["primary"]);

    if (
    shouldAllowUrgentVariant({
      canonicalService,
      enrichment,
    })
  ) {
    enabledVariantKinds.add("urgent");
  }

  if (capacityFit !== "LOW" && !canonicalService.blueprint.nicheLongCycle) {
    enabledVariantKinds.add("capacity");
  }

  if (
    reputationSignal.position === "LAGGING" ||
    (competitivePositionScore >= 70 && canonicalService.blueprint.valueBias >= 8)
  ) {
    enabledVariantKinds.add("trust");
  }

  if (canonicalService.blueprint.valueBias >= 10 || canonicalService.isHighestMargin) {
    enabledVariantKinds.add("premium");
  }

  const variantKinds = seasonalPriority.filter((kind) =>
    enabledVariantKinds.has(kind)
  );

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
            opportunityKey: toOpportunityKey({
        serviceName: canonicalService.canonicalName,
        opportunityType,
        bestMove,
      }),
      bestMove,
            displayMoveLabel: cleanServiceStyleDisplayLabel({
        familyKey: canonicalService.familyKey,
        displayMoveLabel: displayContract.displayMoveLabel,
      }),
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
                ? "proof and credibility"
                : kind === "premium"
                  ? "higher-value positioning"
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
            baseDeterministicScore: Math.round(clamp(variantScore, 1, 100)),
      variantKind: kind,
      deterministicContextAdjustment: 0,
      deterministicContextMultiplier: 1,
      aiContextFitScore: null,
      aiContextAdjustment: 0,
      finalRecommendationScore: Math.round(clamp(variantScore, 1, 100)),
      finalSurface: "surface",
      heroEligibleFinal:
        !canonicalService.isDeprioritized &&
        (kind === "primary" || kind === "urgent" || kind === "premium"),
      decisionRationale: "Pending deterministic and AI context-fit evaluation.",
      contextType: getServiceContextProfile(canonicalService.familyKey).contextType,
            demandShape: getDemandShape({
        familyKey: canonicalService.familyKey,
        kind,
      }),
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
              ? "This variant is designed to create a stronger premium positioning move."
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

    const bestMove = `Make It Easier for Homeowners to Find ${serviceSummary} Online`;

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
        opportunityKey: toOpportunityKey({
      serviceName: serviceSummary,
      opportunityType: "AI_SEARCH_VISIBILITY",
      bestMove,
    }),
    bestMove,
    displayMoveLabel: displayContract.displayMoveLabel,
    displaySummary: `Make it easier for homeowners to find ${serviceSummary} when they search online.`,
    imageKey: displayContract.imageKey,
    imageMode: displayContract.imageMode,
    actionThesis: {
      ...displayContract.actionThesis,
      primaryService: serviceSummary,
    summary: `Make it easier for homeowners to find ${serviceSummary} in ${
       profile.serviceArea?.trim() || "your service area"
      } when they search online.`,
    },
    recommendedCampaignType: "AEO_FAQ",
    sourceTags: uniqueTags(["Demand", "AEO"]),
        whyNowBullets: [
      "Homeowners cannot book you if they do not find you clearly when they search online.",
      `The biggest visibility upside right now is tied to ${serviceSummary}.`,
      "This should be one clear visibility action, not a scattered set of filler tasks.",
    ],
    whyThisMatters:
      "When homeowners have trouble finding your most important services online, you can lose jobs before they ever call.",
    rawOpportunityScore: Math.round(clamp(32 + visibilityGapScore * 0.7, 35, 78)),
        baseDeterministicScore: Math.round(clamp(32 + visibilityGapScore * 0.7, 35, 78)),
    variantKind: "visibility",
    deterministicContextAdjustment: 0,
    deterministicContextMultiplier: 1,
    aiContextFitScore: null,
    aiContextAdjustment: 0,
    finalRecommendationScore: Math.round(clamp(32 + visibilityGapScore * 0.7, 35, 78)),
    finalSurface: "surface",
    heroEligibleFinal: false,
    decisionRationale: "Pending deterministic and AI context-fit evaluation.",
    contextType: "visibility",
        demandShape: "visibility",
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

async function applyContextAndAiScoring(params: {
  profile: BusinessProfile;
  candidates: OpportunityCandidate[];
  visibilityGapScore: number;
  competitors: Competitor[];
}): Promise<OpportunityCandidate[]> {
  const { profile, visibilityGapScore, competitors } = params;

  const deterministicEvaluated = params.candidates.map((candidate) => {
    const deterministicContext = evaluateDeterministicContext({
      familyKey: candidate.familyKey,
      variantKind: candidate.variantKind,
      seasonalityRelevance: candidate.seasonalityRelevance,
      urgencyRelevance: candidate.urgencyRelevance,
      homeownerIntentStrength: candidate.homeownerIntentStrength,
      visibilityGapScore:
        candidate.familyKey === "ai-search-visibility" ? visibilityGapScore : undefined,
      baseScore: candidate.baseDeterministicScore,
      isDeprioritized: candidate.isDeprioritized,
    });

    const deterministicAdjustedScore = clamp(
      (candidate.baseDeterministicScore + deterministicContext.deterministicAdjustment) *
        deterministicContext.deterministicMultiplier,
      1,
      100
    );

    return {
      ...candidate,
      deterministicContextAdjustment: deterministicContext.deterministicAdjustment,
      deterministicContextMultiplier: deterministicContext.deterministicMultiplier,
      finalRecommendationScore: Math.round(deterministicAdjustedScore),
      finalSurface: deterministicContext.preliminarySurface,
      heroEligibleFinal: deterministicContext.heroEligibleDeterministic,
      decisionRationale: deterministicContext.deterministicReason,
      contextType: deterministicContext.contextType,
    };
  });

  const aiMap = await getAiContextFitBatch({
    profile: {
      businessName: profile.businessName,
      city: profile.city,
      state: profile.state,
      serviceArea: profile.serviceArea,
      averageJobValue: profile.averageJobValue,
      preferredServices: profile.preferredServices,
      deprioritizedServices: profile.deprioritizedServices,
      weeklyCapacity: profile.weeklyCapacity,
      hasFaqContent: profile.hasFaqContent,
      hasBlog: profile.hasBlog,
      hasServicePages: profile.hasServicePages,
      hasGoogleBusinessPage: profile.hasGoogleBusinessPage,
      aeoReadinessScore: profile.aeoReadinessScore,
      googleRating: profile.googleRating,
      googleReviewCount: profile.googleReviewCount,
    },
    candidates: deterministicEvaluated.map((candidate) => {
      const contextProfile = getServiceContextProfile(candidate.familyKey);

      const deterministicContext = evaluateDeterministicContext({
        familyKey: candidate.familyKey,
        variantKind: candidate.variantKind,
        seasonalityRelevance: candidate.seasonalityRelevance,
        urgencyRelevance: candidate.urgencyRelevance,
        homeownerIntentStrength: candidate.homeownerIntentStrength,
        visibilityGapScore:
          candidate.familyKey === "ai-search-visibility" ? visibilityGapScore : undefined,
        baseScore: candidate.baseDeterministicScore,
        isDeprioritized: candidate.isDeprioritized,
      });

      return {
        opportunityKey: candidate.opportunityKey,
        familyKey: candidate.familyKey,
        title: candidate.title,
        serviceName: candidate.serviceName,
        bestMove: candidate.bestMove,
        opportunityType: candidate.opportunityType,
        actionFraming: candidate.actionFraming,
        variantKind: candidate.variantKind,
        rawBaseScore: candidate.baseDeterministicScore,
        seasonalityRelevance: candidate.seasonalityRelevance,
        seasonalityReason: candidate.seasonalityReason,
        urgencyRelevance: candidate.urgencyRelevance,
        urgencyReason: candidate.urgencyReason,
        homeownerIntentStrength: candidate.homeownerIntentStrength,
        homeownerIntentReason: candidate.homeownerIntentReason,
        whyNowBullets: candidate.whyNowBullets,
        whyThisMatters: candidate.whyThisMatters,
        visibilityGapScore:
          candidate.familyKey === "ai-search-visibility" ? visibilityGapScore : undefined,
        competitorSummary: buildCompetitorSummaryForAi({
          serviceName: candidate.serviceName,
          competitors,
          profile,
        }),
        contextProfile,
        deterministicContext,
      };
    }),
  });

  return deterministicEvaluated.map((candidate) => {
    const ai = aiMap.get(candidate.opportunityKey) ?? null;
    const aiAdjustment = clampAiAdjustment(ai?.contextFitScore ?? null);

    const mergedSurface = mergeSurfaceDecision({
      deterministicSurface: candidate.finalSurface,
      aiSurface: ai?.recommendedSurface ?? null,
      heroEligibleDeterministic: candidate.heroEligibleFinal,
      heroEligibleAi: ai?.heroEligible ?? null,
    });

    const finalRecommendationScore = clamp(
      candidate.finalRecommendationScore + aiAdjustment,
      1,
      100
    );

    return {
      ...candidate,
      aiContextFitScore: ai?.contextFitScore ?? null,
      aiContextAdjustment: aiAdjustment,
      finalRecommendationScore: Math.round(finalRecommendationScore),
      rawOpportunityScore: Math.round(finalRecommendationScore),
      finalSurface: mergedSurface.finalSurface,
      heroEligibleFinal: mergedSurface.heroEligibleFinal,
      decisionRationale:
        ai?.decisionRationale?.trim() ||
        candidate.decisionRationale,
    };
  });
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
    if (candidate.finalRecommendationScore >= 84) {
    scoreDrivenHigh = rangeProfile.maxHigh;
    } else if (candidate.finalRecommendationScore >= 74) {
    scoreDrivenHigh = Math.max(rangeProfile.minHigh + 1, rangeProfile.minHigh);
    } else if (candidate.finalRecommendationScore >= 64) {
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
        rawOpportunityScore: candidate.finalRecommendationScore,
    baseDeterministicScore: candidate.baseDeterministicScore,
    deterministicContextAdjustment: candidate.deterministicContextAdjustment,
    deterministicContextMultiplier: candidate.deterministicContextMultiplier,
    aiContextFitScore: candidate.aiContextFitScore,
    aiContextAdjustment: candidate.aiContextAdjustment,
    finalRecommendationScore: candidate.finalRecommendationScore,
    finalSurface: candidate.finalSurface,
    heroEligibleFinal: candidate.heroEligibleFinal,
    decisionRationale: candidate.decisionRationale,
    variantKind: candidate.variantKind,
    contextType: candidate.contextType,
        demandShape: candidate.demandShape,
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

    const rawCandidates = [
    ...candidateBuckets,
    ...(visibilityCandidate ? [visibilityCandidate] : []),
  ].sort((a, b) => b.rawOpportunityScore - a.rawOpportunityScore);

  const governedCandidates = limitCandidatesPerFamily(rawCandidates);

  const contextFitCandidates = await applyContextAndAiScoring({
    profile,
    candidates: governedCandidates,
    visibilityGapScore,
    competitors,
  });

  const defaultAvgJobValue = Number(profile.averageJobValue ?? 450);

  const rankedOpportunities = applyOpportunityScoreIndex(
    contextFitCandidates.map((candidate) =>
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
        opportunity.heroEligibleFinal &&
        opportunity.finalSurface === "hero" &&
        !opportunity.isDeprioritized
    ) ??
    rankedOpportunities.find(
      (opportunity) =>
        opportunity.finalSurface === "surface" &&
        !opportunity.isDeprioritized
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