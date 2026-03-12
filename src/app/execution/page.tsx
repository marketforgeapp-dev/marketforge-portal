import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/get-current-workspace";
import { prisma } from "@/lib/prisma";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ExecutionBoard } from "@/components/execution/execution-board";

export default async function ExecutionPage() {
  const workspace = await getCurrentWorkspace();

  if (!workspace || !workspace.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  const campaigns = await prisma.campaign.findMany({
    where: {
      workspaceId: workspace.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const readyCount = campaigns.filter((c) => c.status === "READY").length;
  const approvedCount = campaigns.filter((c) => c.status === "APPROVED").length;
  const queuedCount = campaigns.filter((c) => c.status === "SCHEDULED").length;
  const launchedCount = campaigns.filter((c) => c.status === "LAUNCHED").length;
  const completedCount = campaigns.filter((c) => c.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row">
        <DashboardSidebar />

        <main className="flex-1 space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              Managed Execution
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              Launch Queue
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Move campaigns from approval into MarketForge-managed launch,
              track launch ownership, and manage the execution workflow.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Draft Ready
              </p>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {readyCount}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Approved
              </p>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {approvedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Queued for Launch
              </p>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {queuedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Launched
              </p>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {launchedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Completed
              </p>
              <p className="mt-3 text-2xl font-bold text-gray-900">
                {completedCount}
              </p>
            </div>
          </section>

          <ExecutionBoard campaigns={campaigns} />
        </main>
      </div>
    </div>
  );
}