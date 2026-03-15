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

function extractMatchedOpportunityKey(briefJson: unknown): string | null {
  if (!briefJson || typeof briefJson !== "object" || Array.isArray(briefJson)) {
    return null;
  }

  const maybeKey = (briefJson as Record<string, unknown>).matchedOpportunityKey;
  return typeof maybeKey === "string" && maybeKey.length > 0 ? maybeKey : null;
}

function getPenaltyForStatus(status: CampaignStatus | null): {
  penalty: number;
  isInExecution: boolean;
  suppressionReason: string | null;
} {
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
    return {
      penalty: 10,
      isInExecution: false,
      suppressionReason:
        "This action has already completed execution and is downweighted unless fresh signals justify resurfacing it.",
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
  const exactKeyMatch =
    campaigns.find(
      (campaign) =>
        extractMatchedOpportunityKey(campaign.briefJson) ===
        opportunity.opportunityKey
    ) ?? null;

  if (exactKeyMatch) {
    return exactKeyMatch;
  }

  const normalizedService = opportunity.serviceName.trim().toLowerCase();

  const fallbackMatch =
    campaigns.find((campaign) => {
      if (campaign.campaignType !== opportunity.recommendedCampaignType) {
        return false;
      }

      if (!campaign.targetService) {
        return false;
      }

      return campaign.targetService.trim().toLowerCase() === normalizedService;
    }) ?? null;

  return fallbackMatch;
}

function isAeoOpportunity(opportunity: SelectedOpportunity): boolean {
  return (
    opportunity.opportunityType === "AI_SEARCH_VISIBILITY" ||
    opportunity.recommendedCampaignType === "AEO_FAQ" ||
    opportunity.actionFraming === "AEO_CONTENT"
  );
}

function isDirectResponseOpportunity(opportunity: SelectedOpportunity): boolean {
  if (isAeoOpportunity(opportunity)) {
    return false;
  }

  return (
    opportunity.recommendedCampaignType === "DRAIN_SPECIAL" ||
    opportunity.recommendedCampaignType === "EMERGENCY_SERVICE" ||
    opportunity.recommendedCampaignType === "WATER_HEATER" ||
    opportunity.recommendedCampaignType === "MAINTENANCE_PUSH" ||
    opportunity.recommendedCampaignType === "CUSTOM"
  );
}

function sortSelectedOpportunities(
  opportunities: SelectedOpportunity[]
): SelectedOpportunity[] {
  return [...opportunities].sort((a, b) => {
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
    (opportunity) => !opportunity.isInExecution && !opportunity.isDeprioritized
  );

  if (visible.length > 0) {
    return visible;
  }

  const nonExecution = rankedSelection.filter(
    (opportunity) => !opportunity.isInExecution
  );

  if (nonExecution.length > 0) {
    return nonExecution;
  }

  return rankedSelection;
}

function chooseHeroOpportunity(
  visibleRecommendations: SelectedOpportunity[]
): SelectedOpportunity {
  const heroEligible = visibleRecommendations.filter(
    (opportunity) =>
      opportunity.eligibleForHero &&
      !opportunity.isDeprioritized &&
      !isAeoOpportunity(opportunity)
  );

  if (heroEligible.length > 0) {
    return heroEligible[0];
  }

  const directResponse = visibleRecommendations.filter(
    (opportunity) => isDirectResponseOpportunity(opportunity) && !opportunity.isDeprioritized
  );

  if (directResponse.length > 0) {
    return directResponse[0];
  }

  const firstVisible = visibleRecommendations[0];

  if (!firstVisible) {
    throw new Error("No ranked opportunities available for hero selection.");
  }

  return firstVisible;
}

function reorderVisibleRecommendations(params: {
  visibleRecommendations: SelectedOpportunity[];
  topOpportunity: SelectedOpportunity;
}): SelectedOpportunity[] {
  const { visibleRecommendations, topOpportunity } = params;

  const remaining = sortSelectedOpportunities(
    visibleRecommendations.filter(
      (opportunity) => opportunity.opportunityKey !== topOpportunity.opportunityKey
    )
  );

  return [topOpportunity, ...remaining];
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
      const { penalty, isInExecution, suppressionReason } = getPenaltyForStatus(
        linkedCampaign?.status ?? null
      );

      return {
        ...opportunity,
        linkedCampaignId: linkedCampaign?.id ?? null,
        linkedCampaignStatus: linkedCampaign?.status ?? null,
        isInExecution,
        adjustedScore: Math.max(1, Math.round(opportunity.rawOpportunityScore - penalty)),
        suppressionReason,
      };
    })
  );

  const visibleRecommendations = buildVisibleRecommendationSet(rankedSelection);
  const topOpportunity = chooseHeroOpportunity(visibleRecommendations);
  const orderedVisibleRecommendations = reorderVisibleRecommendations({
    visibleRecommendations,
    topOpportunity,
  });

  const primaryBacklog = orderedVisibleRecommendations
    .filter(
      (opportunity) => opportunity.opportunityKey !== topOpportunity.opportunityKey
    )
    .filter((opportunity) => opportunity.familyKey !== topOpportunity.familyKey)
    .filter((opportunity) => opportunity.eligibleForBacklog)
    .filter((opportunity) => !opportunity.isDeprioritized);

  const fallbackBacklog = orderedVisibleRecommendations
    .filter(
      (opportunity) => opportunity.opportunityKey !== topOpportunity.opportunityKey
    )
    .filter(
      (opportunity) =>
        !primaryBacklog.some(
          (primary) => primary.opportunityKey === opportunity.opportunityKey
        )
    )
    .filter((opportunity) => !opportunity.isDeprioritized);

  const backlogOpportunities = [...primaryBacklog, ...fallbackBacklog].slice(0, 5);

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