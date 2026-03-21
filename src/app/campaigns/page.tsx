import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { NlCampaignPanel } from "@/components/campaigns/nl-campaign-panel";
import { prisma } from "@/lib/prisma";

export default async function CampaignsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

    const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
    select: { logoUrl: true, businessName: true },
  });

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
                    <DashboardHeader
            workspaceName={profile?.businessName ?? workspace.name}
            logoUrl={profile?.logoUrl ?? null}
          />
          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              AI Action Prompt
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Generate a new revenue action
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Describe the business goal in plain English. MarketForge will
              evaluate the best next action from current revenue intelligence and
              generate a launch-ready action package.
            </p>
          </section>

          <NlCampaignPanel />
        </main>
      </div>
    </div>
  );
}