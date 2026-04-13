import { CampaignStatus, CampaignType } from "@/generated/prisma";
import {
  RankedOpportunity,
  RevenueOpportunityHero,
  buildRevenueOpportunityHero,
} from "@/lib/revenue-opportunity-engine";
import type { Competitor } from "@/generated/prisma";

type CampaignExecutionRecord = {
  id: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  targetService?: string | null;
  briefJson?: unknown;
  updatedAt?: Date | string | null;
};

export type SelectedOpportunity = RankedOpportunity & {
  linkedCampaignId: string | null;
  linkedCampaignStatus: CampaignStatus | null;
  isInExecution: boolean;
  adjustedScore: number;
  suppressionReason: string | null;
};

const ACTIVE_EXECUTION_STATUSES: CampaignStatus[] = [
  "APPROVED",
  "SCHEDULED",
  "LAUNCHED",
];

const STALE_COMPLETED_REENTRY_DAYS = 45;

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function normalizeComparable(text: string): string {
  return normalize(text).replace(/[^a-z0-9]+/g, " ").trim();
}

function getCampaignUpdatedAtDate(
  campaign: CampaignExecutionRecord
): Date | null {
  if (!campaign.updatedAt) {
    return null;
  }

  const value =
    campaign.updatedAt instanceof Date
      ? campaign.updatedAt
      : new Date(campaign.updatedAt);

  return Number.isNaN(value.getTime()) ? null : value;
}

function isCompletedCampaignStale(
  campaign: CampaignExecutionRecord
): boolean {
  if (campaign.status !== "COMPLETED") {
    return false;
  }

  const updatedAt = getCampaignUpdatedAtDate(campaign);
  if (!updatedAt) {
    return false;
  }

  const ageMs = Date.now() - updatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  return ageDays >= STALE_COMPLETED_REENTRY_DAYS;
}

function getPortfolioFamilyKey(opportunity: {
  recommendedCampaignType: string;
  opportunityType: string;
  actionFraming: string;
  bestMove: string;
  title: string;
}): string {
  if (
    opportunity.recommendedCampaignType === "SEO_CONTENT" ||
    opportunity.recommendedCampaignType === "AEO_FAQ" ||
    opportunity.opportunityType === "AI_SEARCH_VISIBILITY" ||
    opportunity.actionFraming === "AEO_CONTENT" ||
    opportunity.actionFraming === "LOCAL_VISIBILITY"
  ) {
    return "search-visibility";
  }

  if (opportunity.recommendedCampaignType === "EMERGENCY_SERVICE") {
    return "fast-response";
  }

  if (opportunity.actionFraming === "SCHEDULE_FILL") {
    return "schedule-fill";
  }

  if (
    opportunity.opportunityType === "HIGH_VALUE_SERVICE" ||
    opportunity.actionFraming === "PROMOTION" ||
    opportunity.recommendedCampaignType === "WATER_HEATER"
  ) {
    return "high-value-service";
  }

  if (opportunity.actionFraming === "REPUTATION") {
    return "trust-conversion";
  }

  if (opportunity.opportunityType === "COMPETITOR_INACTIVE") {
    return "competitor-capture";
  }

  return "core-revenue";
}

function extractCampaignOrigin(
  briefJson: unknown
): "recommendation" | "nl_custom" | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const value = (briefJson as Record<string, unknown>).campaignOrigin;
  return value === "recommendation" || value === "nl_custom" ? value : null;
}

function extractConsumesRecommendationSlot(briefJson: unknown): boolean {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return false;
  }

  return (briefJson as Record<string, unknown>).consumesRecommendationSlot === true;
}

function extractMatchedOpportunityKey(briefJson: unknown): string | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const maybeKey = (briefJson as Record<string, unknown>).matchedOpportunityKey;
  return typeof maybeKey === "string" && maybeKey.length > 0 ? maybeKey : null;
}

function extractMatchedOpportunityTitle(briefJson: unknown): string | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const maybeTitle =
    (briefJson as Record<string, unknown>).matchedOpportunityTitle;

  return typeof maybeTitle === "string" && maybeTitle.length > 0
    ? maybeTitle
    : null;
}

