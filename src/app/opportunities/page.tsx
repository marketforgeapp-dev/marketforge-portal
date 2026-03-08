import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { OpportunitiesGrid } from "@/components/opportunities/opportunities-grid";

export default async function OpportunitiesPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  // ensure demo data exists
  await seedDemoWorkspaceData(workspace.id);

  const opportunities = await prisma.revenueOpportunity.findMany({
    where: {
      workspaceId: workspace.id,
      isActive: true,
    },
    orderBy: {
      priorityScore: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Opportunities
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Revenue Opportunity Engine
            </h1>

            <p className="mt-2 text-gray-600">
              Prioritized local revenue opportunities based on demand signals,
              competitor activity, and business capacity.
            </p>
          </div>

          <OpportunitiesGrid opportunities={opportunities} />
        </main>
      </div>
    </div>
  );
}