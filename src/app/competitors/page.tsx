import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { CompetitorsGrid } from "@/components/competitors/competitors-grid";
import { AlertsFeed } from "@/components/competitors/alerts-feed";

export default async function CompetitorsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);

  const competitors = await prisma.competitor.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "asc" },
  });

  const alerts = await prisma.intelligenceAlert.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Competitors
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Competitor Intelligence
            </h1>

            <p className="mt-2 text-gray-600">
              Monitor local competitors, detect activity changes, and identify
              opportunities to win more revenue.
            </p>
          </div>

          <CompetitorsGrid competitors={competitors} />

          <AlertsFeed alerts={alerts} />
        </main>
      </div>
    </div>
  );
}