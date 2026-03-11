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

export type OpportunitySourceTag =
  | "Demand"
  | "Competitor"
  | "Capacity"
  | "Service Value"
  | "AEO";

export type OpportunityConfidenceLabel = "Low" | "Medium" | "High";

export type RankedOpportunity = {
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
};

export type RevenueOpportunityEngineResult = {
  hero: RevenueOpportunityHero;
  rankedOpportunities: RankedOpportunity[];
};

type ServiceCandidate = {
  serviceName: string;
  serviceDemandScore: number;
  competitorGapScore: number;
  capacityScore: number;
  serviceValueScore: number;
  visibilityGapScore: number;
  rawOpportunityScore: number;
  opportunityType: OpportunityType;
  recommendedCampaignType: CampaignType;
  bestMove: string;
  sourceTags: OpportunitySourceTag[];
  whyNowBullets: string[];
  whyThisMatters: string;
};

function normalizeServiceName(service: string): string {
  return service.trim().toLowerCase();
}

function prettyServiceName(service: string): string {
  return service
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueTags(tags: OpportunitySourceTag[]): OpportunitySourceTag[] {
  return [...new Set(tags)];
}

function inferDemandBoost(serviceName: string): number {
  const service = normalizeServiceName(serviceName);

  if (
    service.includes("drain") ||
    service.includes("emergency") ||
    service.includes("water heater") ||
    service.includes("sump pump")
  ) {
    return 18;
  }

  if (service.includes("leak") || service.includes("pipe")) {
    return 12;
  }

  return 8;
}

function inferServicePriorityWeight(
  serviceName: string,
  preferredServices: string[],
  deprioritizedServices: string[]
): number {
  const normalized = normalizeServiceName(serviceName);

  const preferred = preferredServices.some(
    (item) => normalizeServiceName(item) === normalized
  );

  const deprioritized = deprioritizedServices.some(
    (item) => normalizeServiceName(item) === normalized
  );

  if (preferred) return 78;
  if (deprioritized) return 38;
  return 58;
}

function inferCompetitorGap(
  serviceName: string,
  competitors: Competitor[]
): { score: number; narrative: string } {
  const normalized = normalizeServiceName(serviceName);

  let activeCount = 0;
  let promoCount = 0;
  let serviceOverlapCount = 0;

  for (const competitor of competitors) {
    const overlap = competitor.serviceFocus.some((focus) =>
      normalizeServiceName(focus).includes(normalized.split(" ")[0])
    );

    if (overlap) {
      serviceOverlapCount += 1;
    }

    if (competitor.isPostingActively || competitor.isRunningAds) {
      activeCount += 1;
    }

    if (competitor.hasActivePromo) {
      promoCount += 1;
    }
  }

  let score = 55;

  if (serviceOverlapCount === 0) score += 10;
  if (activeCount <= 2) score += 12;
  if (promoCount <= 1) score += 8;
  if (activeCount >= 4) score -= 10;
  if (promoCount >= 3) score -= 8;

  score = clamp(score, 25, 92);

  let narrative = "Competition appears balanced for this service.";
  if (score >= 70) {
    narrative = "Competitor activity is softer than normal for this service.";
  } else if (score <= 45) {
    narrative =
      "Competitors appear active here, so differentiation matters more.";
  }

  return { score, narrative };
}

function inferVisibilityGap(profile: BusinessProfile): number {
  let score = 35;

  if (!profile.hasFaqContent) score += 20;
  if (profile.servicePageUrls.length < 4) score += 12;
  if ((profile.aeoReadinessScore ?? 0) < 70) score += 15;

  return clamp(score, 20, 90);
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

  const targetBookedJobs = profile.targetBookedJobsPerWeek ?? 0;
  const availableJobsEstimate = Math.max(weeklyCapacity - targetBookedJobs, 0);

  let capacityScore = 30;
  let capacityFit: CapacityFit = "LOW";

  if (availableJobsEstimate >= 8) {
    capacityScore = 88;
    capacityFit = "HIGH";
  } else if (availableJobsEstimate >= 4) {
    capacityScore = 68;
    capacityFit = "MEDIUM";
  } else {
    capacityScore = 40;
    capacityFit = "LOW";
  }

  return {
    availableJobsEstimate,
    capacityScore,
    capacityFit,
  };
}

function inferConfidence(profile: BusinessProfile, competitors: Competitor[]) {
  let score = 45;

  if (profile.averageJobValue) score += 10;
  if (profile.technicians) score += 8;
  if (profile.jobsPerTechnicianPerDay) score += 8;
  if (profile.weeklyCapacity) score += 8;
  if (profile.targetBookedJobsPerWeek) score += 8;
  if (profile.preferredServices.length >= 3) score += 6;
  if (profile.servicePageUrls.length >= 3) score += 4;
  if (competitors.length >= 3) score += 8;
  if (competitors.some((c) => c.isRunningAds !== null)) score += 5;
  if (profile.website) score += 4;
  if (profile.hasFaqContent) score += 2;

  score = clamp(score, 35, 95);

  return score;
}

function confidenceLabelFromScore(score: number): OpportunityConfidenceLabel {
  return score >= 80 ? "High" : score >= 60 ? "Medium" : "Low";
}

function recommendedCampaignForService(serviceName: string): {
  campaignType: CampaignType;
  bestMove: string;
  opportunityType: OpportunityType;
} {
  const service = normalizeServiceName(serviceName);

  if (service.includes("drain")) {
    return {
      campaignType: "DRAIN_SPECIAL",
      bestMove: "Drain Cleaning Special",
      opportunityType: "SEASONAL_DEMAND",
    };
  }

  if (service.includes("water heater")) {
    return {
      campaignType: "WATER_HEATER",
      bestMove: "Water Heater Upgrade Push",
      opportunityType: "HIGH_VALUE_SERVICE",
    };
  }

  if (service.includes("maintenance")) {
    return {
      campaignType: "MAINTENANCE_PUSH",
      bestMove: "Plumbing Maintenance Checkup",
      opportunityType: "CAPACITY_GAP",
    };
  }

  if (service.includes("emergency")) {
    return {
      campaignType: "EMERGENCY_SERVICE",
      bestMove: "Emergency Plumbing Response Campaign",
      opportunityType: "COMPETITOR_INACTIVE",
    };
  }

  return {
    campaignType: "CUSTOM",
    bestMove: `${prettyServiceName(serviceName)} Promotion`,
    opportunityType: "LOCAL_SEARCH_SPIKE",
  };
}

function getPerformanceSignal(
  performanceSignals: CampaignPerformanceSignalMap | undefined,
  campaignType: CampaignType
): CampaignPerformanceSignal | null {
  return performanceSignals?.[campaignType] ?? null;
}

function buildRankedOpportunity(params: {
  candidate: ServiceCandidate;
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
    35,
    95
  );
  const adjustedConfidenceLabel = confidenceLabelFromScore(adjustedConfidenceScore);

  const confidenceAdjustment =
    adjustedConfidenceLabel === "High"
      ? 1
      : adjustedConfidenceLabel === "Medium"
        ? 0.88
        : 0.76;

  const jobsHigh = clamp(
    Math.min(
      availableJobsEstimate > 0 ? availableJobsEstimate : 3,
      candidate.rawOpportunityScore >= 75
        ? 6
        : candidate.rawOpportunityScore >= 65
          ? 5
          : 4
    ),
    1,
    8
  );

  const jobsLow = clamp(Math.max(1, jobsHigh - 2), 1, jobsHigh);

  const revenueLow = Math.round(jobsLow * avgJobValue * confidenceAdjustment);
  const revenueHigh = Math.round(jobsHigh * avgJobValue * confidenceAdjustment);

  return {
    title: `${prettyServiceName(candidate.serviceName)} Opportunity`,
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
    whyNowBullets: candidate.whyNowBullets.slice(0, 3),
    whyThisMatters: candidate.whyThisMatters,
    performanceLabel: performanceSignal?.performanceLabel ?? "New",
    performanceDetail:
      performanceSignal?.performanceDetail ??
      "No campaign history yet for this action type.",
    historicalCampaignCount: performanceSignal?.launchedCampaigns ?? 0,
  };
}

function buildCompetitorSignal(
  serviceName: string,
  competitors: Competitor[]
): string[] {
  const serviceToken = normalizeServiceName(serviceName).split(" ")[0];

  const overlappingCompetitors = competitors.filter((competitor) =>
    competitor.serviceFocus.some((focus) =>
      normalizeServiceName(focus).includes(serviceToken)
    )
  );

  const pool =
    overlappingCompetitors.length > 0 ? overlappingCompetitors : competitors;

  const signals: string[] = [];

  const inactive = pool.filter(
    (c) => !c.isRunningAds && !c.isPostingActively && !c.hasActivePromo
  );

  const lowPromo = pool.filter((c) => !c.hasActivePromo);

  inactive.slice(0, 2).forEach((c) => {
    signals.push(`${c.name} appears inactive this week`);
  });

  lowPromo
    .filter((c) => !inactive.some((inactiveCompetitor) => inactiveCompetitor.id === c.id))
    .slice(0, 2)
    .forEach((c) => {
      signals.push(`${c.name} is not promoting this service`);
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

export function buildRevenueOpportunityEngine(params: {
  profile: BusinessProfile;
  competitors: Competitor[];
  performanceSignals?: CampaignPerformanceSignalMap;
}): RevenueOpportunityEngineResult {
  const { profile, competitors, performanceSignals } = params;

  const { availableJobsEstimate, capacityScore, capacityFit } =
    inferCapacity(profile);

  const baseConfidenceScore = inferConfidence(profile, competitors);
  const visibilityGapScore = inferVisibilityGap(profile);

  const candidateServices =
    profile.preferredServices.length > 0
      ? profile.preferredServices
      : ["General Plumbing"];

  const serviceCandidates: ServiceCandidate[] = candidateServices.map(
    (serviceName) => {
      const serviceDemandScore =
        inferServicePriorityWeight(
          serviceName,
          profile.preferredServices,
          profile.deprioritizedServices
        ) + inferDemandBoost(serviceName);

      const competitorGap = inferCompetitorGap(serviceName, competitors);

      const serviceValueScore = clamp(
        (profile.averageJobValue ? 55 : 40) +
          (normalizeServiceName(serviceName).includes("water heater") ? 18 : 0) +
          (normalizeServiceName(serviceName).includes("emergency") ? 10 : 0),
        35,
        90
      );

      const recommended = recommendedCampaignForService(serviceName);
      const performanceSignal = getPerformanceSignal(
        performanceSignals,
        recommended.campaignType
      );

      const rawOpportunityScore =
        0.3 * clamp(serviceDemandScore, 0, 100) +
        0.25 * competitorGap.score +
        0.2 * capacityScore +
        0.15 * serviceValueScore +
        0.1 * visibilityGapScore +
        (performanceSignal?.scoreBoost ?? 0);

      const sourceTags = uniqueTags([
        "Demand",
        "Competitor",
        "Capacity",
        ...(visibilityGapScore >= 55 ? (["AEO"] as OpportunitySourceTag[]) : []),
        ...(serviceValueScore >= 65
          ? (["Service Value"] as OpportunitySourceTag[])
          : []),
      ]);

      const learningBullet =
        performanceSignal && performanceSignal.performanceLabel !== "New"
          ? `Past ${recommended.bestMove.toLowerCase()} campaigns have performed ${performanceSignal.performanceLabel.toLowerCase()}ly.`
          : null;

      return {
        serviceName,
        serviceDemandScore: clamp(serviceDemandScore, 0, 100),
        competitorGapScore: competitorGap.score,
        capacityScore,
        serviceValueScore,
        visibilityGapScore,
        rawOpportunityScore,
        opportunityType: recommended.opportunityType,
        recommendedCampaignType: recommended.campaignType,
        bestMove: recommended.bestMove,
        sourceTags,
        whyNowBullets: [
          `${prettyServiceName(serviceName)} demand appears elevated locally`,
          competitorGap.narrative,
          availableJobsEstimate > 0
            ? `Your schedule likely has room for ${availableJobsEstimate} additional jobs`
            : "Capacity is tighter, so higher-value work matters more",
          ...(learningBullet ? [learningBullet] : []),
        ],
        whyThisMatters: `${prettyServiceName(
          serviceName
        )} signals look stronger right now in ${profile.serviceArea}. Based on current competitor behavior and your available capacity, this appears to be one of the best short-term opportunities to capture additional work.`,
      };
    }
  );

  const fallbackCandidate: ServiceCandidate = {
    serviceName: "General Plumbing",
    serviceDemandScore: 50,
    competitorGapScore: 50,
    capacityScore,
    serviceValueScore: 50,
    visibilityGapScore,
    rawOpportunityScore: 50,
    opportunityType: "LOCAL_SEARCH_SPIKE",
    recommendedCampaignType: "CUSTOM",
    bestMove: "General Plumbing Promotion",
    sourceTags: ["Demand", "Capacity"],
    whyNowBullets: [
      "Local demand signals suggest near-term service opportunity",
      "Your business profile indicates room to capture more work",
      "A focused campaign can help convert that demand into booked jobs",
    ],
    whyThisMatters:
      "MarketForge sees signs that additional near-term service demand may be available. A focused campaign can help turn that into booked work.",
  };

  const avgJobValue = Number(profile.averageJobValue ?? 450);

  const rankedOpportunities = (serviceCandidates.length > 0
    ? serviceCandidates
    : [fallbackCandidate]
  )
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
  const competitorSignal = buildCompetitorSignal(top.serviceName, competitors);

  const hero: RevenueOpportunityHero = {
    title: "Jobs You Can Capture This Week",
    opportunityTitle: top.title,
    opportunityType: top.opportunityType,
    jobsLow: top.jobsLow,
    jobsHigh: top.jobsHigh,
    revenueLow: top.revenueLow,
    revenueHigh: top.revenueHigh,
    headlineJobsText: `${top.jobsLow}–${top.jobsHigh} jobs`,
    headlineRevenueText: `$${top.revenueLow.toLocaleString()}–$${top.revenueHigh.toLocaleString()}`,
    bestMove: top.bestMove,
    recommendedCampaignType: top.recommendedCampaignType,
    whyNowBullets: top.whyNowBullets,
    whyThisMatters: top.whyThisMatters,
    confidenceScore: top.confidenceScore,
    confidenceLabel: top.confidenceLabel,
    sourceTags: top.sourceTags,
    capacityFit: top.capacityFit,
    availableJobsEstimate,
    competitorSignal,
    performanceLabel: top.performanceLabel,
    performanceDetail: top.performanceDetail,
    historicalCampaignCount: top.historicalCampaignCount,
  };

  return {
    hero,
    rankedOpportunities,
  };
}