import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function toDecimal(value: number | null): Prisma.Decimal | null {
  if (value == null) return null;
  return new Prisma.Decimal(value.toFixed(2));
}

export async function ensureCampaignBaselineSnapshot(campaignId: string) {
  const existing = await prisma.campaignBaselineSnapshot.findUnique({
    where: { campaignId },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      workspaceId: true,
    },
  });

  if (!campaign) {
    return null;
  }

  const [profile, activeOpportunities] = await Promise.all([
    prisma.businessProfile.findUnique({
      where: { workspaceId: campaign.workspaceId },
      select: {
        aeoReadinessScore: true,
      },
    }),
    prisma.revenueOpportunity.findMany({
      where: {
        workspaceId: campaign.workspaceId,
        isActive: true,
      },
      orderBy: {
        priorityScore: "desc",
      },
      select: {
        id: true,
        title: true,
        opportunityType: true,
        whyNow: true,
        estimatedRevenueMin: true,
        estimatedRevenueMax: true,
        estimatedBookedJobsMin: true,
        estimatedBookedJobsMax: true,
        recommendedCampaignType: true,
        confidence: true,
      },
    }),
  ]);

  const estimatedWeeklyRevenueNumber = activeOpportunities.reduce((sum, item) => {
    return sum + Number(item.estimatedRevenueMin ?? 0);
  }, 0);

  const estimatedBookedJobs = activeOpportunities.reduce((sum, item) => {
    return sum + (item.estimatedBookedJobsMin ?? 0);
  }, 0);

  const opportunitySummary = activeOpportunities.slice(0, 5).map((item) => ({
    id: item.id,
    title: item.title,
    opportunityType: item.opportunityType,
    whyNow: item.whyNow,
    estimatedRevenueMin: item.estimatedRevenueMin
      ? Number(item.estimatedRevenueMin)
      : null,
    estimatedRevenueMax: item.estimatedRevenueMax
      ? Number(item.estimatedRevenueMax)
      : null,
    estimatedBookedJobsMin: item.estimatedBookedJobsMin,
    estimatedBookedJobsMax: item.estimatedBookedJobsMax,
    recommendedCampaignType: item.recommendedCampaignType,
    confidence: item.confidence,
  }));

  return prisma.campaignBaselineSnapshot.create({
    data: {
      workspaceId: campaign.workspaceId,
      campaignId: campaign.id,
      estimatedWeeklyRevenue: toDecimal(estimatedWeeklyRevenueNumber),
      estimatedBookedJobs,
      activeOpportunityCount: activeOpportunities.length,
      aeoReadinessScore: profile?.aeoReadinessScore ?? null,
      opportunitySummary,
    },
  });
}