function extractMatchedFamilyKey(briefJson: unknown): string | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const maybeFamilyKey =
    (briefJson as Record<string, unknown>).matchedFamilyKey;

  return typeof maybeFamilyKey === "string" && maybeFamilyKey.length > 0
    ? maybeFamilyKey
    : null;
}

function getPenaltyForStatus(params: {
  status: CampaignStatus | null;
  completedIsStale: boolean;
}): {
  penalty: number;
  isInExecution: boolean;
  suppressionReason: string | null;
} {
  const { status, completedIsStale } = params;

  if (!status) {
    return {
      penalty: 0,
      isInExecution: false,
      suppressionReason: null,
    };
  }

  if (ACTIVE_EXECUTION_STATUSES.includes(status)) {
    return {
      penalty: 40,
      isInExecution: true,
      suppressionReason:
        "This action is already active in execution, so MarketForge shifts recommendations to the next best available opportunity.",
    };
  }

  if (status === "DRAFT") {
    return {
      penalty: 8,
      isInExecution: false,
      suppressionReason:
        "This action already has draft materials prepared, so it is slightly downweighted to avoid repetitive recommendations.",
    };
  }

  if (status === "COMPLETED") {
    if (completedIsStale) {
      return {
        penalty: 0,
        isInExecution: false,
        suppressionReason: null,
      };
    }

    return {
      penalty: 10,
      isInExecution: false,
      suppressionReason:
        "This action has completed recently and is temporarily downweighted before re-entering the opportunity pool.",
    };
  }

  return {
    penalty: 0,
    isInExecution: false,
    suppressionReason: null,
  };
}

function findLinkedCampaign(
  opportunity: RankedOpportunity,
  campaigns: CampaignExecutionRecord[]
): CampaignExecutionRecord | null {
  const recommendationCampaigns = campaigns.filter((campaign) => {
    const origin = extractCampaignOrigin(campaign.briefJson);
    const consumesSlot = extractConsumesRecommendationSlot(campaign.briefJson);
    const matchedOpportunityKey = extractMatchedOpportunityKey(campaign.briefJson);
    const matchedFamilyKey = extractMatchedFamilyKey(campaign.briefJson);
    const matchedOpportunityTitle = extractMatchedOpportunityTitle(campaign.briefJson);

    return (
      origin === "recommendation" ||
      consumesSlot === true ||
      Boolean(matchedOpportunityKey) ||
      Boolean(matchedFamilyKey) ||
      Boolean(matchedOpportunityTitle)
    );
  });

  const exactKeyMatch =
    recommendationCampaigns.find(
      (campaign) =>
        extractMatchedOpportunityKey(campaign.briefJson) ===
        opportunity.opportunityKey
    ) ?? null;

  if (exactKeyMatch) {
    return exactKeyMatch;
  }

  const normalizedOpportunityService = normalizeComparable(opportunity.serviceName);
  const normalizedOpportunityTitle = normalizeComparable(opportunity.title);
  const opportunityFamilyKey = opportunity.familyKey;
  const opportunityCampaignType = opportunity.recommendedCampaignType;

  const legacyFamilyMatch =
    recommendationCampaigns.find((campaign) => {
      if (campaign.campaignType !== opportunityCampaignType) {
        return false;
      }

      const matchedFamilyKey = extractMatchedFamilyKey(campaign.briefJson);
      if (matchedFamilyKey && matchedFamilyKey === opportunityFamilyKey) {
        return true;
      }

      const matchedOpportunityTitle = extractMatchedOpportunityTitle(
        campaign.briefJson
      );
      if (
        matchedOpportunityTitle &&
        normalizeComparable(matchedOpportunityTitle) === normalizedOpportunityTitle
      ) {
        return true;
      }

      if (!campaign.targetService) {
        return false;
      }

      return (
        normalizeComparable(campaign.targetService) === normalizedOpportunityService
      );
    }) ?? null;

  return legacyFamilyMatch;
}

