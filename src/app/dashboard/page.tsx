import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { seedDemoLeads } from "@/lib/seed-demo-leads";
import { getRevenueCapturedSummary } from "@/lib/revenue-captured-summary";
import { getOrCreateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";
import { deriveWorkspaceReputationSignal } from "@/lib/reputation-signals";
import { getRecommendedActionBudget } from "@/lib/budget-allocation-recommendations";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  if (!workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  if (workspace.isDemo && !workspace.demoInitializedAt) {
    await seedDemoWorkspaceData(workspace.id);
    await seedDemoLeads(workspace.id);
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  const [snapshot, campaigns, revenueSummary, competitors] = await Promise.all([
  getOrCreateWorkspaceOpportunitySnapshot(workspace.id),
  prisma.campaign.findMany({
    where: {
      workspaceId: workspace.id,
    },
    include: {
      assets: {
        orderBy: { createdAt: "asc" },
      },
    },
  }),
  getRevenueCapturedSummary(workspace.id),
  prisma.competitor.findMany({
    where: {
      workspaceId: workspace.id,
    },
    orderBy: {
      createdAt: "asc",
    },
  }),
]);

  const visibleOpportunities = [
    snapshot.topOpportunity,
    ...snapshot.backlogOpportunities,
  ];

  const totalJobsLow = visibleOpportunities.reduce(
    (sum, item) => sum + item.jobsLow,
    0
  );

  const totalJobsHigh = visibleOpportunities.reduce(
    (sum, item) => sum + item.jobsHigh,
    0
  );

  const totalRevenueLow = visibleOpportunities.reduce(
    (sum, item) => sum + item.revenueLow,
    0
  );

  const totalRevenueHigh = visibleOpportunities.reduce(
    (sum, item) => sum + item.revenueHigh,
    0
  );

  const heroCampaign =
    snapshot.topOpportunity.linkedCampaignId
      ? campaigns.find(
          (campaign) => campaign.id === snapshot.topOpportunity.linkedCampaignId
        ) ?? null
      : null;

      const competitivePosition = deriveWorkspaceReputationSignal(
  profile,
  competitors
);
  const monthlyBudget = Number(profile.monthlyActionBudget ?? 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allocatedBudget = campaigns.reduce((sum, campaign) => {
    const updatedAt =
      campaign.updatedAt instanceof Date
        ? campaign.updatedAt
        : new Date(campaign.updatedAt);

    const countsAsCurrentMonthCompleted =
      campaign.status === "COMPLETED" && updatedAt >= monthStart;

    const countsTowardAllocation =
      campaign.status === "APPROVED" ||
      campaign.status === "SCHEDULED" ||
      campaign.status === "LAUNCHED" ||
      countsAsCurrentMonthCompleted;

    if (!countsTowardAllocation) {
      return sum;
    }

    const approvedAssetTypes = campaign.assets
      .filter((asset) => asset.isApproved)
      .map((asset) => asset.assetType);

    const fallbackAssetTypes = campaign.assets.map((asset) => asset.assetType);

    const actionBudget = getRecommendedActionBudget({
      assetTypes:
        approvedAssetTypes.length > 0 ? approvedAssetTypes : fallbackAssetTypes,
      revenueHigh: Number(campaign.estimatedRevenue ?? 0),
    });

    return sum + actionBudget;
  }, 0);

  const remainingBudget = Math.max(monthlyBudget - allocatedBudget, 0);

  return (
    <DashboardShell
      workspaceName={workspace.name}
      workspaceLogoUrl={profile.logoUrl}
      workspaceIndustryLabel={profile.industryLabel}
      hero={snapshot.hero}
      heroCampaign={
        heroCampaign
          ? {
              id: heroCampaign.id,
              name: heroCampaign.name,
              status: heroCampaign.status,
              targetService: heroCampaign.targetService,
              offer: heroCampaign.offer,
              audience: heroCampaign.audience,
              briefJson: heroCampaign.briefJson,
              assets: heroCampaign.assets.map((asset) => ({
                id: asset.id,
                assetType: asset.assetType,
                title: asset.title,
                content: asset.content,
              })),
            }
          : null
      }
      competitivePosition={{
  businessRating: competitivePosition.businessRating,
  businessReviewCount: competitivePosition.businessReviewCount,
  competitorMedianRating: competitivePosition.competitorMedianRating,
  competitorMedianReviewCount: competitivePosition.competitorMedianReviewCount,
  position: competitivePosition.position,
  narrative: competitivePosition.narrative,
}}
      metrics={{
        jobsAvailableLow: totalJobsLow,
        jobsAvailableHigh: totalJobsHigh,
        revenueOpportunityLow: totalRevenueLow,
        revenueOpportunityHigh: totalRevenueHigh,
        topActionRevenueLow: snapshot.hero.revenueLow,
        topActionRevenueHigh: snapshot.hero.revenueHigh,
        revenueCapturedYtd: revenueSummary.totalRevenue,
        attributedJobs: revenueSummary.bookedJobs,
        leadToJobRate: revenueSummary.winRate,
      }}
        budgetSummary={{
        monthlyBudget,
        allocatedBudget,
        remainingBudget,
      }}
      revenueCaptured={{
        totalRevenue: revenueSummary.totalRevenue,
        bookedJobs: revenueSummary.bookedJobs,
        campaignsLaunched: revenueSummary.campaignsLaunched,
        winRate: revenueSummary.winRate,
        entries: revenueSummary.entries,
      }}
    />
  );
}