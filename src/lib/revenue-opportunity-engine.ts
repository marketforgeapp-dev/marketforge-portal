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

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function inferDemandBoost(serviceName: string): number {
  const service = normalizeServiceName(serviceName);

  if (service.includes("drain")) return 18;
  if (service.includes("emergency")) return 16;
  if (service.includes("water heater")) return 15;
  if (service.includes("leak")) return 12;
  if (service.includes("pipe")) return 10;
  if (service.includes("maintenance")) return 8;

  return 6;
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

  if (preferred) return 76;
  if (deprioritized) return 30;
  return 52;
}

function inferCompetitorGap(
  serviceName: string,
  competitors: Competitor[]
): { score: number; narrative: string } {
  const normalized = normalizeServiceName(serviceName);
  const tokens = normalized.split(" ");

  let overlapCount = 0;
  let activeCount = 0;
  let promoCount = 0;
  let inactiveCount = 0;

  for (const competitor of competitors) {
    const overlap = competitor.serviceFocus.some((focus) => {
      const normalizedFocus = normalizeServiceName(focus);
      return tokens.some((token) => token.length > 2 && normalizedFocus.includes(token));
    });

    if (overlap) {
      overlapCount += 1;
    }

    const active = Boolean(competitor.isPostingActively || competitor.isRunningAds);
    const promo = Boolean(competitor.hasActivePromo);

    if (active) activeCount += 1;
    if (promo) promoCount += 1;
    if (!active && !promo) inactiveCount += 1;
  }

  let score = 50;

  if (overlapCount <= 1) score += 14;
  if (overlapCount >= 4) score -= 10;
  if (inactiveCount >= 2) score += 10;
  if (activeCount <= 2) score += 8;
  if (activeCount >= 4) score -= 8;
  if (promoCount === 0) score += 8;
  if (promoCount >= 3) score -= 6;

  score = clamp(score, 24, 88);

  let narrative = "Competition appears balanced for this service.";
  if (score >= 70) {
    narrative = "Competitor activity appears softer than normal for this service.";
  } else if (score <= 40) {
    narrative = "Competitors look active here, so sharper positioning matters more.";
  }

  return { score, narrative };
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

function recommendedCampaignForService(params: {
  serviceName: string;
  visibilityGapScore: number;
  competitorGapScore: number;
  capacityFit: CapacityFit;
}): {
  campaignType: CampaignType;
  bestMove: string;
  opportunityType: OpportunityType;
} {
  const { serviceName, visibilityGapScore, competitorGapScore, capacityFit } = params;
  const service = normalizeServiceName(serviceName);

  if (visibilityGapScore >= 78 && !service.includes("maintenance")) {
    return {
      campaignType: "AEO_FAQ",
      bestMove: "AI Answer Visibility FAQs",
      opportunityType: "AI_SEARCH_VISIBILITY",
    };
  }

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

  if (service.includes("maintenance") || capacityFit === "HIGH") {
    return {
      campaignType: "MAINTENANCE_PUSH",
      bestMove: "Plumbing Maintenance Checkup",
      opportunityType: "CAPACITY_GAP",
    };
  }

  if (service.includes("emergency") || competitorGapScore >= 70) {
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
    38,
    92
  );

  const adjustedConfidenceLabel =
    confidenceLabelFromScore(adjustedConfidenceScore);

  const confidenceAdjustment =
    adjustedConfidenceLabel === "High"
      ? 1
      : adjustedConfidenceLabel === "Medium"
        ? 0.9
        : 0.78;

  const baseRangeCap =
    candidate.rawOpportunityScore >= 78
      ? 5
      : candidate.rawOpportunityScore >= 66
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
    whyNowBullets: candidate.whyNowBullets.slice(0, 4),
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
  const tokens = normalizeServiceName(serviceName).split(" ");

  const overlappingCompetitors = competitors.filter((competitor) =>
    competitor.serviceFocus.some((focus) => {
      const normalizedFocus = normalizeServiceName(focus);
      return tokens.some((token) => token.length > 2 && normalizedFocus.includes(token));
    })
  );

  const pool =
    overlappingCompetitors.length > 0 ? overlappingCompetitors : competitors;

  const signals: string[] = [];

  const inactive = pool.filter(
    (c) => !c.isRunningAds && !c.isPostingActively && !c.hasActivePromo
  );

  const lowPromo = pool.filter((c) => !c.hasActivePromo);

  inactive.slice(0, 2).forEach((c) => {
    signals.push(`${c.name} appears less active right now`);
  });

  lowPromo
    .filter(
      (c) =>
        !inactive.some(
          (inactiveCompetitor) => inactiveCompetitor.id === c.id
        )
    )
    .slice(0, 2)
    .forEach((c) => {
      signals.push(`${c.name} is not promoting this service heavily`);
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

function buildServicePool(profile: BusinessProfile, competitors: Competitor[]): string[] {
  const preferred = profile.preferredServices ?? [];
  const highestMargin = profile.highestMarginService
    ? [profile.highestMarginService]
    : [];

  const competitorFocus = competitors
    .flatMap((competitor) => competitor.serviceFocus ?? [])
    .filter(Boolean)
    .slice(0, 10);

  const fallback = [
    "General plumbing",
    "Drain cleaning",
    "Leak repair",
    "Water heater replacement",
    "Emergency plumbing",
  ];

  return uniqueStrings([
    ...preferred,
    ...highestMargin,
    ...competitorFocus,
    ...fallback,
  ]).slice(0, 5);
}

function buildAeoCandidate(profile: BusinessProfile, capacityScore: number): ServiceCandidate | null {
  const visibilityGapScore = inferVisibilityGap(profile);

  if (visibilityGapScore < 58) {
    return null;
  }

  const score =
    0.46 * visibilityGapScore +
    0.16 * capacityScore +
    0.18 * (profile.hasGoogleBusinessPage ? 52 : 74) +
    0.2 * (profile.hasServicePages ? 56 : 76);

  return {
    serviceName: "AI search visibility",
    serviceDemandScore: 62,
    competitorGapScore: 58,
    capacityScore,
    serviceValueScore: 48,
    visibilityGapScore,
    rawOpportunityScore: score,
    opportunityType: "AI_SEARCH_VISIBILITY",
    recommendedCampaignType: "AEO_FAQ",
    bestMove: "AI Answer Visibility FAQs",
    sourceTags: uniqueTags(["AEO", "Demand", "Capacity"]),
    whyNowBullets: [
      !profile.hasFaqContent
        ? "Your site does not appear to have structured FAQ content"
        : "Your answer-ready content footprint still looks thin",
      profile.servicePageUrls.length < 3
        ? "Core service coverage appears limited across your website"
        : "Service-page coverage can still be expanded for better answer readiness",
      "Improving answer-engine visibility can compound over time and support future lead generation",
      !profile.hasGoogleBusinessPage
        ? "Your local profile footprint looks incomplete for answer-engine trust"
        : "Strengthening local trust signals can improve answer-engine relevance",
    ],
    whyThisMatters:
      "Your web presence still shows answer-engine gaps. Tightening FAQ and service-page coverage can improve AI search visibility and strengthen organic lead capture over time.",
  };
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

  const candidateServices = buildServicePool(profile, competitors);

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
        (profile.averageJobValue ? 52 : 40) +
          (normalizeServiceName(serviceName).includes("water heater") ? 18 : 0) +
          (normalizeServiceName(serviceName).includes("emergency") ? 10 : 0) +
          (normalizeServiceName(serviceName).includes("drain") ? 6 : 0),
        34,
        88
      );

      const recommended = recommendedCampaignForService({
        serviceName,
        visibilityGapScore,
        competitorGapScore: competitorGap.score,
        capacityFit,
      });

      const performanceSignal = getPerformanceSignal(
        performanceSignals,
        recommended.campaignType
      );

      const rawOpportunityScore =
        0.28 * clamp(serviceDemandScore, 0, 100) +
        0.24 * competitorGap.score +
        0.2 * capacityScore +
        0.18 * serviceValueScore +
        0.1 * visibilityGapScore +
        (performanceSignal?.scoreBoost ?? 0);

      const sourceTags = uniqueTags([
        "Demand",
        "Competitor",
        "Capacity",
        ...(visibilityGapScore >= 58 ? (["AEO"] as OpportunitySourceTag[]) : []),
        ...(serviceValueScore >= 64
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
          `${prettyServiceName(serviceName)} looks commercially relevant in your current market`,
          competitorGap.narrative,
          availableJobsEstimate > 0
            ? `Your current inputs suggest room for roughly ${availableJobsEstimate} additional jobs per week`
            : "Capacity appears tighter, so higher-conversion work matters more",
          ...(visibilityGapScore >= 60
            ? ["Your website still shows search and answer-readiness gaps that can be improved"]
            : []),
          ...(learningBullet ? [learningBullet] : []),
        ],
        whyThisMatters: `${prettyServiceName(
          serviceName
        )} looks like a practical near-term opportunity for ${profile.businessName} based on your service mix, nearby competitor activity, current capacity assumptions, and web visibility gaps.`,
      };
    }
  );

  const aeoCandidate = buildAeoCandidate(profile, capacityScore);

  const candidatePool = serviceCandidates.length > 0 ? serviceCandidates : [
    {
      serviceName: "General plumbing",
      serviceDemandScore: 50,
      competitorGapScore: 50,
      capacityScore,
      serviceValueScore: 50,
      visibilityGapScore,
      rawOpportunityScore: 50,
      opportunityType: "LOCAL_SEARCH_SPIKE" as OpportunityType,
      recommendedCampaignType: "CUSTOM" as CampaignType,
      bestMove: "General Plumbing Promotion",
      sourceTags: ["Demand", "Capacity"] as OpportunitySourceTag[],
      whyNowBullets: [
        "Local demand signals suggest near-term service opportunity",
        "Your business profile indicates room to capture more work",
        "A focused campaign can help convert that demand into booked jobs",
      ],
      whyThisMatters:
        "MarketForge sees signs that additional near-term service demand may be available. A focused campaign can help turn that into booked work.",
    },
  ];

  const avgJobValue = Number(profile.averageJobValue ?? 450);

  const rankedCandidates = [...candidatePool].sort(
    (a, b) => b.rawOpportunityScore - a.rawOpportunityScore
  );

  const topCandidates = rankedCandidates.slice(0, 4);
  const finalCandidates =
    aeoCandidate &&
    !topCandidates.some(
      (candidate) => candidate.recommendedCampaignType === "AEO_FAQ"
    )
      ? [...topCandidates, aeoCandidate]
      : rankedCandidates.slice(0, 5);

  const rankedOpportunities = finalCandidates
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