function sortSelectedOpportunities(
  opportunities: SelectedOpportunity[]
): SelectedOpportunity[] {
  const surfaceRank: Record<string, number> = {
    hero: 4,
    surface: 3,
    reserve: 2,
    suppress: 1,
  };

  return [...opportunities].sort((a, b) => {
    const bSurface = surfaceRank[b.finalSurface] ?? 0;
    const aSurface = surfaceRank[a.finalSurface] ?? 0;

    if (bSurface !== aSurface) {
      return bSurface - aSurface;
    }

    if (b.adjustedScore !== a.adjustedScore) {
      return b.adjustedScore - a.adjustedScore;
    }

    if (b.confidenceScore !== a.confidenceScore) {
      return b.confidenceScore - a.confidenceScore;
    }

    return b.revenueHigh - a.revenueHigh;
  });
}

function buildVisibleRecommendationSet(
  rankedSelection: SelectedOpportunity[]
): SelectedOpportunity[] {
  const visible = rankedSelection.filter(
    (opportunity) =>
      !opportunity.isInExecution &&
      !opportunity.isDeprioritized &&
      opportunity.finalSurface !== "suppress"
  );

  if (visible.length > 0) {
    return visible;
  }

  const nonExecution = rankedSelection.filter(
    (opportunity) =>
      !opportunity.isInExecution && opportunity.finalSurface !== "suppress"
  );

  if (nonExecution.length > 0) {
    return nonExecution;
  }

  return rankedSelection.filter((opportunity) => opportunity.finalSurface !== "suppress");
}

function isAeoOpportunity(opportunity: {
  recommendedCampaignType: string;
  opportunityType: string;
  actionFraming: string;
}): boolean {
  return (
    opportunity.recommendedCampaignType === "SEO_CONTENT" ||
    opportunity.recommendedCampaignType === "AEO_FAQ" ||
    opportunity.opportunityType === "AI_SEARCH_VISIBILITY" ||
    opportunity.actionFraming === "AEO_CONTENT" ||
    opportunity.actionFraming === "LOCAL_VISIBILITY"
  );
}

function selectHeroOpportunity(
  visibleRecommendations: SelectedOpportunity[]
): SelectedOpportunity {
  const ordered = sortSelectedOpportunities(
    visibleRecommendations.filter((opportunity) => !opportunity.isDeprioritized)
  );

  const explicitHero =
    ordered.find(
      (opportunity) =>
        opportunity.finalSurface === "hero" &&
        opportunity.heroEligibleFinal
    ) ?? null;

  if (explicitHero) {
    return explicitHero;
  }

  const bestSurface =
    ordered.find((opportunity) => opportunity.finalSurface === "surface") ?? null;

  if (bestSurface) {
    return bestSurface;
  }

  return ordered[0] ?? sortSelectedOpportunities(visibleRecommendations)[0];
}

function getTopCandidatesPerServiceFamily(
  opportunities: SelectedOpportunity[]
): SelectedOpportunity[] {
  const seen = new Set<string>();
  const output: SelectedOpportunity[] = [];

  for (const opportunity of opportunities) {
    if (seen.has(opportunity.familyKey)) {
      continue;
    }

    seen.add(opportunity.familyKey);
    output.push(opportunity);
  }

  return output;
}

function pushUnique(
  bucket: SelectedOpportunity[],
  candidate: SelectedOpportunity,
  usedOpportunityKeys: Set<string>
) {
  if (usedOpportunityKeys.has(candidate.opportunityKey)) {
    return;
  }

  usedOpportunityKeys.add(candidate.opportunityKey);
  bucket.push(candidate);
}

function canUseDemandShape(params: {
  candidate: SelectedOpportunity;
  demandShapeCounts: Map<string, number>;
}): boolean {
  const shape = params.candidate.demandShape;
  const currentCount = params.demandShapeCounts.get(shape) ?? 0;

  if (shape === "visibility") {
    return currentCount < 1;
  }

  if (shape === "high-value-narrow") {
    return currentCount < 2;
  }

  if (shape === "urgent-problem") {
    return currentCount < 2;
  }

  return true;
}

