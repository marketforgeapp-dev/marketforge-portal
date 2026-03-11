import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CampaignsGrid } from "@/components/campaigns/campaigns-grid";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { NlCampaignPanel } from "@/components/campaigns/nl-campaign-panel";

export default async function CampaignsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);

  const [campaigns, profile] = await Promise.all([
    prisma.campaign.findMany({
      where: { workspaceId: workspace.id },
      include: {
        assets: true,
        attributions: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.businessProfile.findUnique({
      where: { workspaceId: workspace.id },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Campaigns
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Campaign Builder
            </h1>

            <p className="mt-2 text-gray-600">
              Generate draft-ready campaigns tied to real revenue opportunities,
              review the creative direction, and move them through managed launch.
            </p>
          </div>

          <NlCampaignPanel />

          {campaigns.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-gray-600">No campaigns found.</p>
            </div>
          ) : (
            <CampaignsGrid
              campaigns={campaigns}
              businessLogoUrl={profile?.logoUrl ?? null}
              businessName={profile?.businessName ?? workspace.name}
            />
          )}
        </main>
      </div>
    </div>
  );
}