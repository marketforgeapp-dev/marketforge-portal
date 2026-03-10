import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { prisma } from "@/lib/prisma";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { seedDemoLeads } from "@/lib/seed-demo-leads";
import { buildRevenueOpportunityEngine } from "@/lib/revenue-opportunity-engine";

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  if (!workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);
  await seedDemoLeads(workspace.id);

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  const competitors = await prisma.competitor.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });

  const engine = buildRevenueOpportunityEngine({
    profile,
    competitors,
  });

  const hero = engine.hero;
  const opportunities = engine.rankedOpportunities;

  const recommendations = await prisma.recommendation.findMany({
    where: {
      workspaceId: workspace.id,
    },
    orderBy: {
      score: "desc",
    },
    take: 4,
  });

  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId: workspace.id,
    },
    select: {
      id: true,
      name: true,
      campaignType: true,
      recommendationId: true,
      status: true,
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

  const revenueYtd = attributions.reduce(
    (sum, item) => sum + Number(item.revenue ?? 0),
    0
  );

  const attributedJobs = attributions.reduce(
    (sum, item) => sum + (item.bookedJobs ?? 0),
    0
  );

  const attributedLeads = attributions.reduce(
    (sum, item) => sum + (item.leadsGenerated ?? 0),
    0
  );

  const winRate =
    attributedLeads > 0
      ? Math.round((attributedJobs / attributedLeads) * 100)
      : 0;

  const avgRoi =
    attributions.length > 0
      ? attributions.reduce((sum, item) => sum + (item.roi ?? 0), 0) /
        attributions.length
      : 0;

  const queuedForLaunch = campaigns.filter(
    (campaign) => campaign.status === "SCHEDULED"
  ).length;

  const recommendationCards = recommendations.map((recommendation) => {
    const linkedCampaign =
      campaigns.find(
        (campaign) => campaign.recommendationId === recommendation.id
      ) ??
      campaigns.find(
        (campaign) => campaign.campaignType === recommendation.campaignType
      ) ??
      null;

    return {
      id: recommendation.id,
      title: recommendation.title,
      description: recommendation.description,
      score: recommendation.score,
      estimatedRevenueMin: Number(recommendation.estimatedRevenueMin ?? 0),
      estimatedRevenueMax: Number(recommendation.estimatedRevenueMax ?? 0),
      estimatedBookedJobsMin: recommendation.estimatedBookedJobsMin,
      estimatedBookedJobsMax: recommendation.estimatedBookedJobsMax,
      linkedCampaignId: linkedCampaign?.id ?? null,
    };
  });

  return (
    <DashboardShell
      workspaceName={workspace.name}
      hero={hero}
      opportunities={opportunities}
      recommendations={recommendationCards}
      metrics={{
        revenueCapturedYtd: revenueYtd,
        roi: avgRoi,
        activeOpportunities: opportunities.length,
        queuedForLaunch,
        attributedJobs,
        leadToJobRate: winRate,
      }}
    />
  );
}