function buildBacklogOpportunities(
  visibleRecommendations: SelectedOpportunity[],
  hero: SelectedOpportunity
): SelectedOpportunity[] {
  const remaining = sortSelectedOpportunities(
    visibleRecommendations.filter(
      (opportunity) => opportunity.opportunityKey !== hero.opportunityKey
    )
    ).filter(
    (opportunity) =>
      opportunity.eligibleForBacklog &&
      (opportunity.finalSurface === "surface" || opportunity.finalSurface === "reserve")
  );

  const topPerServiceFamily = getTopCandidatesPerServiceFamily(remaining);
  const nonSearchFamilyLeaders = topPerServiceFamily.filter(
    (opportunity) => getPortfolioFamilyKey(opportunity) !== "search-visibility"
  );
  const searchFamilyLeaders = topPerServiceFamily.filter(
    (opportunity) => getPortfolioFamilyKey(opportunity) === "search-visibility"
  );

  const selected: SelectedOpportunity[] = [];
  const usedOpportunityKeys = new Set<string>();
  const usedServiceFamilies = new Set<string>([hero.familyKey]);
  const usedPortfolioFamilies = new Set<string>([getPortfolioFamilyKey(hero)]);

  for (const opportunity of nonSearchFamilyLeaders) {
    if (selected.length >= 5) break;
    if (usedServiceFamilies.has(opportunity.familyKey)) continue;

    pushUnique(selected, opportunity, usedOpportunityKeys);
    usedServiceFamilies.add(opportunity.familyKey);
    usedPortfolioFamilies.add(getPortfolioFamilyKey(opportunity));
  }

  if (
    selected.length < 5 &&
    !usedPortfolioFamilies.has("search-visibility") &&
    searchFamilyLeaders.length > 0
  ) {
    const firstSearchCandidate = searchFamilyLeaders.find(
      (opportunity) => !usedServiceFamilies.has(opportunity.familyKey)
    );

    if (firstSearchCandidate) {
      pushUnique(selected, firstSearchCandidate, usedOpportunityKeys);
      usedServiceFamilies.add(firstSearchCandidate.familyKey);
      usedPortfolioFamilies.add("search-visibility");
    }
  }

  for (const opportunity of remaining) {
    if (selected.length >= 5) break;
    if (usedOpportunityKeys.has(opportunity.opportunityKey)) continue;

    const portfolioFamilyKey = getPortfolioFamilyKey(opportunity);

    if (
      portfolioFamilyKey === "search-visibility" &&
      usedPortfolioFamilies.has("search-visibility")
    ) {
      continue;
    }

    if (!usedServiceFamilies.has(opportunity.familyKey)) {
      pushUnique(selected, opportunity, usedOpportunityKeys);
      usedServiceFamilies.add(opportunity.familyKey);
      usedPortfolioFamilies.add(portfolioFamilyKey);
    }
  }

  for (const opportunity of remaining) {
    if (selected.length >= 5) break;
    if (usedOpportunityKeys.has(opportunity.opportunityKey)) continue;

    const portfolioFamilyKey = getPortfolioFamilyKey(opportunity);

    if (
      portfolioFamilyKey === "search-visibility" &&
      usedPortfolioFamilies.has("search-visibility")
    ) {
      continue;
    }

    pushUnique(selected, opportunity, usedOpportunityKeys);
    usedPortfolioFamilies.add(portfolioFamilyKey);
  }

  if (selected.length < 5) {
    for (const opportunity of remaining) {
      if (selected.length >= 5) break;
      if (usedOpportunityKeys.has(opportunity.opportunityKey)) continue;

      pushUnique(selected, opportunity, usedOpportunityKeys);
    }
  }

  return selected.slice(0, 5);
}

