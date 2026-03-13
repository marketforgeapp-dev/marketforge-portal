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

export type OpportunitySourceTag =
  | "Demand"
  | "Competitor"
  | "Capacity"
  | "Service Value"
  | "AEO";

export type OpportunityConfidenceLabel = "Low" | "Medium" | "High";

export type RankedOpportunity = {
  opportunityKey: string;
  title: string;
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
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
};

export type RevenueOpportunityHero = {
  title: string;
  opportunityTitle: string;
  opportunityType: OpportunityType;
  jobsLow: number;
  jobsHigh: number;
  revenueLow: number;
  revenueHigh: number;
  headlineJobsText: string;
  headlineRevenueText: string;
  bestMove: string;
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

type ServiceBlueprint = {
  familyKey: string;
  serviceName: string;
  title: string;
  defaultOpportunityType: OpportunityType;
  defaultCampaignType: CampaignType;
  defaultBestMove: string;
  defaultActionFraming: ActionFraming;
  demandBias: number;
  valueBias: number;
  everydayBias: number;
  capacityBias: number;
  aeoBias: number;
  nicheLongCycle: boolean;
  backlogEligibleByDefault: boolean;
};

type ServiceSignalProfile = {
  blueprint: ServiceBlueprint;
  serviceName: string;
  serviceDemandScore: number;
  competitorGapScore: number;
  capacityScore: number;
  serviceValueScore: number;
  visibilityGapScore: number;
  servicePriorityScore: number;
  competitorNarrative: string;
  explicitPreferenceBoost: number;
};

type OpportunityCandidate = {
  canonicalKey: string;
  familyKey: string;
  title: string;
  serviceName: string;
  opportunityType: OpportunityType;
  bestMove: string;
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
};

const BASELINE_SERVICE_BLUEPRINTS: ServiceBlueprint[] = [
  {
    familyKey: "drain-cleaning",
    serviceName: "Drain cleaning",
    title: "Drain Cleaning Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "DRAIN_SPECIAL",
    defaultBestMove: "Launch Drain Cleaning Special",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 18,
    valueBias: 4,
    everydayBias: 14,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "leak-repair",
    serviceName: "Leak repair",
    title: "Leak Repair Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Leak Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 14,
    valueBias: 3,
    everydayBias: 14,
    capacityBias: 6,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "emergency-plumbing",
    serviceName: "Emergency plumbing",
    title: "Emergency Plumbing Revenue Opportunity",
    defaultOpportunityType: "COMPETITOR_INACTIVE",
    defaultCampaignType: "EMERGENCY_SERVICE",
    defaultBestMove: "Activate Emergency Plumbing Response",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 16,
    valueBias: 5,
    everydayBias: 13,
    capacityBias: 2,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "water-heater",
    serviceName: "Water heater replacement",
    title: "Water Heater Revenue Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "WATER_HEATER",
    defaultBestMove: "Promote Water Heater Replacement",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 12,
    valueBias: 12,
    everydayBias: 8,
    capacityBias: 4,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "maintenance",
    serviceName: "Plumbing maintenance",
    title: "Open Capacity Revenue Opportunity",
    defaultOpportunityType: "CAPACITY_GAP",
    defaultCampaignType: "MAINTENANCE_PUSH",
    defaultBestMove: "Fill Schedule with Maintenance Checkups",
    defaultActionFraming: "SCHEDULE_FILL",
    demandBias: 8,
    valueBias: 2,
    everydayBias: 10,
    capacityBias: 18,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "general-plumbing",
    serviceName: "General plumbing",
    title: "General Plumbing Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote General Plumbing Services",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 2,
    everydayBias: 10,
    capacityBias: 8,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "ai-search-visibility",
    serviceName: "AI search visibility",
    title: "AI Search Visibility Opportunity",
    defaultOpportunityType: "AI_SEARCH_VISIBILITY",
    defaultCampaignType: "AEO_FAQ",
    defaultBestMove: "Publish AI Answer Visibility FAQs",
    defaultActionFraming: "AEO_CONTENT",
    demandBias: 4,
    valueBias: 1,
    everydayBias: 2,
    capacityBias: 4,
    aeoBias: 20,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "toilet-repair",
    serviceName: "Toilet repair",
    title: "Toilet Repair Revenue Opportunity",
    defaultOpportunityType: "LOCAL_SEARCH_SPIKE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Toilet Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 10,
    valueBias: 1,
    everydayBias: 10,
    capacityBias: 6,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "sump-pump",
    serviceName: "Sump pump repair",
    title: "Sump Pump Revenue Opportunity",
    defaultOpportunityType: "SEASONAL_DEMAND",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Sump Pump Repair Service",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 9,
    valueBias: 2,
    everydayBias: 8,
    capacityBias: 5,
    aeoBias: 0,
    nicheLongCycle: false,
    backlogEligibleByDefault: true,
  },
  {
    familyKey: "long-cycle-specialty",
    serviceName: "Sewer line replacement",
    title: "Specialty Line Replacement Opportunity",
    defaultOpportunityType: "HIGH_VALUE_SERVICE",
    defaultCampaignType: "CUSTOM",
    defaultBestMove: "Promote Specialty Line Replacement",
    defaultActionFraming: "PAID_CAMPAIGN",
    demandBias: 5,
    valueBias: 16,
    everydayBias: 0,
    capacityBias: 1,
    aeoBias: 0,
    nicheLongCycle: true,
    backlogEligibleByDefault: false,
  },
];

function normalizeServiceName(service: string): string {
  return service.trim().toLowerCase();
}

function slugify(value: string): string {
  return normalizeServiceName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueTags(tags: OpportunitySourceTag[]): OpportunitySourceTag[] {
  return [...new Set(tags)];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function levelToScore(level: InferredSignalLevel): number {
  if (level === "HIGH") return 12;
  if (level === "MEDIUM") return 6;
  return 0;
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

function getServiceFamilyKey(serviceName: string): string {
  const normalized = normalizeServiceName(serviceName);

  if (
    normalized.includes("drain") ||
    normalized.includes("clog") ||
    normalized.includes("rooter")
  ) {
    return "drain-cleaning";
  }

  if (normalized.includes("leak")) {
    return "leak-repair";
  }

  if (
    normalized.includes("emergency") ||
    normalized.includes("after hours")
  ) {
    return "emergency-plumbing";
  }

  if (
    normalized.includes("water heater") ||
    normalized.includes("hot water")
  ) {
    return "water-heater";
  }

  if (
    normalized.includes("maintenance") ||
    normalized.includes("checkup") ||
    normalized.includes("inspection")
  ) {
    return "maintenance";
  }

  if (
    normalized.includes("ai search") ||
    normalized.includes("answer") ||
    normalized.includes("faq") ||
    normalized.includes("aeo")
  ) {
    return "ai-search-visibility";
  }

  if (normalized.includes("toilet")) {
    return "toilet-repair";
  }

  if (normalized.includes("sump pump")) {
    return "sump-pump";
  }

  if (
    normalized.includes("excavation") ||
    normalized.includes("trenchless") ||
    normalized.includes("sewer line") ||
    normalized.includes("line replacement") ||
    normalized.includes("repipe")
  ) {
    return "long-cycle-specialty";
  }

  return "general-plumbing";
}

function getBlueprintForFamily(familyKey: string): ServiceBlueprint {
  return (
    BASELINE_SERVICE_BLUEPRINTS.find(
      (blueprint) => blueprint.familyKey === familyKey
    ) ??
    BASELINE_SERVICE_BLUEPRINTS.find(
      (blueprint) => blueprint.familyKey === "general-plumbing"
    )!
  );
}

function buildServiceUniverse(
  profile: BusinessProfile,
  competitors: Competitor[]
): ServiceBlueprint[] {
  const familyKeys = new Set<string>();

  for (const baseline of BASELINE_SERVICE_BLUEPRINTS) {
    if (baseline.familyKey !== "long-cycle-specialty") {
      familyKeys.add(baseline.familyKey);
    }
  }

  for (const service of profile.preferredServices ?? []) {
    familyKeys.add(getServiceFamilyKey(service));
  }

  if (profile.highestMarginService) {
    familyKeys.add(getServiceFamilyKey(profile.highestMarginService));
  }

  for (const focus of competitors.flatMap((competitor) => competitor.serviceFocus ?? [])) {
    familyKeys.add(getServiceFamilyKey(focus));
  }

  return Array.from(familyKeys).map(getBlueprintForFamily);
}

function inferVisibilityGap(profile: BusinessProfile): number {
  let score = 30;

  if (!profile.hasFaqContent) score += 24;
  if (!profile.hasServicePages) score += 16;
  if (profile.servicePageUrls.length < 3) score += 12;
  if (!profile.hasGoogleBusinessPage) score += 8;
  if ((profile.aeoReadinessScore ?? 0) < 70) score += 16;

  return clamp(score, 20, 95);
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

  if (typeof targetBookedJobs === "number" && Number.isFinite(targetBookedJobs)) {
    availableJobsEstimate = Math.max(weeklyCapacity - targetBookedJobs, 0);
  } else {
    availableJobsEstimate = Math.max(Math.round(weeklyCapacity * 0.18), 2);
  }

  availableJobsEstimate = clamp(availableJobsEstimate, 1, 10);

  let capacityScore = 42;
  let capacityFit: CapacityFit = "LOW";

  if (availableJobsEstimate >= 6) {
    capacityScore = 80;
    capacityFit = "HIGH";
  } else if (availableJobsEstimate >= 3) {
    capacityScore = 64;
    capacityFit = "MEDIUM";
  } else {
    capacityScore = 44;
    capacityFit = "LOW";
  }

  return {
    availableJobsEstimate,
    capacityScore,
    capacityFit,
  };
}

function inferConfidence(profile: BusinessProfile, competitors: Competitor[]) {
  let score = 42;

  if (profile.averageJobValue) score += 8;
  if (profile.technicians) score += 6;
  if (profile.jobsPerTechnicianPerDay) score += 6;
  if (profile.weeklyCapacity) score += 6;
  if (profile.targetBookedJobsPerWeek) score += 5;
  if (profile.preferredServices.length >= 3) score += 6;
  if (profile.servicePageUrls.length >= 3) score += 5;
  if (competitors.length >= 3) score += 8;
  if (profile.website) score += 4;
  if (profile.city) score += 3;
  if (profile.state) score += 3;
  if (profile.hasGoogleBusinessPage) score += 3;
  if (profile.hasServicePages) score += 3;

  return clamp(score, 38, 92);
}

function confidenceLabelFromScore(score: number): OpportunityConfidenceLabel {
  return score >= 78 ? "High" : score >= 58 ? "Medium" : "Low";
}

function inferCompetitorGap(
  blueprint: ServiceBlueprint,
  competitors: Competitor[]
): { score: number; narrative: string } {
  const normalized = normalizeServiceName(blueprint.serviceName);
  const tokens = normalized.split(" ");

  let overlapCount = 0;
  let activeCount = 0;
  let promoCount = 0;
  let inactiveCount = 0;

  for (const competitor of competitors) {
    const overlap = competitor.serviceFocus.some((focus) => {
      const normalizedFocus = normalizeServiceName(focus);
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

  let narrative = "Competition appears balanced for this service.";
  if (score >= 70) {
    narrative = "Competitor activity appears softer than normal for this service.";
  } else if (score <= 40) {
    narrative = "Competitors look active here, so sharper positioning matters more.";
  }

  return { score, narrative };
}

function getExplicitPreferenceBoost(
  blueprint: ServiceBlueprint,
  profile: BusinessProfile
): number {
  const preferred = (profile.preferredServices ?? []).map(normalizeServiceName);
  const deprioritized = (profile.deprioritizedServices ?? []).map(normalizeServiceName);
  const normalized = normalizeServiceName(blueprint.serviceName);

  if (preferred.includes(normalized)) return 20;
  if (deprioritized.includes(normalized)) return -18;

  if (
    profile.highestMarginService &&
    normalizeServiceName(profile.highestMarginService) === normalized
  ) {
    return 8;
  }

  return 0;
}

function buildServiceSignalProfiles(params: {
  profile: BusinessProfile;
  competitors: Competitor[];
  capacityScore: number;
  visibilityGapScore: number;
}): ServiceSignalProfile[] {
  const { profile, competitors, capacityScore, visibilityGapScore } = params;

  return buildServiceUniverse(profile, competitors).map((blueprint) => {
    const competitorGap = inferCompetitorGap(blueprint, competitors);
    const explicitPreferenceBoost = getExplicitPreferenceBoost(blueprint, profile);

    const serviceDemandScore = clamp(
      52 + blueprint.demandBias + explicitPreferenceBoost,
      28,
      96
    );

    const serviceValueScore = clamp(
      44 + blueprint.valueBias + (profile.averageJobValue ? 6 : 0),
      28,
      88
    );

    return {
      blueprint,
      serviceName: blueprint.serviceName,
      serviceDemandScore,
      competitorGapScore: competitorGap.score,
      capacityScore,
      serviceValueScore,
      visibilityGapScore,
      servicePriorityScore: clamp(52 + explicitPreferenceBoost, 24, 94),
      competitorNarrative: competitorGap.narrative,
      explicitPreferenceBoost,
    };
  });
}

function inferOpportunityType(params: {
  blueprint: ServiceBlueprint;
  enrichment: {
    actionFraming: ActionFraming;
    urgencyRelevance: InferredSignalLevel;
    seasonalityRelevance: InferredSignalLevel;
  };
  capacityFit: CapacityFit;
}): OpportunityType {
  const { blueprint, enrichment, capacityFit } = params;

  if (blueprint.familyKey === "ai-search-visibility") {
    return "AI_SEARCH_VISIBILITY";
  }

  if (blueprint.familyKey === "maintenance" || enrichment.actionFraming === "SCHEDULE_FILL") {
    return "CAPACITY_GAP";
  }

  if (
    blueprint.familyKey === "emergency-plumbing" ||
    enrichment.urgencyRelevance === "HIGH"
  ) {
    return "COMPETITOR_INACTIVE";
  }

  if (blueprint.familyKey === "water-heater") {
    return "HIGH_VALUE_SERVICE";
  }

  if (
    blueprint.familyKey === "drain-cleaning" ||
    enrichment.seasonalityRelevance === "HIGH"
  ) {
    return "SEASONAL_DEMAND";
  }

  return blueprint.defaultOpportunityType;
}

function buildActionFromSignals(params: {
  blueprint: ServiceBlueprint;
  enrichment: SignalEnrichment;
  opportunityType: OpportunityType;
}): {
  campaignType: CampaignType;
  bestMove: string;
  actionFraming: ActionFraming;
} {
  const { blueprint, enrichment, opportunityType } = params;
  const prettyName = prettyServiceName(blueprint.serviceName);

  if (blueprint.familyKey === "ai-search-visibility") {
    return {
      campaignType: "AEO_FAQ",
      bestMove: "Publish AI Answer Visibility FAQs",
      actionFraming: "AEO_CONTENT",
    };
  }

  if (blueprint.familyKey === "maintenance") {
    return {
      campaignType: "MAINTENANCE_PUSH",
      bestMove: "Fill Schedule with Maintenance Checkups",
      actionFraming: "SCHEDULE_FILL",
    };
  }

  if (blueprint.familyKey === "drain-cleaning") {
    return {
      campaignType: "DRAIN_SPECIAL",
      bestMove: "Launch Drain Cleaning Special",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (blueprint.familyKey === "water-heater") {
    return {
      campaignType: "WATER_HEATER",
      bestMove: "Promote Water Heater Replacement",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (blueprint.familyKey === "emergency-plumbing") {
    return {
      campaignType: "EMERGENCY_SERVICE",
      bestMove: "Activate Emergency Plumbing Response",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (blueprint.familyKey === "leak-repair") {
    return {
      campaignType: "CUSTOM",
      bestMove: "Promote Leak Repair Service",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (blueprint.familyKey === "general-plumbing") {
    return {
      campaignType: "CUSTOM",
      bestMove: "Promote General Plumbing Services",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (blueprint.familyKey === "toilet-repair") {
    return {
      campaignType: "CUSTOM",
      bestMove: "Promote Toilet Repair Service",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (blueprint.familyKey === "sump-pump") {
    return {
      campaignType: "CUSTOM",
      bestMove: "Promote Sump Pump Repair Service",
      actionFraming: "PAID_CAMPAIGN",
    };
  }

  if (opportunityType === "AI_SEARCH_VISIBILITY") {
    return {
      campaignType: "AEO_FAQ",
      bestMove: `Strengthen ${prettyName} AI Search Visibility`,
      actionFraming: "AEO_CONTENT",
    };
  }

  return {
    campaignType: blueprint.defaultCampaignType,
    bestMove: blueprint.defaultBestMove,
    actionFraming: enrichment.actionFraming,
  };
}

function inferBacklogEligibility(params: {
  blueprint: ServiceBlueprint;
  homeownerIntentStrength: InferredSignalLevel;
  urgencyRelevance: InferredSignalLevel;
  performanceSignal: CampaignPerformanceSignal | null;
}): boolean {
  const { blueprint, homeownerIntentStrength, urgencyRelevance, performanceSignal } = params;

  if (!blueprint.nicheLongCycle) {
    return true;
  }

  return (
    homeownerIntentStrength === "HIGH" &&
    (urgencyRelevance === "HIGH" ||
      performanceSignal?.performanceLabel === "Strong")
  );
}

function buildSignalDrivenCandidates(params: {
  profile: BusinessProfile;
  serviceProfiles: ServiceSignalProfile[];
  availableJobsEstimate: number;
  capacityFit: CapacityFit;
  visibilityGapScore: number;
  performanceSignals?: CampaignPerformanceSignalMap;
  enrichmentMap: Map<string, SignalEnrichment>;
}): OpportunityCandidate[] {
  const {
    profile,
    serviceProfiles,
    availableJobsEstimate,
    capacityFit,
    visibilityGapScore,
    performanceSignals,
    enrichmentMap,
  } = params;

  const candidates: OpportunityCandidate[] = [];

  for (const serviceProfile of serviceProfiles) {
    const enrichment =
      enrichmentMap.get(normalizeServiceName(serviceProfile.serviceName)) ??
      enrichmentMap.get(serviceProfile.blueprint.familyKey) ??
      null;

    if (!enrichment) {
      continue;
    }

    const opportunityType = inferOpportunityType({
      blueprint: serviceProfile.blueprint,
      enrichment,
      capacityFit,
    });

    const action = buildActionFromSignals({
      blueprint: serviceProfile.blueprint,
      enrichment,
      opportunityType,
    });

    const performanceSignal = getPerformanceSignal(
      performanceSignals,
      action.campaignType
    );

    const backlogEligible = inferBacklogEligibility({
      blueprint: serviceProfile.blueprint,
      homeownerIntentStrength: enrichment.homeownerIntentStrength,
      urgencyRelevance: enrichment.urgencyRelevance,
      performanceSignal,
    });

    const nichePenalty = serviceProfile.blueprint.nicheLongCycle ? 24 : 0;
    const everydayBonus = serviceProfile.blueprint.everydayBias;
    const capacityBias =
      serviceProfile.blueprint.familyKey === "maintenance"
        ? serviceProfile.blueprint.capacityBias
        : capacityFit === "HIGH"
          ? Math.round(serviceProfile.blueprint.capacityBias * 0.75)
          : Math.round(serviceProfile.blueprint.capacityBias * 0.35);

    const aeoAdjustment =
      serviceProfile.blueprint.familyKey === "ai-search-visibility"
        ? Math.round(visibilityGapScore * 0.16) + serviceProfile.blueprint.aeoBias
        : 0;

    const score =
      0.28 * serviceProfile.serviceDemandScore +
      0.18 * serviceProfile.competitorGapScore +
      0.18 * serviceProfile.capacityScore +
      0.08 * serviceProfile.serviceValueScore +
      levelToScore(enrichment.seasonalityRelevance) +
      levelToScore(enrichment.urgencyRelevance) +
      levelToScore(enrichment.homeownerIntentStrength) +
      (performanceSignal?.scoreBoost ?? 0) +
      everydayBonus +
      capacityBias +
      aeoAdjustment -
      nichePenalty;

    const prettyName = prettyServiceName(serviceProfile.serviceName);

    const whyNowBullets: string[] = [
      `${prettyName} is commercially relevant based on your current service mix and market context`,
      serviceProfile.competitorNarrative,
      enrichment.urgencyReason,
    ];

    if (serviceProfile.blueprint.familyKey === "maintenance") {
      whyNowBullets.push(
        `Current capacity suggests room for roughly ${availableJobsEstimate} additional jobs this week`
      );
    } else if (serviceProfile.blueprint.familyKey === "ai-search-visibility") {
      whyNowBullets.push(
        !profile.hasFaqContent
          ? "Your website still lacks structured FAQ content"
          : "Your answer-ready content footprint still looks thin"
      );
    } else {
      whyNowBullets.push(
        availableJobsEstimate >= 3
          ? `Current capacity suggests room for roughly ${availableJobsEstimate} additional jobs this week`
          : "Capacity is tighter, so higher-conversion work matters more"
      );
    }

    candidates.push({
      canonicalKey: `${serviceProfile.blueprint.familyKey}::primary`,
      familyKey: serviceProfile.blueprint.familyKey,
      title: serviceProfile.blueprint.title,
      serviceName: serviceProfile.serviceName,
      opportunityType,
      bestMove: action.bestMove,
      recommendedCampaignType: action.campaignType,
      rawOpportunityScore: score,
      sourceTags: uniqueTags([
        "Demand",
        "Competitor",
        "Capacity",
        ...(serviceProfile.blueprint.familyKey === "ai-search-visibility" ||
        action.actionFraming === "AEO_CONTENT"
          ? (["AEO"] as OpportunitySourceTag[])
          : []),
        ...(serviceProfile.blueprint.familyKey === "water-heater"
          ? (["Service Value"] as OpportunitySourceTag[])
          : []),
      ]),
      whyNowBullets,
      whyThisMatters:
        serviceProfile.blueprint.familyKey === "ai-search-visibility"
          ? "MarketForge sees an answer-engine visibility gap. Improving FAQ and service-page coverage can strengthen organic discovery and future demand capture."
          : `${prettyName} stands out because current business signals, homeowner intent, and execution fit make it a credible near-term revenue move for ${profile.businessName}.`,
      seasonalityRelevance: enrichment.seasonalityRelevance,
      seasonalityReason: enrichment.seasonalityReason,
      urgencyRelevance: enrichment.urgencyRelevance,
      urgencyReason: enrichment.urgencyReason,
      homeownerIntentStrength: enrichment.homeownerIntentStrength,
      homeownerIntentReason: enrichment.homeownerIntentReason,
      actionFraming: action.actionFraming,
      actionFramingReason: enrichment.actionFramingReason,
      eligibleForBacklog: backlogEligible && serviceProfile.blueprint.backlogEligibleByDefault,
    });
  }

  return candidates;
}

function collapseDuplicateCandidates(
  candidates: OpportunityCandidate[]
): OpportunityCandidate[] {
  const strongestByFamily = new Map<string, OpportunityCandidate>();

  for (const candidate of candidates) {
    const existing = strongestByFamily.get(candidate.familyKey);
    if (!existing || candidate.rawOpportunityScore > existing.rawOpportunityScore) {
      strongestByFamily.set(candidate.familyKey, candidate);
    }
  }

  return Array.from(strongestByFamily.values());
}

function ensureMinimumCrediblePortfolio(
  candidates: OpportunityCandidate[]
): OpportunityCandidate[] {
  const familyKeys = new Set(candidates.map((candidate) => candidate.familyKey));
  const output = [...candidates];

  const guaranteedFamilies = [
    "drain-cleaning",
    "leak-repair",
    "emergency-plumbing",
    "water-heater",
    "maintenance",
    "ai-search-visibility",
  ];

  for (const familyKey of guaranteedFamilies) {
    if (familyKeys.has(familyKey)) {
      continue;
    }

    const blueprint = getBlueprintForFamily(familyKey);

    output.push({
      canonicalKey: `${familyKey}::guaranteed`,
      familyKey,
      title: blueprint.title,
      serviceName: blueprint.serviceName,
      opportunityType: blueprint.defaultOpportunityType,
      bestMove: blueprint.defaultBestMove,
      recommendedCampaignType: blueprint.defaultCampaignType,
      rawOpportunityScore:
        familyKey === "maintenance"
          ? 70
          : familyKey === "ai-search-visibility"
            ? 66
            : 72,
      sourceTags: uniqueTags([
        "Demand",
        ...(familyKey === "maintenance" ? (["Capacity"] as OpportunitySourceTag[]) : []),
        ...(familyKey === "ai-search-visibility" ? (["AEO"] as OpportunitySourceTag[]) : []),
        ...(familyKey === "water-heater"
          ? (["Service Value"] as OpportunitySourceTag[])
          : []),
        "Competitor",
      ]),
      whyNowBullets:
        familyKey === "maintenance"
          ? [
              "Open schedule capacity can be turned into booked work quickly",
              "This is a practical fill-the-calendar action",
              "A schedule-fill move is often one of the fastest ways to create near-term revenue",
            ]
          : familyKey === "ai-search-visibility"
            ? [
                "Your site still shows answer-readiness gaps",
                "Improving FAQ and service-page coverage can support future discovery",
                "AEO work compounds over time and strengthens organic lead capture",
              ]
            : [
                `${prettyServiceName(blueprint.serviceName)} remains a practical revenue lane for a local service business`,
                "This is a believable near-term action, not a speculative specialty play",
                "MarketForge includes it so your opportunity set stays commercially complete",
              ],
      whyThisMatters:
        familyKey === "ai-search-visibility"
          ? "Improving AI search visibility can strengthen organic discovery and future demand capture."
          : `${prettyServiceName(blueprint.serviceName)} is included as a credible baseline opportunity so the workspace always reflects realistic next-best actions.`,
      seasonalityRelevance: familyKey === "drain-cleaning" ? "MEDIUM" : "LOW",
      seasonalityReason:
        familyKey === "drain-cleaning"
          ? "Drain-related demand can strengthen during certain periods but remains commercially relevant year-round."
          : "This opportunity does not depend on a strong seasonal spike to be commercially valid.",
      urgencyRelevance:
        familyKey === "emergency-plumbing" ? "HIGH" : familyKey === "maintenance" ? "MEDIUM" : "MEDIUM",
      urgencyReason:
        familyKey === "emergency-plumbing"
          ? "Emergency needs create fast-response demand when customers need help immediately."
          : "This is a practical near-term action even if it is not always same-day urgent.",
      homeownerIntentStrength:
        familyKey === "ai-search-visibility" ? "MEDIUM" : "HIGH",
      homeownerIntentReason:
        familyKey === "ai-search-visibility"
          ? "This supports future discovery more than same-day bookings."
          : "This service maps well to near-term homeowner booking behavior.",
      actionFraming:
        familyKey === "ai-search-visibility"
          ? "AEO_CONTENT"
          : familyKey === "maintenance"
            ? "SCHEDULE_FILL"
            : "PAID_CAMPAIGN",
      actionFramingReason:
        familyKey === "ai-search-visibility"
          ? "This is best handled through FAQ and service-page improvements."
          : familyKey === "maintenance"
            ? "This is best framed as a schedule-fill action."
            : "This is a credible direct-response local action.",
      eligibleForBacklog: true,
    });

    familyKeys.add(familyKey);
  }

  return output;
}

function buildDiversifiedPortfolio(
  candidates: OpportunityCandidate[],
  maxCount = 6
): OpportunityCandidate[] {
  const sorted = [...candidates].sort(
    (a, b) => b.rawOpportunityScore - a.rawOpportunityScore
  );

  const selected: OpportunityCandidate[] = [];
  const usedFamilies = new Set<string>();

  for (const candidate of sorted) {
    if (usedFamilies.has(candidate.familyKey)) {
      continue;
    }

    selected.push(candidate);
    usedFamilies.add(candidate.familyKey);

    if (selected.length >= maxCount) {
      break;
    }
  }

  return selected;
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
  const normalized = normalizeServiceName(serviceName);
  const tokens = normalized.split(" ");

  const overlappingCompetitors = competitors.filter((competitor) =>
    competitor.serviceFocus.some((focus) => {
      const normalizedFocus = normalizeServiceName(focus);
      return tokens.some(
        (token) => token.length > 2 && normalizedFocus.includes(token)
      );
    })
  );

  const pool =
    overlappingCompetitors.length > 0 ? overlappingCompetitors : competitors;

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
        !inactive.some(
          (inactiveCompetitor) => inactiveCompetitor.id === competitor.id
        )
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
function buildRankedOpportunity(params: {
  candidate: OpportunityCandidate;
  avgJobValue: number;
  availableJobsEstimate: number;
  baseConfidenceScore: number;
  capacityFit: CapacityFit;
  performanceSignal: CampaignPerformanceSignal | null;
}): RankedOpportunity {
  const {
    candidate,
    avgJobValue,
    availableJobsEstimate,
    baseConfidenceScore,
    capacityFit,
    performanceSignal,
  } = params;

  const adjustedConfidenceScore = clamp(
    baseConfidenceScore + (performanceSignal?.confidenceBoost ?? 0),
    38,
    92
  );

  const adjustedConfidenceLabel = confidenceLabelFromScore(adjustedConfidenceScore);

  const confidenceAdjustment =
    adjustedConfidenceLabel === "High"
      ? 1
      : adjustedConfidenceLabel === "Medium"
        ? 0.9
        : 0.78;

  const baseRangeCap =
    candidate.rawOpportunityScore >= 80
      ? 5
      : candidate.rawOpportunityScore >= 68
        ? 4
        : 3;

  const jobsHigh = clamp(
    Math.min(Math.max(availableJobsEstimate, 1), baseRangeCap),
    1,
    6
  );

  const jobsLow = clamp(Math.max(1, jobsHigh - 1), 1, jobsHigh);

  const revenueLow = Math.round(jobsLow * avgJobValue * confidenceAdjustment);
  const revenueHigh = Math.round(jobsHigh * avgJobValue * confidenceAdjustment);

  return {
    opportunityKey: buildOpportunityKey({
      serviceName: candidate.serviceName,
      opportunityType: candidate.opportunityType,
      bestMove: candidate.bestMove,
    }),
    title: candidate.title,
    serviceName: prettyServiceName(candidate.serviceName),
    opportunityType: candidate.opportunityType,
    bestMove: candidate.bestMove,
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
    jobsLow: opportunity.jobsLow,
    jobsHigh: opportunity.jobsHigh,
    revenueLow: opportunity.revenueLow,
    revenueHigh: opportunity.revenueHigh,
    headlineJobsText: `${opportunity.jobsLow}–${opportunity.jobsHigh} jobs`,
    headlineRevenueText: `$${opportunity.revenueLow.toLocaleString()}–$${opportunity.revenueHigh.toLocaleString()}`,
    bestMove: opportunity.bestMove,
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

  const { availableJobsEstimate, capacityScore, capacityFit } =
    inferCapacity(profile);

  const baseConfidenceScore = inferConfidence(profile, competitors);
  const visibilityGapScore = inferVisibilityGap(profile);

  const serviceProfiles = buildServiceSignalProfiles({
    profile,
    competitors,
    capacityScore,
    visibilityGapScore,
  });

  const enrichmentRequestNames = uniqueStrings([
    ...serviceProfiles.map((profile) => profile.serviceName),
    ...serviceProfiles.map((profile) => profile.blueprint.familyKey),
    "AI search visibility",
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

  const generatedCandidates = buildSignalDrivenCandidates({
    profile,
    serviceProfiles,
    availableJobsEstimate,
    capacityFit,
    visibilityGapScore,
    performanceSignals,
    enrichmentMap,
  });

  const credibleCandidates = ensureMinimumCrediblePortfolio(generatedCandidates);
  const collapsedCandidates = collapseDuplicateCandidates(credibleCandidates);
  const portfolio = buildDiversifiedPortfolio(collapsedCandidates, 6);

  const avgJobValue = Number(profile.averageJobValue ?? 450);

  const rankedOpportunities = portfolio
    .sort((a, b) => b.rawOpportunityScore - a.rawOpportunityScore)
    .map((candidate) =>
      buildRankedOpportunity({
        candidate,
        avgJobValue,
        availableJobsEstimate,
        baseConfidenceScore,
        capacityFit,
        performanceSignal: getPerformanceSignal(
          performanceSignals,
          candidate.recommendedCampaignType
        ),
      })
    );

  const top = rankedOpportunities[0];

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