import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CompetitorsGrid } from "@/components/competitors/competitors-grid";
import { AlertsFeed } from "@/components/competitors/alerts-feed";

export default async function CompetitorsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const competitors = await prisma.competitor.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });

  const alerts = await prisma.intelligenceAlert.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mf-page-shell min-h-screen px-4 py-5 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 lg:flex-row">
        <DashboardSidebar />

        <main className="min-w-0 flex-1 space-y-5">
          <section className="mf-dark-panel mf-grid-glow rounded-3xl px-5 py-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#F5B942]">
              Competitors
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              Competitor intelligence
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
              Monitor local competitors, track activity changes, and identify
              moments where MarketForge can help you capture more revenue.
            </p>
          </section>

          <CompetitorsGrid competitors={competitors} />

          <AlertsFeed alerts={alerts} />
        </main>
      </div>
    </div>
  );
}