function buildSurfaceTopSet(
  visibleRecommendations: SelectedOpportunity[]
): SelectedOpportunity[] {
  const orderedVisible = sortSelectedOpportunities(
    visibleRecommendations.filter(
      (opportunity) =>
        !opportunity.isDeprioritized &&
        (opportunity.finalSurface === "hero" || opportunity.finalSurface === "surface")
    )
  );

  const fallbackOrderedVisible =
    orderedVisible.length > 0
      ? orderedVisible
      : sortSelectedOpportunities(
          visibleRecommendations.filter(
            (opportunity) => opportunity.finalSurface !== "suppress"
          )
        );

  const selected: SelectedOpportunity[] = [];
  const usedOpportunityKeys = new Set<string>();
  const usedServiceFamilies = new Set<string>();
  const demandShapeCounts = new Map<string, number>();

  for (const opportunity of fallbackOrderedVisible) {
    if (selected.length >= 6) break;
    if (usedServiceFamilies.has(opportunity.familyKey)) continue;
    if (!canUseDemandShape({ candidate: opportunity, demandShapeCounts })) continue;

    pushUnique(selected, opportunity, usedOpportunityKeys);
    usedServiceFamilies.add(opportunity.familyKey);
    demandShapeCounts.set(
      opportunity.demandShape,
      (demandShapeCounts.get(opportunity.demandShape) ?? 0) + 1
    );
  }

  for (const opportunity of fallbackOrderedVisible) {
    if (selected.length >= 6) break;
    if (usedOpportunityKeys.has(opportunity.opportunityKey)) continue;
    if (!canUseDemandShape({ candidate: opportunity, demandShapeCounts })) continue;

    pushUnique(selected, opportunity, usedOpportunityKeys);
    demandShapeCounts.set(
      opportunity.demandShape,
      (demandShapeCounts.get(opportunity.demandShape) ?? 0) + 1
    );
  }

  for (const opportunity of fallbackOrderedVisible) {
    if (selected.length >= 6) break;
    if (usedOpportunityKeys.has(opportunity.opportunityKey)) continue;

    pushUnique(selected, opportunity, usedOpportunityKeys);
  }

  return sortSelectedOpportunities(selected).slice(0, 6);
}

export function selectRevenueOpportunities(params: {
  opportunities: RankedOpportunity[];
  campaigns: CampaignExecutionRecord[];
  availableJobsEstimate: number;
  competitors: Competitor[];
}): {
  topOpportunity: SelectedOpportunity;
  backlogOpportunities: SelectedOpportunity[];
  hero: RevenueOpportunityHero;
  rankedSelection: SelectedOpportunity[];
} {
  const { opportunities, campaigns, availableJobsEstimate, competitors } = params;

    const rankedSelection = sortSelectedOpportunities(
    opportunities.map((opportunity) => {
      const linkedCampaign = findLinkedCampaign(opportunity, campaigns);
      const completedIsStale = linkedCampaign
        ? isCompletedCampaignStale(linkedCampaign)
        : false;

      const { penalty, isInExecution, suppressionReason } = getPenaltyForStatus({
        status: linkedCampaign?.status ?? null,
        completedIsStale,
      });

      return {
        ...opportunity,
        linkedCampaignId: linkedCampaign?.id ?? null,
        linkedCampaignStatus: linkedCampaign?.status ?? null,
        isInExecution,
                adjustedScore: Math.max(
          1,
          Math.round(opportunity.finalRecommendationScore - penalty)
        ),
        suppressionReason,
      };
    })
  );

  const visibleRecommendations = buildVisibleRecommendationSet(rankedSelection);
  const surfaceTopSet = buildSurfaceTopSet(visibleRecommendations);

  const orderedSurfaceTopSet =
    surfaceTopSet.length > 0
      ? surfaceTopSet
      : sortSelectedOpportunities(visibleRecommendations).slice(0, 6);

  const topOpportunity = orderedSurfaceTopSet[0];
  const backlogOpportunities = orderedSurfaceTopSet.slice(1, 6);

  const hero = buildRevenueOpportunityHero({
    opportunity: topOpportunity,
    availableJobsEstimate,
    competitors,
  });

  return {
    topOpportunity,
    backlogOpportunities,
    hero,
    rankedSelection,
  };
}