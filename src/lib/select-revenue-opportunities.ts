import { CampaignStatus, CampaignType, OpportunityType } from "@/generated/prisma";
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

const HERO_DIRECT_RESPONSE_SCORE_WINDOW = 8;

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
      penalty: 24,
      isInExecution: true,
      suppressionReason:
        "This action is already active in execution and should not remain the top recommendation unless signals materially strengthen.",
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
    opportunity.recommendedCampaignType === "CUSTOM" ||
    opportunity.opportunityType === "SEASONAL_DEMAND" ||
    opportunity.opportunityType === "COMPETITOR_INACTIVE" ||
    opportunity.opportunityType === "HIGH_VALUE_SERVICE" ||
    opportunity.opportunityType === "LOCAL_SEARCH_SPIKE" ||
    opportunity.opportunityType === "CAPACITY_GAP"
  );
}

function chooseHeroOpportunity(
  rankedSelection: SelectedOpportunity[]
): SelectedOpportunity {
  const topOpportunity = rankedSelection[0];

  if (!topOpportunity) {
    throw new Error("No ranked opportunities available for hero selection.");
  }

  if (!isAeoOpportunity(topOpportunity)) {
    return topOpportunity;
  }

  const closestDirectResponse = rankedSelection.find((opportunity) => {
    if (!isDirectResponseOpportunity(opportunity)) {
      return false;
    }

    return (
      topOpportunity.adjustedScore - opportunity.adjustedScore <=
      HERO_DIRECT_RESPONSE_SCORE_WINDOW
    );
  });

  return closestDirectResponse ?? topOpportunity;
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

  const rankedSelection = opportunities
    .map((opportunity) => {
      const linkedCampaign = findLinkedCampaign(opportunity, campaigns);

      const { penalty, isInExecution, suppressionReason } = getPenaltyForStatus(
        linkedCampaign?.status ?? null
      );

      const adjustedScore = Math.max(
        1,
        Math.round(opportunity.rawOpportunityScore - penalty)
      );

      return {
        ...opportunity,
        linkedCampaignId: linkedCampaign?.id ?? null,
        linkedCampaignStatus: linkedCampaign?.status ?? null,
        isInExecution,
        adjustedScore,
        suppressionReason,
      };
    })
    .sort((a, b) => {
      if (b.adjustedScore !== a.adjustedScore) {
        return b.adjustedScore - a.adjustedScore;
      }

      if (b.confidenceScore !== a.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }

      return b.revenueHigh - a.revenueHigh;
    });

  const topOpportunity = chooseHeroOpportunity(rankedSelection);

  const backlogOpportunities = rankedSelection
    .filter(
      (opportunity) => opportunity.opportunityKey !== topOpportunity.opportunityKey
    )
    .filter((opportunity) => !opportunity.isInExecution)
    .filter((opportunity) => opportunity.eligibleForBacklog)
    .filter((opportunity) => opportunity.adjustedScore >= 62);

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