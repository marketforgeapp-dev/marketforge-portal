import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { RevenueSummary } from "@/components/reports/revenue-summary";
import { CampaignRoiTable } from "@/components/reports/campaign-roi-table";

export default async function ReportsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);

  const campaigns = await prisma.campaign.findMany({
    where: { workspaceId: workspace.id },
  });

  const entries = await prisma.attributionEntry.findMany({
    where: { workspaceId: workspace.id },
  });

  const rows = campaigns.map((campaign) => ({
    campaign,
    attribution: entries.find((e) => e.campaignId === campaign.id),
  }));

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Reports
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Attribution & Performance
            </h1>

            <p className="mt-2 text-gray-600">
              Track revenue performance and ROI from AI-generated marketing campaigns.
            </p>
          </div>

          <RevenueSummary entries={entries} />

          <CampaignRoiTable rows={rows} />
        </main>
      </div>
    </div>
  );
}