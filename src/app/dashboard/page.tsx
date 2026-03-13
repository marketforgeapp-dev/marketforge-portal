import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { seedDemoLeads } from "@/lib/seed-demo-leads";
import { getRevenueCapturedSummary } from "@/lib/revenue-captured-summary";
import { getOrCreateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";

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

  const [snapshot, campaigns, revenueSummary] = await Promise.all([
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

  return (
    <DashboardShell
      workspaceName={workspace.name}
      workspaceLogoUrl={profile.logoUrl}
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