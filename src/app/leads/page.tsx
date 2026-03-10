import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { seedDemoWorkspaceData } from "@/lib/seed-demo-workspace-data";
import { seedDemoLeads } from "@/lib/seed-demo-leads";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { LeadsTable } from "@/components/leads/leads-table";

export default async function LeadsPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  await seedDemoWorkspaceData(workspace.id);
  await seedDemoLeads(workspace.id);

  const leads = await prisma.lead.findMany({
    where: { workspaceId: workspace.id },
    include: {
      campaign: true,
      revenueOpportunity: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const bookedCount = leads.filter((lead) => lead.status === "BOOKED").length;
  const newCount = leads.filter((lead) => lead.status === "NEW").length;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Leads
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Lead to Booked Job Workflow
            </h1>

            <p className="mt-2 text-gray-600">
              Track incoming leads from MarketForge campaigns and move them
              through the booking pipeline.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-600">Total Leads</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {leads.length}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-600">New Leads</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {newCount}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-600">Booked Jobs</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {bookedCount}
              </p>
            </div>
          </div>

          <LeadsTable leads={leads} />
        </main>
      </div>
    </div>
  );
}