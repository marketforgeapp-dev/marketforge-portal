import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { OpportunitiesGrid } from "@/components/opportunities/opportunities-grid";
import { getOrCreateWorkspaceOpportunitySnapshot } from "@/lib/opportunity-snapshot";

export default async function OpportunitiesPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || workspace.status === "PENDING_ACTIVATION") {
    redirect("/onboarding");
  }

  if (workspace.status === "PAST_DUE" || workspace.status === "CANCELED") {
    redirect("/settings");
  }

  const profile = await prisma.businessProfile.findUnique({
    where: { workspaceId: workspace.id },
  });

  if (!profile) {
    redirect("/onboarding");
  }

  const snapshot = await getOrCreateWorkspaceOpportunitySnapshot(workspace.id);

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
                    <DashboardHeader
            workspaceName={profile.businessName ?? workspace.name}
            logoUrl={profile.logoUrl ?? null}
          />
          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              More Revenue Opportunities
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Ranked backlog beyond the top action
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              These are the next best revenue actions MarketForge is monitoring
              right now. The top Command Center action is intentionally excluded
              from this list.
            </p>
          </section>

          <OpportunitiesGrid
  opportunities={snapshot.backlogOpportunities}
  logoUrl={profile.logoUrl}
  industryLabel={profile.industryLabel}
/>
        </main>
      </div>
    </div>
  );
}