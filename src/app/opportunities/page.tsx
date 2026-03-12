import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { OpportunitiesGrid } from "@/components/opportunities/opportunities-grid";
import { buildRevenueOpportunityEngine } from "@/lib/revenue-opportunity-engine";
import { getCampaignPerformanceSignals } from "@/lib/campaign-performance-signals";

export default async function OpportunitiesPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  const [competitors, campaigns, performanceSignals] = await Promise.all([
    prisma.competitor.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        campaignType: true,
        status: true,
      },
    }),
    getCampaignPerformanceSignals(workspace.id),
  ]);

  const engine = buildRevenueOpportunityEngine({
    profile,
    competitors,
    performanceSignals,
  });

  const opportunities = engine.rankedOpportunities.map((opportunity) => {
    const linkedCampaign =
      campaigns.find(
        (campaign) =>
          campaign.campaignType === opportunity.recommendedCampaignType
      ) ?? null;

    return {
      ...opportunity,
      linkedCampaignId: linkedCampaign?.id ?? null,
    };
  });

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Other Revenue Opportunities
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Other Revenue Opportunities
            </h1>

            <p className="mt-2 text-gray-600">
              Explore additional local revenue opportunities beyond the primary
              Command Center recommendation and launch them when needed.
            </p>
          </div>

          <OpportunitiesGrid opportunities={opportunities} />
        </main>
      </div>
    </div>
  );
}