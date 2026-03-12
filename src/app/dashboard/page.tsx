import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { seedDemoLeads } from "@/lib/seed-demo-leads";
import { buildRevenueOpportunityEngine } from "@/lib/revenue-opportunity-engine";
import { getRevenueCapturedSummary } from "@/lib/revenue-captured-summary";
import { getCampaignPerformanceSignals } from "@/lib/campaign-performance-signals";

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

  const [competitors, performanceSignals] = await Promise.all([
    prisma.competitor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    }),
    getCampaignPerformanceSignals(workspace.id),
  ]);

  const engine = buildRevenueOpportunityEngine({
    profile,
    competitors,
    performanceSignals,
  });

  const hero = engine.hero;
  const opportunities = engine.rankedOpportunities;

  const totalJobsLow = opportunities.reduce((sum, item) => sum + item.jobsLow, 0);
  const totalJobsHigh = opportunities.reduce((sum, item) => sum + item.jobsHigh, 0);
  const totalRevenueLow = opportunities.reduce(
    (sum, item) => sum + item.revenueLow,
    0
  );
  const totalRevenueHigh = opportunities.reduce(
    (sum, item) => sum + item.revenueHigh,
    0
  );

  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId: workspace.id,
    },
    include: {
      assets: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const attributions = await prisma.attributionEntry.findMany({
    where: {
      workspaceId: workspace.id,
    },
    include: {
      campaign: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const avgRoi =
    attributions.length > 0
      ? attributions.reduce((sum, item) => sum + (item.roi ?? 0), 0) /
        attributions.length
      : 0;

  const queuedForLaunch = campaigns.filter(
    (campaign) => campaign.status === "SCHEDULED"
  ).length;

  const revenueSummary = await getRevenueCapturedSummary(workspace.id);

  const filteredRecommendationCards = opportunities
    .filter(
      (opportunity) =>
        opportunity.recommendedCampaignType !== hero.recommendedCampaignType ||
        opportunity.title !== hero.opportunityTitle
    )
    .slice(0, 4)
    .map((opportunity) => {
      const linkedCampaign =
        campaigns.find(
          (campaign) =>
            campaign.campaignType === opportunity.recommendedCampaignType
        ) ?? null;

      return {
        id: `${opportunity.opportunityType}-${opportunity.serviceName}`,
        title: opportunity.title,
        description: opportunity.whyThisMatters,
        score: opportunity.rawOpportunityScore / 10,
        estimatedRevenueMin: opportunity.revenueLow,
        estimatedRevenueMax: opportunity.revenueHigh,
        estimatedBookedJobsMin: opportunity.jobsLow,
        estimatedBookedJobsMax: opportunity.jobsHigh,
        linkedCampaignId: linkedCampaign?.id ?? null,
      };
    });

  const heroCampaign =
    campaigns.find(
      (campaign) => campaign.campaignType === hero.recommendedCampaignType
    ) ?? null;

  return (
    <DashboardShell
      workspaceName={workspace.name}
      workspaceLogoUrl={profile.logoUrl}
      hero={hero}
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
      recommendations={filteredRecommendationCards}
      metrics={{
        jobsAvailableLow: totalJobsLow,
        jobsAvailableHigh: totalJobsHigh,
        revenueOpportunityLow: totalRevenueLow,
        revenueOpportunityHigh: totalRevenueHigh,
        revenueCapturedYtd: revenueSummary.totalRevenue,
        roi: avgRoi,
        activeOpportunities: opportunities.length,
        queuedForLaunch,
        attributedJobs: revenueSummary.bookedJobs,
        leadToJobRate: revenueSummary.winRate,
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